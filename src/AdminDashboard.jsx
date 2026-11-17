import { useCallback, useEffect, useState } from "react";
import "./styles/admin.css";

const sections = [
  { id: "overview", label: "Resumen", icon: "▦" },
  { id: "pets", label: "Mascotas", icon: "🐾" },
  { id: "reports", label: "Reportes", icon: "📍" },
  { id: "users", label: "Usuarios", icon: "👥" },
  { id: "donations", label: "Donaciones", icon: "💚" },
  { id: "messages", label: "Mensajes", icon: "✉" }
];

const sectionTitles = {
  overview: "Resumen general",
  pets: "Mascotas y adopciones",
  reports: "Reportes de animales",
  users: "Usuarios y entidades",
  donations: "Donaciones",
  messages: "Mensajes de contacto"
};

const emptyPet = {
  name: "",
  species: "perro",
  breed: "",
  age: "",
  description: "",
  photo_url: "",
  status: "available"
};

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    throw new Error("No se pudo leer la respuesta del servidor. Verifica que la API y MySQL estén iniciados.");
  }
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "—";
}

function StatusSelect({ value, options, onChange, label }) {
  return (
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>{optionLabel}</option>
      ))}
    </select>
  );
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [section, setSection] = useState("overview");
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [login, setLogin] = useState({ email: "", password: "" });
  const [pet, setPet] = useState(emptyPet);
  const [editingPet, setEditingPet] = useState(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "entidad" });

  const request = useCallback(async (path, options = {}) => {
    const headers = { ...(options.headers || {}) };
    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    if (options.method && options.method !== "GET" && csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }

    const response = await fetch(path, {
      ...options,
      headers,
      credentials: "same-origin"
    });
    const data = response.status === 204 ? null : await readJson(response);
    if (!response.ok) {
      if (response.status === 401) setUser(null);
      throw new Error(data?.error || "No se pudo completar la solicitud.");
    }
    return data;
  }, [csrfToken]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      const summaryPromise = request("/api/admin/summary");
      const sectionPaths = {
        pets: "/api/admin/pets",
        reports: "/api/admin/reports",
        users: "/api/admin/users",
        donations: "/api/admin/donations",
        messages: "/api/admin/messages"
      };
      const recordsPromise = sectionPaths[section]
        ? request(sectionPaths[section])
        : Promise.resolve([]);
      const [nextSummary, nextRecords] = await Promise.all([summaryPromise, recordsPromise]);
      setSummary(nextSummary);
      setRecords(nextRecords);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [request, section, user]);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then(async (response) => {
        const data = await readJson(response);
        if (!response.ok) {
          throw new Error(data?.error || "No se pudo verificar la sesión.");
        }
        return data;
      })
      .then((data) => {
        if (!active) return;
        if (data.user?.role === "admin") {
          setUser(data.user);
          setCsrfToken(data.csrfToken || "");
        } else {
          setLoading(false);
        }
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message);
        setLoading(false);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function submitLogin(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(login)
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || "No se pudo iniciar sesión.");
      if (data.user.role !== "admin") {
        setCsrfToken(data.csrfToken);
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": data.csrfToken },
          credentials: "same-origin",
          body: "{}"
        });
        throw new Error("Esta cuenta no tiene acceso al panel de administración.");
      }

      setCsrfToken(data.csrfToken);
      setUser(data.user);
      setLogin({ email: "", password: "" });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    setSaving(true);
    setError("");
    try {
      await request("/api/auth/logout", { method: "POST", body: "{}" });
      setUser(null);
      setCsrfToken("");
      setSummary(null);
      setRecords([]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function mutate(path, options, successMessage) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await request(path, options);
      setNotice(successMessage);
      await refresh();
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function savePet(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const body = new FormData();
    Object.entries(pet).forEach(([key, value]) => body.append(key, value));
    const photo = formElement.elements.photo.files[0];
    if (photo) body.append("photo", photo);
    const editingId = editingPet;
    const saved = await mutate(
      editingId ? `/api/admin/pets/${editingId}` : "/api/admin/pets",
      {
        method: editingId ? "PUT" : "POST",
        body
      },
      editingId ? "Mascota actualizada." : "Mascota agregada."
    );
    if (saved) {
      setPet(emptyPet);
      setEditingPet(null);
      formElement.reset();
    }
  }

  function editPet(record) {
    setPet({
      name: record.name,
      species: record.species,
      breed: record.breed || "",
      age: record.age || "",
      description: record.description,
      photo_url: record.photo_url || "",
      status: record.status
    });
    setEditingPet(record.id);
  }

  async function createUser(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const saved = await mutate(
      "/api/admin/users",
      { method: "POST", body: JSON.stringify(newUser) },
      "Cuenta creada."
    );
    if (saved) {
      setNewUser({ name: "", email: "", password: "", role: "entidad" });
      formElement.reset();
    }
  }

  function updateRecord(path, value, successMessage) {
    return mutate(path, { method: "PATCH", body: JSON.stringify(value) }, successMessage);
  }

  function deleteRecord(path, label) {
    if (!window.confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return;
    return mutate(path, { method: "DELETE" }, `${label} eliminado.`);
  }

  if (!user) {
    return (
      <main className="admin-login-page">
        <form className="admin-login-card" onSubmit={submitLogin}>
          <a className="admin-brand" href="/">Huellas <span>🐾</span> Callejeras</a>
          <p className="admin-eyebrow">ÁREA SEGURA</p>
          <h1>Panel de administración</h1>
          <p>Inicia sesión con una cuenta de administrador.</p>
          {error && <div className="admin-alert error" role="alert">{error}</div>}
          <label>
            Correo electrónico
            <input
              type="email"
              autoComplete="username"
              value={login.email}
              onChange={(event) => setLogin({ ...login, email: event.target.value })}
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              value={login.password}
              onChange={(event) => setLogin({ ...login, password: event.target.value })}
              required
            />
          </label>
          <button className="admin-primary-button" disabled={saving}>
            {saving ? "Verificando…" : "Ingresar al panel"}
          </button>
          <a className="admin-back-link" href="/">← Volver al sitio</a>
        </form>
      </main>
    );
  }

  const summaryCards = [
    ["Mascotas publicadas", summary?.pets ?? "—", "🐾"],
    ["Reportes recibidos", summary?.reports ?? "—", "📍"],
    ["Usuarios registrados", summary?.users ?? "—", "👥"],
    ["Donaciones registradas", summary?.donations ?? "—", "💚"],
    ["Mensajes nuevos", summary?.new_messages ?? "—", "✉"],
    ["Aportes confirmados", `$${Number(summary?.confirmed_donations || 0).toLocaleString("es-CO")}`, "💰"]
  ];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/">Huellas <span>🐾</span><br />Callejeras</a>
        <p className="admin-nav-caption">ADMINISTRACIÓN</p>
        <nav aria-label="Secciones de administración">
          {sections.map((item) => (
            <button
              className={section === item.id ? "active" : ""}
              key={item.id}
              onClick={() => { setSection(item.id); setNotice(""); }}
            >
              <span aria-hidden="true">{item.icon}</span>{item.label}
              {item.id === "messages" && Number(summary?.new_messages) > 0 &&
                <b className="admin-nav-badge">{summary.new_messages}</b>}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <span className="admin-avatar">{user.name?.slice(0, 1).toUpperCase()}</span>
          <div><strong>{user.name}</strong><small>Administrador</small></div>
          <button className="admin-logout" onClick={logout} disabled={saving} aria-label="Cerrar sesión">↪</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-eyebrow">HUELLAS CALLEJERAS</p>
            <h1>{sectionTitles[section]}</h1>
          </div>
          <a className="admin-site-link" href="/">Ver sitio ↗</a>
        </header>

        {error && <div className="admin-alert error" role="alert">{error}</div>}
        {notice && <div className="admin-alert success" role="status">{notice}</div>}

        {section === "overview" && (
          <section className="admin-stat-grid" aria-label="Estadísticas">
            {summaryCards.map(([label, value, icon]) => (
              <article className="admin-stat-card" key={label}>
                <span aria-hidden="true">{icon}</span>
                <p>{label}</p>
                <strong>{value}</strong>
              </article>
            ))}
            <article className="admin-welcome-card">
              <div><span className="admin-eyebrow">BIENVENIDO, {user.name?.toUpperCase()}</span>
                <h2>Todo el cuidado, en un solo lugar.</h2>
                <p>Administra las publicaciones, reportes y aportes de la comunidad.</p>
              </div>
              <span aria-hidden="true">🐕</span>
            </article>
          </section>
        )}

        {section === "pets" && (
          <section className="admin-content-grid">
            <form className="admin-form-card" onSubmit={savePet}>
              <div className="admin-card-heading">
                <div><p className="admin-eyebrow">{editingPet ? "ACTUALIZACIÓN" : "NUEVA PUBLICACIÓN"}</p>
                  <h2>{editingPet ? "Editar mascota" : "Agregar mascota"}</h2></div>
              </div>
              <label>Nombre<input value={pet.name} onChange={(event) => setPet({ ...pet, name: event.target.value })} maxLength="120" required /></label>
              <div className="admin-form-row">
                <label>Especie<StatusSelect value={pet.species} onChange={(value) => setPet({ ...pet, species: value })} options={[["perro", "Perro"], ["gato", "Gato"], ["otro", "Otro"]]} /></label>
                <label>Estado<StatusSelect value={pet.status} onChange={(value) => setPet({ ...pet, status: value })} options={[["available", "En adopción"], ["adopted", "Adoptado"]]}/></label>
              </div>
              <div className="admin-form-row">
                <label>Raza<input value={pet.breed} onChange={(event) => setPet({ ...pet, breed: event.target.value })} maxLength="120" /></label>
                <label>Edad<input value={pet.age} onChange={(event) => setPet({ ...pet, age: event.target.value })} maxLength="80" /></label>
              </div>
              <label>Descripción<textarea value={pet.description} onChange={(event) => setPet({ ...pet, description: event.target.value })} maxLength="5000" rows="4" required /></label>
              <label>Foto (URL o archivo)
                <input name="photo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
                <input value={pet.photo_url} onChange={(event) => setPet({ ...pet, photo_url: event.target.value })} placeholder="https://…" maxLength="2048" />
              </label>
              <div className="admin-form-actions">
                <button className="admin-primary-button" disabled={saving}>{editingPet ? "Guardar cambios" : "Publicar mascota"}</button>
                {editingPet && <button type="button" className="admin-secondary-button" onClick={() => { setPet(emptyPet); setEditingPet(null); }}>Cancelar</button>}
              </div>
            </form>
            <section className="admin-table-card">
              <div className="admin-card-heading"><div><p className="admin-eyebrow">ADOPCIONES</p><h2>Publicaciones</h2></div><span>{records.length} en total</span></div>
              {loading ? <p className="admin-empty">Cargando mascotas…</p> : records.length === 0 ? <p className="admin-empty">Todavía no hay mascotas publicadas.</p> :
                <div className="admin-record-list">{records.map((record) => (
                  <article className="admin-record" key={record.id}>
                    {record.photo_url ? <img src={record.photo_url} alt="" /> : <span className="admin-record-icon">🐾</span>}
                    <div className="admin-record-main"><strong>{record.name}</strong><small>{record.species} · {record.breed || "Raza sin especificar"} · {record.status === "adopted" ? "Adoptado" : "En adopción"}</small></div>
                    <button className="admin-text-button" onClick={() => editPet(record)}>Editar</button>
                    <button className="admin-danger-button" onClick={() => deleteRecord(`/api/admin/pets/${record.id}`, record.name)}>Eliminar</button>
                  </article>
                ))}</div>}
            </section>
          </section>
        )}

        {section === "reports" && (
          <section className="admin-table-card">
            <div className="admin-card-heading"><div><p className="admin-eyebrow">SEGUIMIENTO</p><h2>Reportes de la comunidad</h2></div><span>{records.length} reportes</span></div>
            {loading ? <p className="admin-empty">Cargando reportes…</p> : records.length === 0 ? <p className="admin-empty">No hay reportes todavía.</p> :
              <div className="admin-table-scroll"><table><thead><tr><th>Animal</th><th>Descripción</th><th>Reportado por</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
                <tbody>{records.map((record) => <tr key={record.id}>
                  <td>{record.species}</td><td className="admin-description">{record.description}</td><td>{record.author_name}</td><td>{formatDate(record.created_at)}</td>
                  <td><StatusSelect label={`Estado del reporte ${record.id}`} value={record.status} onChange={(value) => updateRecord(`/api/admin/reports/${record.id}`, { status: value }, "Estado actualizado.")} options={[["visto", "Visto"], ["herido", "Herido"], ["rescate", "En rescate"], ["rescatado", "Rescatado"]]}/></td>
                  <td><button className="admin-danger-button" onClick={() => deleteRecord(`/api/admin/reports/${record.id}`, "el reporte")}>Eliminar</button></td>
                </tr>)}</tbody></table></div>}
          </section>
        )}

        {section === "users" && (
          <section className="admin-content-grid">
            <form className="admin-form-card" onSubmit={createUser}>
              <div className="admin-card-heading"><div><p className="admin-eyebrow">ACCESO</p><h2>Crear cuenta</h2></div></div>
              <p className="admin-form-help">Las cuentas nuevas no pueden obtener permisos de administrador.</p>
              <label>Nombre<input value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} maxLength="120" required /></label>
              <label>Correo electrónico<input type="email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} maxLength="190" required /></label>
              <label>Contraseña temporal<input type="password" value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} minLength="12" autoComplete="new-password" required /></label>
              <label>Rol<StatusSelect value={newUser.role} onChange={(value) => setNewUser({ ...newUser, role: value })} options={[["entidad", "Entidad"], ["usuario", "Usuario"]]}/></label>
              <button className="admin-primary-button" disabled={saving}>Crear cuenta</button>
            </form>
            <section className="admin-table-card">
              <div className="admin-card-heading"><div><p className="admin-eyebrow">COMUNIDAD</p><h2>Cuentas</h2></div><span>{records.length} usuarios</span></div>
              {loading ? <p className="admin-empty">Cargando usuarios…</p> : <div className="admin-table-scroll"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Acceso</th></tr></thead>
                <tbody>{records.map((record) => <tr key={record.id}>
                  <td>{record.name}{Number(record.id) === Number(user.id) && <small className="admin-you"> (tú)</small>}</td><td>{record.email}</td>
                  <td><StatusSelect label={`Rol de ${record.name}`} value={record.role} onChange={(value) => updateRecord(`/api/admin/users/${record.id}`, { role: value, active: Boolean(record.active) }, "Rol actualizado.")} options={[["admin", "Administrador"], ["entidad", "Entidad"], ["usuario", "Usuario"]]}/></td>
                  <td><StatusSelect label={`Acceso de ${record.name}`} value={record.active ? "active" : "inactive"} onChange={(value) => updateRecord(`/api/admin/users/${record.id}`, { role: record.role, active: value === "active" }, "Acceso actualizado.")} options={[["active", "Activo"], ["inactive", "Suspendido"]]}/></td>
                </tr>)}</tbody></table></div>}
            </section>
          </section>
        )}

        {section === "donations" && (
          <section className="admin-table-card">
            <div className="admin-card-heading"><div><p className="admin-eyebrow">APOYO A LA FUNDACIÓN</p><h2>Donaciones recibidas</h2></div><span>{records.length} donaciones</span></div>
            {loading ? <p className="admin-empty">Cargando donaciones…</p> : records.length === 0 ? <p className="admin-empty">Todavía no hay donaciones registradas.</p> :
              <div className="admin-table-scroll"><table><thead><tr><th>Donante</th><th>Tipo / aporte</th><th>Contacto</th><th>Fecha</th><th>Estado</th></tr></thead>
                <tbody>{records.map((record) => <tr key={record.id}>
                  <td>{record.donor_name}<small className="admin-cell-subtitle">{record.donor_email}</small></td>
                  <td>{record.donation_type === "money" ? `$${Number(record.amount).toLocaleString("es-CO")}` : (() => { try { return JSON.parse(record.items || "[]").join(", "); } catch { return record.items || "En especie"; } })()}</td>
                  <td>{[record.phone, record.city, record.address].filter(Boolean).join(" · ") || "—"}</td><td>{formatDate(record.created_at)}</td>
                  <td><StatusSelect label={`Estado de donación ${record.id}`} value={record.status} onChange={(value) => updateRecord(`/api/admin/donations/${record.id}`, { status: value }, "Estado actualizado.")} options={[["pending", "Pendiente"], ["confirmed", "Confirmada"], ["received", "Recibida"], ["rejected", "Rechazada"]]}/></td>
                </tr>)}</tbody></table></div>}
          </section>
        )}

        {section === "messages" && (
          <section className="admin-table-card">
            <div className="admin-card-heading"><div><p className="admin-eyebrow">CONTACTO</p><h2>Mensajes recibidos</h2></div><span>{records.length} mensajes</span></div>
            {loading ? <p className="admin-empty">Cargando mensajes…</p> : records.length === 0 ? <p className="admin-empty">No hay mensajes todavía.</p> :
              <div className="admin-message-list">{records.map((record) => <article className="admin-message" key={record.id}>
                <div><strong>{record.name}</strong><a href={`mailto:${encodeURIComponent(record.email)}`}>{record.email}</a><small>{formatDate(record.created_at)}</small></div>
                <p>{record.message}</p>
                <StatusSelect label={`Estado del mensaje de ${record.name}`} value={record.status} onChange={(value) => updateRecord(`/api/admin/messages/${record.id}`, { status: value }, "Estado del mensaje actualizado.")} options={[["new", "Nuevo"], ["read", "Leído"], ["resolved", "Resuelto"]]}/>
              </article>)}</div>}
          </section>
        )}

        {loading && section === "overview" && <p className="admin-loading-note">Actualizando datos…</p>}
        <footer className="admin-footer">Huellas Callejeras · Panel administrativo</footer>
      </main>
    </div>
  );
}
