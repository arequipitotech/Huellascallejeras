//==============================
// MODO OSCURO
//==============================

const darkToggle = document.getElementById("darkToggle");

if (darkToggle) {
    darkToggle.addEventListener("click", () => {
        const actual = document.documentElement.getAttribute("data-theme");
        const nuevo = actual === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", nuevo);
        localStorage.setItem("theme", nuevo);
    });
}

//==============================
// HEADER CON SCROLL
//==============================

const siteHeader = document.getElementById("siteHeader");

if (siteHeader) {
    window.addEventListener("scroll", () => {
        siteHeader.classList.toggle("scrolled", window.scrollY > 10);
    });
}

//==============================
// MENÚ RESPONSIVE
//==============================

const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");

if (menuBtn) {
    menuBtn.addEventListener("click", () => {
        const abierto = nav.classList.toggle("active");
        menuBtn.setAttribute("aria-expanded", abierto ? "true" : "false");
    });
}

//==============================
// BOTÓN NUESTRA HISTORIA
//==============================

const historiaBtn = document.getElementById("historiaBtn");

if (historiaBtn) {

    historiaBtn.addEventListener("click", () => {

        document.querySelector("#historia").scrollIntoView({

            behavior: "smooth"

        });

    });

}

//==============================
// BOTÓN DONACIÓN (SECCIÓN AZUL)
//==============================

const donarBtn = document.getElementById("donarBtn");

if (donarBtn) {

    donarBtn.addEventListener("click", () => {

        window.location.href = "donaciones/donaciones.html#donar";

    });

}

//==============================
// BOTÓN DONA DEL MENÚ
//==============================

const botonDonar = document.querySelector(".donar");

if (botonDonar) {

    botonDonar.addEventListener("click", (e) => {

        e.preventDefault();

        window.location.href = "donaciones/donaciones.html#donar";

    });

}

//==============================
// AUTENTICACIÓN Y BASE DE DATOS LOCAL
//==============================

const authModal = document.getElementById("authModal");
const authActions = document.getElementById("authActions");
const closeAuthModal = document.getElementById("closeAuthModal");
const profileModal = document.getElementById("profileModal");
const closeProfileModal = document.getElementById("closeProfileModal");
const adoptionsSection = document.getElementById("adopciones");
const showAdopcionesBtn = document.getElementById("showAdopcionesBtn");
const navAdopcionesBtn = document.getElementById("navAdopcionesBtn");
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const registerMessage = document.getElementById("registerMessage");
const loginMessage = document.getElementById("loginMessage");
const DB_KEY = "huellas_usuarios";
const SESSION_KEY = "huellas_usuario";
const DB_PATH = "./db/usuarios.json";
const PETS_KEY = "huellas_mascotas";
const USUARIOS_INICIALES = [
    { nombre: "Admin Demo", email: "admin@huellas.com", password: "admin123", rol: "admin" },
    { nombre: "Entidad Demo", email: "entidad@huellas.com", password: "entidad123", rol: "entidad" },
    { nombre: "Usuario Demo", email: "usuario@huellas.com", password: "usuario123", rol: "usuario" }
];

const mascotasIniciales = [];

function abrirModal(tipo = "register") {

    authModal.classList.add("active");
    authModal.setAttribute("aria-hidden", "false");

    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.form === tipo);
    });

    document.querySelectorAll(".auth-form").forEach((form) => {
        form.classList.toggle("active-form", form.id === (tipo === "login" ? "loginForm" : "registerForm"));
    });

}

function cerrarModal() {

    authModal.classList.remove("active");
    authModal.setAttribute("aria-hidden", "true");

}

async function cargarUsuarios() {

    const guardados = localStorage.getItem(DB_KEY);

    if (guardados) {
        return JSON.parse(guardados);
    }

    try {

        const respuesta = await fetch(DB_PATH);

        if (respuesta.ok) {
            const usuarios = await respuesta.json();
            if (usuarios && usuarios.length) {
                localStorage.setItem(DB_KEY, JSON.stringify(usuarios));
                return usuarios;
            }
        }

    } catch (error) {
        console.warn("No se pudo cargar la base local", error);
    }

    localStorage.setItem(DB_KEY, JSON.stringify(USUARIOS_INICIALES));
    return USUARIOS_INICIALES;

}

async function guardarUsuarios(usuarios) {

    localStorage.setItem(DB_KEY, JSON.stringify(usuarios));

    try {
        await fetch(DB_PATH, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(usuarios)
        });
    } catch (error) {
        console.warn("No se pudo sincronizar el archivo JSON", error);
    }

}

function cargarMascotas() {

    const guardadas = localStorage.getItem(PETS_KEY);

    if (guardadas) {
        return JSON.parse(guardadas);
    }

    localStorage.setItem(PETS_KEY, JSON.stringify(mascotasIniciales));
    return mascotasIniciales;

}

function guardarMascotas(mascotas) {
    localStorage.setItem(PETS_KEY, JSON.stringify(mascotas));
}

function renderMascotas() {

    const contenedor = document.getElementById("petsList");
    const petSectionTitle = document.getElementById("petSectionTitle");
    const petSectionText = document.getElementById("petSectionText");
    const petForm = document.getElementById("petForm");

    if (!contenedor) {
        return;
    }

    const usuario = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    const esAdmin = usuario?.rol === "admin";
    const esEntidad = usuario?.rol === "entidad";

    if (petSectionTitle && petSectionText) {
        if (!usuario) {
            petSectionTitle.textContent = "Publicar mascota";
            petSectionText.textContent = "Inicia sesión para agregar una mascota disponible para adopción.";
            petForm?.classList.remove("visible");
        } else if (esAdmin || esEntidad) {
            petSectionTitle.textContent = "Publicar mascota";
            petSectionText.textContent = "Puedes publicar nuevas mascotas para adopción desde aquí.";
            petForm?.classList.add("visible");
        } else {
            petSectionTitle.textContent = "Solicitar adopción";
            petSectionText.textContent = "Como usuario puedes explorar las mascotas disponibles y contactar con la entidad responsable.";
            petForm?.classList.remove("visible");
        }
    }

    const mascotas = cargarMascotas();

    if (!mascotas.length) {
        contenedor.innerHTML = '<div class="pet-empty">Aún no hay mascotas publicadas.</div>';
        return;
    }

    contenedor.innerHTML = mascotas.map((mascota) => `
        <article class="pet-card">
            <img src="${mascota.foto || "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80"}" alt="${mascota.nombre}">
            <div>
                <h3>${mascota.nombre}</h3>
                <p><strong>Raza:</strong> ${mascota.raza}</p>
                <p><strong>Edad:</strong> ${mascota.edad}</p>
                <p>${mascota.descripcion}</p>
            </div>
        </article>
    `).join("");

}

function mostrarPerfil(abrir = true) {

    if (!profileModal) {
        return;
    }

    const usuario = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");

    if (!usuario) {
        profileModal.classList.remove("active");
        profileModal.setAttribute("aria-hidden", "true");
        return;
    }

    if (abrir) {
        profileModal.classList.add("active");
        profileModal.setAttribute("aria-hidden", "false");
    } else {
        profileModal.classList.remove("active");
        profileModal.setAttribute("aria-hidden", "true");
    }

}

function mostrarAdopciones(abrir = true) {

    if (!adoptionsSection) {
        return;
    }

    if (abrir) {
        renderMascotas();
        adoptionsSection.classList.remove("hidden");
        adoptionsSection.scrollIntoView({ behavior: "smooth", block: "start" });
        activarPestanaAdopciones("mascotas");
    } else {
        adoptionsSection.classList.add("hidden");
    }

}

function activarPestanaAdopciones(tab) {
    document.querySelectorAll(".adopciones-tab-btn").forEach((boton) => {
        boton.classList.toggle("active", boton.dataset.tab === tab);
    });

    document.querySelectorAll(".adopciones-tab-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.id === `${tab}Tab`);
    });
}

function renderProfile() {

    const contenedor = document.getElementById("profileInfo");
    const form = document.getElementById("editProfileForm");

    if (!contenedor || !form) {
        return;
    }

    const usuario = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    const campos = form.querySelectorAll("input, button");

    if (!usuario) {
        contenedor.innerHTML = '<div class="profile-empty">Inicia sesión para ver y editar tu perfil.</div>';
        campos.forEach((campo) => campo.disabled = true);
        form.reset();
        mostrarPerfil(false);
        return;
    }

    const rolTexto = usuario.rol === "admin" ? "Administrador" : usuario.rol === "entidad" ? "Entidad" : "Usuario";

    contenedor.innerHTML = `
        <div class="profile-summary">
            <h3>${usuario.nombre}</h3>
            <p>${usuario.email}</p>
            <p><strong>Rol:</strong> ${rolTexto}</p>
            <span>Tu información está lista para actualizarse cuando lo necesites.</span>
        </div>
    `;

    campos.forEach((campo) => campo.disabled = false);
    form.querySelector("input[name='nombre']").value = usuario.nombre;
    form.querySelector("input[name='email']").value = usuario.email;
    form.querySelector("input[name='password']").value = "";
    mostrarPerfil(false);

}

function actualizarFormReporte() {

    const reportForm = document.getElementById("reportForm");
    const reportHint = document.getElementById("reportHint");

    if (!reportForm || !reportHint) {
        return;
    }

    const usuario = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    const campos = reportForm.querySelectorAll("select, textarea, input, button");

    if (!usuario) {
        reportHint.textContent = "Inicia sesión para reportar un animal.";
        campos.forEach((campo) => campo.disabled = true);
        reportForm.reset();
        return;
    }

    reportHint.textContent = "Tu reporte ayudará a ubicar al animal y avisar a la comunidad.";
    campos.forEach((campo) => campo.disabled = false);

}

window.actualizarFormReporte = actualizarFormReporte;

function renderAuthActions() {

    const usuario = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");

    if (usuario) {

        const inicial = usuario.nombre.charAt(0).toUpperCase();
        const rolTexto = usuario.rol === "admin" ? "Admin" : usuario.rol === "entidad" ? "Entidad" : "Usuario";

        authActions.innerHTML = `
            <span class="user-name">Hola, ${usuario.nombre} (${rolTexto})</span>
            <button class="profile-trigger" id="profileTrigger" aria-label="Abrir perfil" title="Abrir perfil">${inicial}</button>
            <button class="auth-btn small secondary" id="logoutBtn">Cerrar sesión</button>
        `;

        document.getElementById("profileTrigger").addEventListener("click", () => {
            mostrarPerfil(true);
        });

        document.getElementById("logoutBtn").addEventListener("click", () => {
            sessionStorage.removeItem(SESSION_KEY);
            renderAuthActions();
            renderProfile();
            renderMascotas();
        });

    } else {

        authActions.innerHTML = `
            <button class="auth-btn" data-modal="register">Registrarse</button>
            <button class="auth-btn secondary" data-modal="login">Iniciar sesión</button>
        `;

    }

    renderProfile();
    renderMascotas();
    window.actualizarFormReporte();

}

if (authActions) {

    authActions.addEventListener("click", (event) => {
        const boton = event.target.closest("button[data-modal]");

        if (boton) {
            abrirModal(boton.dataset.modal);
        }
    });

}

if (closeAuthModal) {
    closeAuthModal.addEventListener("click", cerrarModal);
}

if (closeProfileModal) {
    closeProfileModal.addEventListener("click", () => mostrarPerfil(false));
}

if (profileModal) {
    profileModal.addEventListener("click", (event) => {
        if (event.target === profileModal) {
            mostrarPerfil(false);
        }
    });
}

if (authModal) {
    authModal.addEventListener("click", (event) => {
        if (event.target === authModal) {
            cerrarModal();
        }
    });
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        cerrarModal();
    }
});

document.querySelectorAll(".tab-btn").forEach((boton) => {
    boton.addEventListener("click", () => {
        abrirModal(boton.dataset.form);
    });
});

if (showAdopcionesBtn) {
    showAdopcionesBtn.addEventListener("click", () => {
        mostrarAdopciones(true);
    });
}

if (navAdopcionesBtn) {
    navAdopcionesBtn.addEventListener("click", () => {
        mostrarAdopciones(true);
    });
}

document.querySelectorAll('a[href="#adopciones"]').forEach((enlace) => {
    enlace.addEventListener("click", (event) => {
        event.preventDefault();
        mostrarAdopciones(true);
    });
});

const closeAdoptions = document.getElementById("closeAdoptions");
if (closeAdoptions) {
    closeAdoptions.addEventListener("click", () => {
        mostrarAdopciones(false);
    });
}

document.querySelectorAll(".adopciones-tab-btn").forEach((boton) => {
    boton.addEventListener("click", () => {
        activarPestanaAdopciones(boton.dataset.tab);
    });
});

if (registerForm) {

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nombre = registerForm.querySelector("input[name='nombre']").value.trim();
        const email = registerForm.querySelector("input[name='email']").value.trim();
        const password = registerForm.querySelector("input[name='password']").value;
        const rol = registerForm.querySelector("select[name='rol']").value;

        if (!nombre || !email || !password) {
            registerMessage.textContent = "Completa todos los campos.";
            return;
        }

        const usuarios = await cargarUsuarios();

        if (usuarios.some((usuario) => usuario.email.toLowerCase() === email.toLowerCase())) {
            registerMessage.textContent = "Ese correo ya está registrado.";
            return;
        }

        usuarios.push({ nombre, email, password, rol });
        await guardarUsuarios(usuarios);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ nombre, email, rol }));
        registerForm.reset();
        registerMessage.textContent = "✅ Cuenta creada correctamente.";
        renderAuthActions();
        cerrarModal();
    });

}

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = loginForm.querySelector("input[name='email']").value.trim();
        const password = loginForm.querySelector("input[name='password']").value;
        const rol = loginForm.querySelector("select[name='rol']").value;

        const usuarios = await cargarUsuarios();
        const usuario = usuarios.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password && item.rol === rol);

        if (!usuario) {
            loginMessage.textContent = "Correo, contraseña o rol incorrectos.";
            return;
        }

        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }));
        loginForm.reset();
        loginMessage.textContent = "✅ Sesión iniciada.";
        renderAuthActions();
        cerrarModal();
    });

}

const petForm = document.getElementById("petForm");
const petMessage = document.getElementById("petMessage");

if (petForm) {

    petForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const usuario = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");

        if (!usuario) {
            petMessage.textContent = "Inicia sesión para publicar una mascota.";
            return;
        }

        if (usuario.rol !== "admin" && usuario.rol !== "entidad") {
            petMessage.textContent = "Solo administradores o entidades pueden publicar mascotas.";
            return;
        }

        const nombre = petForm.querySelector("input[name='nombre']").value.trim();
        const raza = petForm.querySelector("input[name='raza']").value.trim();
        const edad = petForm.querySelector("input[name='edad']").value.trim();
        const descripcion = petForm.querySelector("textarea[name='descripcion']").value.trim();
        const foto = petForm.querySelector("input[name='foto']").value.trim();

        if (!nombre || !raza || !edad || !descripcion) {
            petMessage.textContent = "Completa los datos de la mascota.";
            return;
        }

        const mascotas = cargarMascotas();

        mascotas.unshift({
            id: Date.now(),
            nombre,
            raza,
            edad,
            descripcion,
            foto: foto || "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80"
        });

        guardarMascotas(mascotas);
        petForm.reset();
        petMessage.textContent = "✅ Mascota publicada correctamente.";
        renderMascotas();
    });

}

const editProfileForm = document.getElementById("editProfileForm");
const profileMessage = document.getElementById("profileMessage");

if (editProfileForm) {

    editProfileForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const usuario = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");

        if (!usuario) {
            profileMessage.textContent = "Inicia sesión para editar tu perfil.";
            return;
        }

        const nombre = editProfileForm.querySelector("input[name='nombre']").value.trim();
        const email = editProfileForm.querySelector("input[name='email']").value.trim();
        const password = editProfileForm.querySelector("input[name='password']").value;

        if (!nombre || !email) {
            profileMessage.textContent = "Tu nombre y correo son obligatorios.";
            return;
        }

        const usuarios = await cargarUsuarios();
        const usuarioActual = usuarios.find((item) => item.email.toLowerCase() === usuario.email.toLowerCase());

        if (!usuarioActual) {
            profileMessage.textContent = "No se encontró tu cuenta.";
            return;
        }

        const correoDuplicado = usuarios.some((item) => item.email.toLowerCase() === email.toLowerCase() && item.email.toLowerCase() !== usuario.email.toLowerCase());

        if (correoDuplicado) {
            profileMessage.textContent = "Ese correo ya está en uso.";
            return;
        }

        usuarioActual.nombre = nombre;
        usuarioActual.email = email;

        if (password) {
            usuarioActual.password = password;
        }

        await guardarUsuarios(usuarios);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ nombre, email, rol: usuarioActual.rol }));
        profileMessage.textContent = "✅ Perfil actualizado correctamente.";
        renderAuthActions();
        renderProfile();
    });

}

renderAuthActions();

//==============================
// FORMULARIO SUSCRIPCIÓN
//==============================

const formulario = document.getElementById("formulario");

if (formulario) {

    formulario.addEventListener("submit", (e) => {

        e.preventDefault();

        const correo = formulario.querySelector("input").value;

        if (correo === "") {

            alert("Ingresa un correo electrónico.");

            return;

        }

        alert("✅ Gracias por suscribirte.\n\nMuy pronto recibirás noticias sobre nuestros rescates.");

        formulario.reset();

    });

}

//==============================
// ANIMACIÓN AL HACER SCROLL
//==============================

const elementos = document.querySelectorAll(

".cards article, .timeline-card, .stat"

);

const observer = new IntersectionObserver((entries) => {

    entries.forEach((entry) => {

        if (entry.isIntersecting) {

            entry.target.style.opacity = "1";

            entry.target.style.transform = "translateY(0px)";

        }

    });

}, {

    threshold: .2

});

elementos.forEach((elemento) => {

    elemento.style.opacity = "0";

    elemento.style.transform = "translateY(60px)";

    elemento.style.transition = ".8s";

    observer.observe(elemento);

});

//==============================
// EFECTO CONTADOR
//==============================

const numeros = document.querySelectorAll(".stat h2");

const animarNumero = (numero) => {

    const objetivo = parseInt(numero.innerText);

    let contador = 0;

    const incremento = objetivo / 80;

    const actualizar = () => {

        contador += incremento;

        if (contador < objetivo) {

            numero.innerText = Math.floor(contador) + "+";

            requestAnimationFrame(actualizar);

        } else {

            numero.innerText = objetivo + "+";

        }

    };

    actualizar();

};

const observerNumero = new IntersectionObserver((entries) => {

    entries.forEach((entry) => {

        if (entry.isIntersecting) {

            animarNumero(entry.target);

            observerNumero.unobserve(entry.target);

        }

    });

});

numeros.forEach((numero) => {

    observerNumero.observe(numero);

});

//==============================
// BOTÓN VOLVER ARRIBA
//==============================

const volver = document.createElement("button");

volver.innerHTML = "⬆";

volver.id = "volverArriba";

document.body.appendChild(volver);

volver.style.position = "fixed";
volver.style.bottom = "30px";
volver.style.right = "30px";
volver.style.width = "55px";
volver.style.height = "55px";
volver.style.borderRadius = "50%";
volver.style.border = "none";
volver.style.background = "#db2777";
volver.style.color = "white";
volver.style.fontSize = "22px";
volver.style.cursor = "pointer";
volver.style.display = "none";
volver.style.boxShadow = "0 10px 20px rgba(0,0,0,.3)";
volver.style.zIndex = "999";

window.addEventListener("scroll", () => {

    if (window.scrollY > 400) {

        volver.style.display = "block";

    } else {

        volver.style.display = "none";

    }

});

volver.addEventListener("click", () => {

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

});

//==============================
// SLIDER ANTES Y DESPUÉS
//==============================

const baTrack = document.getElementById("baTrack");
const baDots = document.getElementById("baDots");

if (baTrack && baDots) {

    const slides = baTrack.querySelectorAll(".ba-slide");
    let baIndex = 0;

    slides.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.className = "ba-dot" + (i === 0 ? " active" : "");
        dot.setAttribute("aria-label", `Historia ${i + 1}`);
        dot.addEventListener("click", () => {
            baIndex = i;
            actualizarBa();
        });
        baDots.appendChild(dot);
    });

    const dots = baDots.querySelectorAll(".ba-dot");

    function actualizarBa() {
        baTrack.style.transform = `translateX(-${baIndex * 100}%)`;
        dots.forEach((d, i) => d.classList.toggle("active", i === baIndex));
    }

    document.querySelectorAll(".ba-arrow").forEach((arrow) => {
        arrow.addEventListener("click", () => {
            baIndex = (baIndex + Number(arrow.dataset.direction) + slides.length) % slides.length;
            actualizarBa();
        });
    });

}

//==============================
// COMPARADOR ANTES / DESPUÉS
//==============================

document.querySelectorAll(".ba-compare").forEach((compare) => {

    const posicionInicial = compare.dataset.pos || "50";
    compare.style.setProperty("--pos", `${posicionInicial}%`);

    let arrastrando = false;

    const mover = (event) => {
        const rect = compare.getBoundingClientRect();
        const x = event.clientX - rect.left;
        let porciento = (x / rect.width) * 100;
        porciento = Math.min(95, Math.max(5, porciento));
        compare.style.setProperty("--pos", porciento + "%");
    };

    compare.addEventListener("pointerdown", (event) => {
        arrastrando = true;
        compare.setPointerCapture(event.pointerId);
        mover(event);
    });

    compare.addEventListener("pointermove", (event) => {
        if (arrastrando) {
            mover(event);
        }
    });

    compare.addEventListener("pointerup", () => {
        arrastrando = false;
    });

    compare.addEventListener("pointercancel", () => {
        arrastrando = false;
    });

});
//==============================
// MAPA EN VIVO DE ANIMALES REPORTADOS
//==============================
// Usa Leaflet + OpenStreetMap (sin clave de API).
// Los reportes se guardan en localStorage y se sincronizan entre pestañas
// al instante. Para tiempo real entre dispositivos distintos, solo hay que
// reemplazar cargarReportes() / guardarReportes() por llamadas a un backend
// (Firebase, Supabase, tu propia API con WebSocket, etc.).

function initMapaReportes() {

    const mapEl = document.getElementById("reportMap");

    if (!mapEl) {
        return;
    }

    if (typeof L === "undefined") {
        mapEl.innerHTML = '<div class="mapa-empty">No se pudo cargar el mapa. Revisa tu conexión a internet.</div>';
        return;
    }

    const REPORTS_KEY = "huellas_reportes";
    const CENTRO = [6.2442, -75.5812]; // Medellín
    const TIPOS = {
        perro: { emoji: "🐶", nombre: "Perro" },
        gato: { emoji: "🐱", nombre: "Gato" },
        otro: { emoji: "🐾", nombre: "Otro animal" }
    };
    const ESTADOS = {
        visto: "Visto en la calle",
        herido: "Herido, necesita ayuda",
        rescate: "En rescate",
        rescatado: "Rescatado"
    };

    const reportesIniciales = [
        { id: 1, tipo: "perro", estado: "herido", descripcion: "Perro mediano color café con una pata lastimada, cerca del parque.", foto: "", lat: 6.2088, lng: -75.5686, fecha: Date.now() - 1000 * 60 * 35, autor: "Usuario Demo" },
        { id: 2, tipo: "gato", estado: "visto", descripcion: "Gata gris con cachorros debajo de un carro estacionado.", foto: "", lat: 6.2442, lng: -75.5920, fecha: Date.now() - 1000 * 60 * 60 * 3, autor: "Usuario Demo" },
        { id: 3, tipo: "perro", estado: "rescate", descripcion: "Perro negro flaco, un voluntario ya va en camino.", foto: "", lat: 6.2518, lng: -75.5636, fecha: Date.now() - 1000 * 60 * 60 * 6, autor: "Entidad Demo" }
    ];

    // ---------- utilidades ----------

    const esc = (texto) => String(texto ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));

    const urlSegura = (url) => /^https?:\/\//i.test(url || "") ? url : "";

    function hace(fecha) {
        const min = Math.round((Date.now() - fecha) / 60000);
        if (min < 1) return "justo ahora";
        if (min < 60) return `hace ${min} min`;
        const h = Math.round(min / 60);
        if (h < 24) return `hace ${h} h`;
        return `hace ${Math.round(h / 24)} d`;
    }

    const usuarioActual = () => JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    const puedeGestionar = () => ["admin", "entidad"].includes(usuarioActual()?.rol);

    // ---------- datos (aquí se cambiaría por un backend) ----------

    function cargarReportes() {
        const guardados = localStorage.getItem(REPORTS_KEY);
        if (guardados) {
            try { return JSON.parse(guardados); } catch (e) { /* datos dañados */ }
        }
        localStorage.setItem(REPORTS_KEY, JSON.stringify(reportesIniciales));
        return reportesIniciales;
    }

    const canal = "BroadcastChannel" in window ? new BroadcastChannel("huellas_reportes") : null;

    function guardarReportes(lista, nuevoId = null) {
        localStorage.setItem(REPORTS_KEY, JSON.stringify(lista));
        canal?.postMessage({ nuevoId });
        refrescar(nuevoId);
    }

    // ---------- mapa ----------

    const mapa = L.map(mapEl, { scrollWheelZoom: false }).setView(CENTRO, 13);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mapa);

    // La rueda del mouse solo hace zoom después de hacer clic en el mapa
    mapa.on("focus", () => mapa.scrollWheelZoom.enable());
    mapa.on("blur", () => mapa.scrollWheelZoom.disable());

    const marcadores = new Map();
    let filtro = "todos";
    let ubicacion = null;
    let marcadorBorrador = null;

    function iconoReporte(r, nuevo) {
        const clase = ["animal-pin", r.estado, nuevo ? "nuevo" : ""].join(" ");
        return L.divIcon({
            className: clase,
            html: `<span><i>${TIPOS[r.tipo]?.emoji || "🐾"}</i></span>`,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -38]
        });
    }

    function popupHTML(r) {
        const foto = urlSegura(r.foto);
        const gestion = puedeGestionar() ? `
            <select data-accion="estado" data-id="${r.id}">
                ${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${k === r.estado ? "selected" : ""}>${v}</option>`).join("")}
            </select>
            <button type="button" data-accion="borrar" data-id="${r.id}">Eliminar</button>` : "";
        return `
            <div class="report-popup">
                ${foto ? `<img src="${esc(foto)}" alt="Foto del animal reportado">` : ""}
                <h4>${TIPOS[r.tipo]?.emoji || "🐾"} ${esc(TIPOS[r.tipo]?.nombre || "Animal")}</h4>
                <p>${esc(r.descripcion)}</p>
                <div class="popup-meta"><strong>${esc(ESTADOS[r.estado] || r.estado)}</strong><br>
                Reportado ${hace(r.fecha)} por ${esc(r.autor)}</div>
                ${gestion}
            </div>`;
    }

    // Sincroniza los marcadores del mapa con la lista de reportes
    function pintarMarcadores(lista, nuevoId) {

        const idsVisibles = new Set();

        lista.filter((r) => filtro === "todos" || r.tipo === filtro).forEach((r) => {

            idsVisibles.add(r.id);
            let m = marcadores.get(r.id);

            if (!m) {
                m = L.marker([r.lat, r.lng], { icon: iconoReporte(r, r.id === nuevoId), title: TIPOS[r.tipo]?.nombre });
                m.bindPopup(() => popupHTML(m.reporte));
                m.addTo(mapa);
                marcadores.set(r.id, m);
            } else {
                m.setIcon(iconoReporte(r, false));
            }

            m.reporte = r;
            if (m.isPopupOpen()) {
                m.getPopup().setContent(popupHTML(r));
            }
        });

        marcadores.forEach((m, id) => {
            if (!idsVisibles.has(id)) {
                m.remove();
                marcadores.delete(id);
            }
        });
    }

    function pintarLista(lista) {

        const cont = document.getElementById("reportList");
        const visibles = lista
            .filter((r) => filtro === "todos" || r.tipo === filtro)
            .sort((a, b) => b.fecha - a.fecha);

        if (!visibles.length) {
            cont.innerHTML = '<div class="mapa-empty">No hay reportes de este tipo todavía.</div>';
            return;
        }

        cont.innerHTML = visibles.map((r) => `
            <button type="button" class="report-item" data-id="${r.id}">
                <span class="report-item-icon">${TIPOS[r.tipo]?.emoji || "🐾"}</span>
                <span>
                    <strong>${esc(ESTADOS[r.estado] || r.estado)}</strong>
                    <small>${esc(r.descripcion.slice(0, 70))}${r.descripcion.length > 70 ? "…" : ""} · ${hace(r.fecha)}</small>
                </span>
            </button>`).join("");
    }

    function pintarEstado(lista) {
        const hora = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
        document.getElementById("mapStatusText").textContent =
            `En vivo · ${lista.length} reporte${lista.length === 1 ? "" : "s"} · ${hora}`;
    }

    function refrescar(nuevoId = null) {
        const lista = cargarReportes();
        pintarMarcadores(lista, nuevoId);
        pintarLista(lista);
        pintarEstado(lista);
    }

    // ---------- tiempo real ----------

    canal?.addEventListener("message", (e) => refrescar(e.data?.nuevoId));

    window.addEventListener("storage", (e) => {
        if (e.key === REPORTS_KEY) {
            refrescar();
        }
    });

    setInterval(() => refrescar(), 15000);

    // ---------- interacciones ----------

    document.getElementById("mapFilters").addEventListener("click", (e) => {
        const chip = e.target.closest(".mapa-chip");
        if (!chip) return;
        filtro = chip.dataset.filter;
        document.querySelectorAll(".mapa-chip").forEach((c) => c.classList.toggle("active", c === chip));
        refrescar();
    });

    document.getElementById("reportList").addEventListener("click", (e) => {
        const item = e.target.closest(".report-item");
        if (!item) return;
        const m = marcadores.get(Number(item.dataset.id));
        if (m) {
            mapa.flyTo(m.getLatLng(), 16, { duration: .8 });
            m.openPopup();
            mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    });

    // Acciones de admin/entidad dentro del popup
    mapa.on("popupopen", (e) => {
        const el = e.popup.getElement();
        el.querySelector("[data-accion='estado']")?.addEventListener("change", (ev) => {
            const lista = cargarReportes();
            const r = lista.find((x) => x.id === Number(ev.target.dataset.id));
            if (r && puedeGestionar()) {
                r.estado = ev.target.value;
                guardarReportes(lista);
            }
        });
        el.querySelector("[data-accion='borrar']")?.addEventListener("click", (ev) => {
            if (!puedeGestionar() || !confirm("¿Eliminar este reporte?")) return;
            guardarReportes(cargarReportes().filter((x) => x.id !== Number(ev.target.dataset.id)));
            mapa.closePopup();
        });
    });

    // ---------- formulario de reporte ----------

    const form = document.getElementById("reportForm");
    const hint = document.getElementById("reportHint");
    const msg = document.getElementById("reportMessage");
    const textoUbicacion = document.getElementById("reportLocation");

    function fijarUbicacion(lat, lng) {
        ubicacion = { lat, lng };
        if (marcadorBorrador) {
            marcadorBorrador.setLatLng([lat, lng]);
        } else {
            marcadorBorrador = L.marker([lat, lng], { opacity: .7 }).addTo(mapa);
        }
        textoUbicacion.textContent = `📍 Ubicación marcada (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        textoUbicacion.classList.add("listo");
    }

    function limpiarUbicacion() {
        ubicacion = null;
        marcadorBorrador?.remove();
        marcadorBorrador = null;
        textoUbicacion.textContent = "Toca el mapa para marcar dónde está.";
        textoUbicacion.classList.remove("listo");
    }

    mapa.on("click", (e) => {
        if (usuarioActual()) {
            fijarUbicacion(e.latlng.lat, e.latlng.lng);
        }
    });

    document.getElementById("useMyLocation").addEventListener("click", () => {

        if (!navigator.geolocation) {
            msg.textContent = "Tu navegador no permite usar la ubicación.";
            return;
        }

        msg.textContent = "Buscando tu ubicación…";

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                fijarUbicacion(pos.coords.latitude, pos.coords.longitude);
                mapa.flyTo([pos.coords.latitude, pos.coords.longitude], 16);
                msg.textContent = "";
            },
            () => { msg.textContent = "No pudimos obtener tu ubicación. Toca el mapa para marcarla."; },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });

    form.addEventListener("submit", (e) => {

        e.preventDefault();

        const usuario = usuarioActual();

        if (!usuario) {
            msg.textContent = "Inicia sesión para reportar un animal.";
            return;
        }

        if (!ubicacion) {
            msg.textContent = "Marca en el mapa dónde está el animal.";
            return;
        }

        const datos = new FormData(form);
        const lista = cargarReportes();
        const id = Date.now();

        lista.unshift({
            id,
            tipo: datos.get("tipo"),
            estado: datos.get("estado"),
            descripcion: String(datos.get("descripcion")).trim(),
            foto: String(datos.get("foto") || "").trim(),
            lat: ubicacion.lat,
            lng: ubicacion.lng,
            fecha: id,
            autor: usuario.nombre
        });

        guardarReportes(lista, id);
        form.reset();
        limpiarUbicacion();
        msg.textContent = "✅ Reporte publicado. Ya aparece en el mapa.";
        mapa.flyTo([lista[0].lat, lista[0].lng], 16);
    });

    // Se llama desde renderAuthActions() al iniciar/cerrar sesión
    window.actualizarFormReporte = () => {
        const logueado = !!usuarioActual();
        form.classList.toggle("visible", logueado);
        hint.textContent = logueado
            ? "Toca el mapa para marcar dónde está el animal, o usa tu ubicación."
            : "Inicia sesión para reportar un animal.";
        if (!logueado) limpiarUbicacion();
    };

    window.actualizarFormReporte();
    refrescar();

    // El mapa puede calcular mal su tamaño si el layout cambia
    window.addEventListener("load", () => mapa.invalidateSize());
    window.addEventListener("resize", () => mapa.invalidateSize());
}

initMapaReportes();