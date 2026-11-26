import "dotenv/config";
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { pool } from "./db.js";

const terminal = createInterface({ input: stdin, output: stdout });

async function askHidden(question) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    return terminal.question(question);
  }

  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";
    const onData = (chunk) => {
      const character = chunk.toString("utf8");

      if (character === "\u0003") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        reject(new Error("Operación cancelada."));
        return;
      }

      if (character === "\r" || character === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        stdout.write("\n");
        resolve(value);
        return;
      }

      if (character === "\u007f" || character === "\b") {
        value = value.slice(0, -1);
        return;
      }

      if (character >= " ") {
        value += character;
      }
    };

    stdin.on("data", onData);
  });
}

try {
  const name = (await terminal.question("Nombre del administrador: ")).trim();
  const email = (await terminal.question("Correo del administrador: ")).trim().toLowerCase();
  if (stdin.isTTY) terminal.close();
  const password = await askHidden("Contraseña (mínimo 12 caracteres): ");

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
    throw new Error("Ingresa un nombre, correo válido y una contraseña de al menos 12 caracteres.");
  }

  const confirmation = await askHidden("Confirma la contraseña: ");
  if (password !== confirmation) {
    throw new Error("Las contraseñas no coinciden.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.execute(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
    [name, email, passwordHash]
  );
  console.log("Administrador creado. Inicia sesión en /admin.");
} catch (error) {
  if (error.code === "ER_DUP_ENTRY") {
    console.error("Ese correo ya existe.");
  } else {
    console.error(error.message || "No se pudo crear el administrador.");
  }
  process.exitCode = 1;
} finally {
  terminal.close();
  await pool.end();
}
