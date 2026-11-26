import "dotenv/config";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import express from "express";
import multer from "multer";
import session from "express-session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pool, testDatabaseConnection } from "./db.js";
import MySQLSessionStore from "./session-store.js";

const app = express();
const port = Number(process.env.PORT || 3001);
const production = process.env.NODE_ENV === "production";
const rootDirectory = fileURLToPath(new URL("../", import.meta.url));
const uploadsDirectory = resolve(rootDirectory, "uploads");
const sessionSecret = process.env.SESSION_SECRET;
const allowedOrigins = new Set(
  [
    ...(production ? [] : ["http://localhost:5173", "http://127.0.0.1:5173"]),
    ...(process.env.APP_ORIGIN ? [process.env.APP_ORIGIN] : [])
  ].map((value) => new URL(value).origin)
);

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET debe tener al menos 32 caracteres y configurarse en .env.");
}

if (production) {
  app.set("trust proxy", 1);
}

const sessionStore = new MySQLSessionStore();

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb", type: "application/json" }));
app.use(
  session({
    name: "huellas.sid",
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: production,
      maxAge: 8 * 60 * 60 * 1000
    }
  })
);

app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin) {
    try {
      if (!allowedOrigins.has(new URL(origin).origin)) {
        return res.status(403).json({ error: "Origen no permitido." });
      }
    } catch {
      return res.status(403).json({ error: "Origen no permitido." });
    }
  }
  next();
});

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const requireJson = (req, res, next) => {
  if (!req.is("application/json")) {
    return res.status(415).json({ error: "Se requiere una solicitud JSON." });
  }
  next();
};

const requireCsrf = (req, res, next) => {
  const token = req.get("x-csrf-token");
  if (!req.session.csrfToken || token !== req.session.csrfToken) {
    return res.status(403).json({ error: "La sesión expiró. Vuelve a iniciar sesión." });
  }
  next();
};

const requireAdmin = asyncRoute(async (req, res, next) => {
  const sessionUser = req.session.user;
  if (!sessionUser) {
    return res.status(401).json({ error: "Inicia sesión como administrador." });
  }

  const [rows] = await pool.execute(
    "SELECT id, name, email, role, active FROM users WHERE id = ? LIMIT 1",
    [sessionUser.id]
  );
  const user = rows[0];

  if (!user || !user.active || user.role !== "admin") {
    req.session.destroy(() => {});
    return res.status(403).json({ error: "Se requiere una cuenta de administrador activa." });
  }

  req.user = user;
  next();
});

const requireStaff = asyncRoute(async (req, res, next) => {
  const sessionUser = req.session.user;
  if (!sessionUser) {
    return res.status(401).json({ error: "Inicia sesión para continuar." });
  }

  const [rows] = await pool.execute(
    "SELECT id, name, email, role, active FROM users WHERE id = ? LIMIT 1",
    [sessionUser.id]
  );
  const user = rows[0];
  if (!user || !user.active || !["admin", "entidad"].includes(user.role)) {
    return res.status(403).json({ error: "Se requiere una cuenta de entidad o administrador." });
  }

  req.user = user;
  next();
});

const requireAuth = asyncRoute(async (req, res, next) => {
  const sessionUser = req.session.user;
  if (!sessionUser) {
    return res.status(401).json({ error: "Inicia sesión para continuar." });
  }

  const [rows] = await pool.execute(
    "SELECT id, name, email, role, active FROM users WHERE id = ? LIMIT 1",
    [sessionUser.id]
  );
  const user = rows[0];

  if (!user || !user.active) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "La cuenta no está disponible. Inicia sesión de nuevo." });
  }

  req.user = user;
  next();
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Espera unos minutos y vuelve a intentar." }
});

const cleanText = (value, maxLength) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validPhotoUrl = (value) =>
  !value || (typeof value === "string" && value.length <= 2048 &&
    (/^https:\/\//i.test(value) || /^\/[a-z0-9/_-]+(?:\.[a-z0-9]+)?$/i.test(value)));
const makeCsrfToken = () => randomBytes(32).toString("hex");

const uploadPhoto = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, callback) => {
      try {
        await mkdir(uploadsDirectory, { recursive: true });
        callback(null, uploadsDirectory);
      } catch (error) {
        callback(error);
      }
    },
    filename: (_req, file, callback) => {
      const extension = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif"
      }[file.mimetype];
      callback(null, `${randomBytes(16).toString("hex")}${extension}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) {
      const error = new Error("La foto debe ser JPG, PNG, WebP o GIF.");
      error.status = 400;
      return callback(error);
    }
    callback(null, true);
  }
});

app.post(
  "/api/auth/register",
  requireJson,
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false
  }),
  asyncRoute(async (req, res) => {
    const name = cleanText(req.body.name, 120);
    const email = cleanText(req.body.email, 190).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!name || !validEmail(email) || password.length < 12 || password.length > 200) {
      return res.status(400).json({ error: "Completa tus datos y usa una contraseña de al menos 12 caracteres." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'usuario')",
      [name, email, passwordHash]
    );
    await new Promise((resolveRegenerate, rejectRegenerate) => {
      req.session.regenerate((error) => error ? rejectRegenerate(error) : resolveRegenerate());
    });
    req.session.user = { id: result.insertId };
    req.session.csrfToken = makeCsrfToken();

    res.status(201).json({
      user: { id: result.insertId, name, email, role: "usuario" },
      csrfToken: req.session.csrfToken
    });
  })
);

app.post(
  "/api/auth/login",
  requireJson,
  loginLimiter,
  asyncRoute(async (req, res) => {
    const email = cleanText(req.body.email, 190).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!validEmail(email) || !password) {
      return res.status(400).json({ error: "Ingresa un correo y contraseña válidos." });
    }

    const [rows] = await pool.execute(
      "SELECT id, name, email, password_hash, role, active FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    const user = rows[0];
    const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!user || !passwordMatches || !user.active) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos." });
    }

    await new Promise((resolveRegenerate, rejectRegenerate) => {
      req.session.regenerate((error) => error ? rejectRegenerate(error) : resolveRegenerate());
    });
    req.session.user = { id: user.id };
    req.session.csrfToken = makeCsrfToken();

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      csrfToken: req.session.csrfToken
    });
  })
);

app.get(
  "/api/auth/me",
  asyncRoute(async (req, res) => {
    if (!req.session.user) {
      return res.json({ user: null });
    }

    const [rows] = await pool.execute(
      "SELECT id, name, email, role, active FROM users WHERE id = ? LIMIT 1",
      [req.session.user.id]
    );
    const user = rows[0];

    if (!user || !user.active) {
      req.session.destroy(() => {});
      return res.json({ user: null });
    }

    if (!req.session.csrfToken) {
      req.session.csrfToken = makeCsrfToken();
    }

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      csrfToken: req.session.csrfToken
    });
  })
);

app.patch(
  "/api/auth/profile",
  requireJson,
  requireAuth,
  requireCsrf,
  asyncRoute(async (req, res) => {
    const name = cleanText(req.body.name, 120);
    const email = cleanText(req.body.email, 190).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!name || !validEmail(email) || (password && password.length < 12)) {
      return res.status(400).json({ error: "Revisa tu nombre, correo y contraseña (mínimo 12 caracteres)." });
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      await pool.execute(
        "UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?",
        [name, email, passwordHash, req.user.id]
      );
    } else {
      await pool.execute("UPDATE users SET name = ?, email = ? WHERE id = ?", [name, email, req.user.id]);
    }

    req.session.user = { id: req.user.id };
    res.json({
      user: { id: req.user.id, name, email, role: req.user.role },
      csrfToken: req.session.csrfToken
    });
  })
);

app.post(
  "/api/auth/logout",
  requireJson,
  requireAuth,
  requireCsrf,
  (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie("huellas.sid", { httpOnly: true, sameSite: "lax", secure: production });
      res.status(204).end();
    });
  }
);

app.get(
  "/api/admin/summary",
  requireAdmin,
  asyncRoute(async (_req, res) => {
    const [rows] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM pets) AS pets,
        (SELECT COUNT(*) FROM reports) AS reports,
        (SELECT COUNT(*) FROM users WHERE role <> 'admin') AS users,
        (SELECT COUNT(*) FROM donations) AS donations,
        (SELECT COUNT(*) FROM messages WHERE status = 'new') AS new_messages,
        (SELECT COALESCE(SUM(amount), 0) FROM donations
          WHERE donation_type = 'money' AND status IN ('confirmed', 'received')) AS confirmed_donations
    `);
    res.json(rows[0]);
  })
);

app.get(
  "/api/admin/users",
  requireAdmin,
  asyncRoute(async (_req, res) => {
    const [rows] = await pool.query(
      "SELECT id, name, email, role, active, created_at FROM users ORDER BY created_at DESC LIMIT 500"
    );
    res.json(rows);
  })
);

app.post(
  "/api/admin/users",
  requireJson,
  requireAdmin,
  requireCsrf,
  asyncRoute(async (req, res) => {
    const name = cleanText(req.body.name, 120);
    const email = cleanText(req.body.email, 190).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const role = req.body.role;
    if (!name || !validEmail(email) || password.length < 12 ||
        !["entidad", "usuario"].includes(role)) {
      return res.status(400).json({ error: "Ingresa nombre, correo, rol válido y contraseña de al menos 12 caracteres." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, email, passwordHash, role]
    );
    res.status(201).json({ id: result.insertId });
  })
);

app.patch(
  "/api/admin/users/:id",
  requireJson,
  requireAdmin,
  requireCsrf,
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const role = req.body.role;
    const active = req.body.active;

    if (!Number.isSafeInteger(id) || id < 1 ||
        !["admin", "entidad", "usuario"].includes(role) ||
        typeof active !== "boolean") {
      return res.status(400).json({ error: "Datos de usuario inválidos." });
    }

    if (id === Number(req.user.id) && (role !== "admin" || !active)) {
      return res.status(400).json({ error: "No puedes quitarte el acceso de administrador." });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute(
        "SELECT id, role, active FROM users WHERE id = ? FOR UPDATE",
        [id]
      );
      if (!rows.length) {
        await connection.rollback();
        return res.status(404).json({ error: "No se encontró el usuario." });
      }

      const target = rows[0];
      if (target.role === "admin" && target.active && (role !== "admin" || !active)) {
        const [admins] = await connection.query(
          "SELECT id FROM users WHERE role = 'admin' AND active = 1 FOR UPDATE"
        );
        if (admins.length <= 1) {
          await connection.rollback();
          return res.status(400).json({ error: "Debe quedar al menos un administrador activo." });
        }
      }

      await connection.execute(
        "UPDATE users SET role = ?, active = ? WHERE id = ?",
        [role, active ? 1 : 0, id]
      );
      await connection.commit();
      res.json({ success: true });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  })
);

const petFields = (body) => {
  const pet = {
    name: cleanText(body.name, 120),
    species: body.species,
    breed: cleanText(body.breed, 120),
    age: cleanText(body.age, 80),
    description: cleanText(body.description, 5000),
    photo_url: cleanText(body.photo_url, 2048),
    status: body.status || "available"
  };
  if (!pet.name || !["perro", "gato", "otro"].includes(pet.species) ||
      !pet.description || !["available", "adopted"].includes(pet.status) ||
      !validPhotoUrl(pet.photo_url)) {
    return null;
  }
  return pet;
};

app.get(
  "/api/pets",
  asyncRoute(async (_req, res) => {
    const [rows] = await pool.query(
      `SELECT id, name AS nombre, species, breed AS raza, age AS edad,
        description AS descripcion, photo_url AS foto, status
       FROM pets WHERE status = 'available' ORDER BY created_at DESC`
    );
    res.json(rows);
  })
);

app.get(
  "/api/admin/pets",
  requireAdmin,
  asyncRoute(async (_req, res) => {
    const [rows] = await pool.query(
      "SELECT id, name, species, breed, age, description, photo_url, status, created_at FROM pets ORDER BY created_at DESC LIMIT 500"
    );
    res.json(rows);
  })
);

app.post(
  "/api/pets",
  requireStaff,
  requireCsrf,
  uploadPhoto.single("photo"),
  asyncRoute(async (req, res) => {
    const pet = petFields({
      ...req.body,
      photo_url: req.file ? `/uploads/${req.file.filename}` : req.body.photo_url
    });
    if (!pet) return res.status(400).json({ error: "Revisa los datos de la mascota." });

    const [result] = await pool.execute(
      "INSERT INTO pets (name, species, breed, age, description, photo_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [pet.name, pet.species, pet.breed, pet.age, pet.description, pet.photo_url, pet.status]
    );
    res.status(201).json({ id: result.insertId });
  })
);

app.post(
  "/api/admin/pets",
  requireAdmin,
  requireCsrf,
  uploadPhoto.single("photo"),
  asyncRoute(async (req, res) => {
    const pet = petFields({
      ...req.body,
      photo_url: req.file ? `/uploads/${req.file.filename}` : req.body.photo_url
    });
    if (!pet) return res.status(400).json({ error: "Revisa los datos de la mascota." });

    const [result] = await pool.execute(
      "INSERT INTO pets (name, species, breed, age, description, photo_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [pet.name, pet.species, pet.breed, pet.age, pet.description, pet.photo_url, pet.status]
    );
    res.status(201).json({ id: result.insertId });
  })
);

app.put(
  "/api/admin/pets/:id",
  requireAdmin,
  requireCsrf,
  uploadPhoto.single("photo"),
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const pet = petFields({
      ...req.body,
      photo_url: req.file ? `/uploads/${req.file.filename}` : req.body.photo_url
    });
    if (!Number.isSafeInteger(id) || id < 1 || !pet) {
      return res.status(400).json({ error: "Datos de la mascota inválidos." });
    }

    const [result] = await pool.execute(
      "UPDATE pets SET name = ?, species = ?, breed = ?, age = ?, description = ?, photo_url = ?, status = ? WHERE id = ?",
      [pet.name, pet.species, pet.breed, pet.age, pet.description, pet.photo_url, pet.status, id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "No se encontró la mascota." });
    res.json({ success: true });
  })
);

app.delete(
  "/api/admin/pets/:id",
  requireAdmin,
  requireCsrf,
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ error: "Identificador inválido." });
    }
    const [result] = await pool.execute("DELETE FROM pets WHERE id = ?", [id]);
    if (!result.affectedRows) return res.status(404).json({ error: "No se encontró la mascota." });
    res.status(204).end();
  })
);

app.get(
  "/api/reports",
  asyncRoute(async (_req, res) => {
    const [rows] = await pool.query(`
      SELECT id, species AS tipo, status AS estado, description AS descripcion,
        photo_url AS foto, CAST(latitude AS DOUBLE) AS lat,
        CAST(longitude AS DOUBLE) AS lng,
        UNIX_TIMESTAMP(created_at) * 1000 AS fecha, author_name AS autor
      FROM reports ORDER BY created_at DESC LIMIT 500
    `);
    res.json(rows);
  })
);

app.post(
  "/api/reports",
  requireJson,
  requireAuth,
  requireCsrf,
  asyncRoute(async (req, res) => {
    const species = req.body.tipo;
    const status = req.body.estado;
    const description = cleanText(req.body.descripcion, 5000);
    const photoUrl = cleanText(req.body.foto, 2048);
    const latitude = Number(req.body.lat);
    const longitude = Number(req.body.lng);

    if (!["perro", "gato", "otro"].includes(species) ||
        !["visto", "herido"].includes(status) || description.length < 5 ||
        !validPhotoUrl(photoUrl) || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: "Revisa la información y ubicación del reporte." });
    }

    const [result] = await pool.execute(
      `INSERT INTO reports
        (species, status, description, photo_url, latitude, longitude, author_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [species, status, description, photoUrl, latitude, longitude, req.user.name]
    );
    res.status(201).json({ id: result.insertId });
  })
);

app.patch(
  "/api/reports/:id",
  requireJson,
  requireStaff,
  requireCsrf,
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!Number.isSafeInteger(id) || id < 1 ||
        !["visto", "herido", "rescate", "rescatado"].includes(status)) {
      return res.status(400).json({ error: "Estado de reporte inválido." });
    }
    const [result] = await pool.execute("UPDATE reports SET status = ? WHERE id = ?", [status, id]);
    if (!result.affectedRows) return res.status(404).json({ error: "No se encontró el reporte." });
    res.json({ success: true });
  })
);

app.delete(
  "/api/reports/:id",
  requireStaff,
  requireCsrf,
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ error: "Identificador inválido." });
    }
    const [result] = await pool.execute("DELETE FROM reports WHERE id = ?", [id]);
    if (!result.affectedRows) return res.status(404).json({ error: "No se encontró el reporte." });
    res.status(204).end();
  })
);

app.get(
  "/api/admin/reports",
  requireAdmin,
  asyncRoute(async (_req, res) => {
    const [rows] = await pool.query(
      "SELECT id, species, status, description, photo_url, latitude, longitude, author_name, created_at FROM reports ORDER BY created_at DESC LIMIT 500"
    );
    res.json(rows);
  })
);

app.patch(
  "/api/admin/reports/:id",
  requireJson,
  requireAdmin,
  requireCsrf,
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!Number.isSafeInteger(id) || id < 1 ||
        !["visto", "herido", "rescate", "rescatado"].includes(status)) {
      return res.status(400).json({ error: "Estado de reporte inválido." });
    }
    const [result] = await pool.execute("UPDATE reports SET status = ? WHERE id = ?", [status, id]);
    if (!result.affectedRows) return res.status(404).json({ error: "No se encontró el reporte." });
    res.json({ success: true });
  })
);

app.delete(
  "/api/admin/reports/:id",
  requireAdmin,
  requireCsrf,
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ error: "Identificador inválido." });
    }
    const [result] = await pool.execute("DELETE FROM reports WHERE id = ?", [id]);
    if (!result.affectedRows) return res.status(404).json({ error: "No se encontró el reporte." });
    res.status(204).end();
  })
);

app.get(
  "/api/admin/donations",
  requireAdmin,
  asyncRoute(async (_req, res) => {
    const [rows] = await pool.query(
      "SELECT id, donor_name, donor_email, donation_type, amount, items, phone, city, address, status, created_at FROM donations ORDER BY created_at DESC LIMIT 500"
    );
    res.json(rows);
  })
);

app.patch(
  "/api/admin/donations/:id",
  requireJson,
  requireAdmin,
  requireCsrf,
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!Number.isSafeInteger(id) || id < 1 ||
        !["pending", "confirmed", "received", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Estado de donación inválido." });
    }
    const [result] = await pool.execute("UPDATE donations SET status = ? WHERE id = ?", [status, id]);
    if (!result.affectedRows) return res.status(404).json({ error: "No se encontró la donación." });
    res.json({ success: true });
  })
);

app.get(
  "/api/admin/messages",
  requireAdmin,
  asyncRoute(async (_req, res) => {
    const [rows] = await pool.query(
      "SELECT id, name, email, message, status, created_at FROM messages ORDER BY created_at DESC LIMIT 500"
    );
    res.json(rows);
  })
);

app.patch(
  "/api/admin/messages/:id",
  requireJson,
  requireAdmin,
  requireCsrf,
  asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!Number.isSafeInteger(id) || id < 1 || !["new", "read", "resolved"].includes(status)) {
      return res.status(400).json({ error: "Estado de mensaje inválido." });
    }
    const [result] = await pool.execute("UPDATE messages SET status = ? WHERE id = ?", [status, id]);
    if (!result.affectedRows) return res.status(404).json({ error: "No se encontró el mensaje." });
    res.json({ success: true });
  })
);

app.post(
  "/api/messages",
  requireJson,
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false
  }),
  asyncRoute(async (req, res) => {
    const name = cleanText(req.body.name, 120);
    const email = cleanText(req.body.email, 190).toLowerCase();
    const message = cleanText(req.body.message, 5000);
    if (!name || !validEmail(email) || message.length < 5) {
      return res.status(400).json({ error: "Completa tu nombre, correo y mensaje." });
    }

    await pool.execute(
      "INSERT INTO messages (name, email, message) VALUES (?, ?, ?)",
      [name, email, message]
    );
    res.status(201).json({ success: true });
  })
);

app.post(
  "/api/donations",
  requireJson,
  requireAuth,
  requireCsrf,
  asyncRoute(async (req, res) => {
    const donationType = req.body.type;
    const phone = cleanText(req.body.phone, 40);
    const city = cleanText(req.body.city, 120);
    const address = cleanText(req.body.address, 255);
    let amount = null;
    let items = null;

    if (donationType === "money") {
      amount = Number(req.body.amount);
      if (!Number.isFinite(amount) || amount < 1000 || amount > 100000000) {
        return res.status(400).json({ error: "El monto debe estar entre $1.000 y $100.000.000." });
      }
    } else if (donationType === "in_kind") {
      if (!Array.isArray(req.body.items) || req.body.items.length < 1 ||
          req.body.items.length > 20 || !city || !address || !phone) {
        return res.status(400).json({ error: "Completa los artículos y los datos de recolección." });
      }
      items = JSON.stringify(req.body.items.map((item) => cleanText(item, 100)).filter(Boolean));
      if (items === "[]") return res.status(400).json({ error: "Selecciona artículos válidos." });
    } else {
      return res.status(400).json({ error: "Tipo de donación inválido." });
    }

    await pool.execute(
      `INSERT INTO donations
        (user_id, donor_name, donor_email, donation_type, amount, items, phone, city, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, req.user.name, req.user.email, donationType, amount, items, phone, city, address]
    );
    res.status(201).json({ success: true });
  })
);

app.use("/uploads", express.static(uploadsDirectory, { fallthrough: false, index: false }));

if (production) {
  const distDirectory = resolve(rootDirectory, "dist");
  app.use(express.static(distDirectory));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve(distDirectory, "index.html")));
}

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({ error: "No se pudo procesar la foto. Usa una imagen de hasta 5 MB." });
  }
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ error: "Ese registro ya existe." });
  }
  console.error(error);
  res.status(500).json({ error: "Ocurrió un error interno. Intenta de nuevo." });
});

await testDatabaseConnection();
await MySQLSessionStore.initialize();
app.listen(port, () => {
  console.log(`API de Huellas Callejeras disponible en http://localhost:${port}`);
});

process.on("SIGTERM", async () => {
  sessionStore.close();
  await pool.end();
  process.exit(0);
});
