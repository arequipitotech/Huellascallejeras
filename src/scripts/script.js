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
const SESSION_KEY = "huellas_usuario";
const usuarioSesion = () => JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");

async function apiRequest(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    const body = options.body;

    if (body && !(body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    if (options.method && options.method !== "GET") {
        const usuario = usuarioSesion();
        if (usuario?.csrfToken) {
            headers["X-CSRF-Token"] = usuario.csrfToken;
        }
    }

    const response = await fetch(path, {
        ...options,
        headers,
        credentials: "same-origin"
    });
    const data = await leerRespuestaJSON(response);
    if (!response.ok) {
        throw new Error(data?.error || "No se pudo completar la solicitud.");
    }
    return data;
}

function guardarSesion(data) {
    const usuario = {
        id: data.user.id,
        nombre: data.user.name,
        email: data.user.email,
        rol: data.user.role,
        csrfToken: data.csrfToken
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(usuario));
    return usuario;
}

async function leerRespuestaJSON(response) {
    if (response.status === 204) return null;
    try {
        return await response.json();
    } catch {
        throw new Error("No se pudo leer la respuesta del servidor. Verifica que la API y MySQL estén iniciados.");
    }
}

function escaparHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

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

async function procesarFotoMascota(file) {
    if (!file) {
        return null;
    }

    const tiposPermitidos = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!tiposPermitidos.includes(file.type)) {
        throw new Error("Selecciona una imagen PNG, JPG, WebP o GIF.");
    }

    if (file.size > 10 * 1024 * 1024) {
        throw new Error("La imagen debe pesar menos de 10 MB.");
    }

    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * escala));
    canvas.height = Math.max(1, Math.round(bitmap.height * escala));
    const contexto = canvas.getContext("2d");
    if (!contexto) {
        bitmap.close();
        throw new Error("No se pudo procesar la imagen en este navegador.");
    }

    contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error("No se pudo procesar la imagen."));
                return;
            }
        }, "image/webp", 0.82);
    });
}

async function renderMascotas() {

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

    let mascotas;
    try {
        mascotas = await apiRequest("/api/pets");
    } catch (error) {
        console.error("No se pudieron cargar las mascotas.", error);
        contenedor.textContent = "No se pudieron cargar las mascotas. Intenta actualizar la página.";
        return;
    }

    if (!mascotas.length) {
        contenedor.innerHTML = '<div class="pet-empty">Aún no hay mascotas publicadas.</div>';
        return;
    }

    const tarjetas = mascotas.map((mascota) => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "pet-card";

        const contenedorFoto = document.createElement("div");
        contenedorFoto.className = "imgBx";
        const foto = document.createElement("img");
        foto.src = mascota.foto || "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=80";
        foto.alt = mascota.nombre;
        foto.loading = "lazy";
        contenedorFoto.append(foto);

        const contenido = document.createElement("div");
        contenido.className = "content";
        const texto = document.createElement("div");
        const nombre = document.createElement("h2");
        nombre.textContent = mascota.nombre;
        const crearDato = (etiqueta, valor) => {
            const dato = document.createElement("p");
            const titulo = document.createElement("strong");
            titulo.textContent = `${etiqueta}: `;
            dato.append(titulo, document.createTextNode(valor));
            return dato;
        };
        const edad = String(mascota.edad || "").trim();
        const edadFormateada = /^\d+(?:[.,]\d+)?$/.test(edad)
            ? `${edad} ${edad === "1" ? "año" : "años"}`
            : edad || "No especificada";

        texto.append(
            nombre,
            crearDato("Raza", mascota.raza || "No especificada"),
            crearDato("Edad", edadFormateada),
            crearDato("Descripción", mascota.descripcion || "Sin descripción.")
        );
        contenido.append(texto);
        tarjeta.append(contenedorFoto, contenido);
        return tarjeta;
    });

    contenedor.replaceChildren(...tarjetas);

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
            <h3>${escaparHTML(usuario.nombre)}</h3>
            <p>${escaparHTML(usuario.email)}</p>
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
            <span class="user-name">Hola, ${escaparHTML(usuario.nombre)} (${rolTexto})</span>
            <button class="profile-trigger" id="profileTrigger" aria-label="Abrir perfil" title="Abrir perfil">${escaparHTML(inicial)}</button>
            ${usuario.rol === "admin" ? '<a class="auth-btn small secondary" href="/admin/">Dashboard</a>' : ""}
            <button class="auth-btn small secondary" id="logoutBtn">Cerrar sesión</button>
        `;

        document.getElementById("profileTrigger").addEventListener("click", () => {
            mostrarPerfil(true);
        });

        document.getElementById("logoutBtn").addEventListener("click", async () => {
            try {
                await apiRequest("/api/auth/logout", { method: "POST", body: {} });
                sessionStorage.removeItem(SESSION_KEY);
                renderAuthActions();
                renderProfile();
                renderMascotas();
            } catch (error) {
                console.error("No se pudo cerrar la sesión.", error);
                loginMessage.textContent = error.message;
            }
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

        if (!nombre || !email || !password) {
            registerMessage.textContent = "Completa todos los campos.";
            return;
        }

        if (password.length < 12) {
            registerMessage.textContent = "La contraseña debe tener al menos 12 caracteres.";
            return;
        }

        try {
            const data = await apiRequest("/api/auth/register", {
                method: "POST",
                body: { name: nombre, email, password }
            });
            guardarSesion(data);
            registerForm.reset();
            registerMessage.textContent = "✅ Cuenta creada correctamente.";
            renderAuthActions();
            cerrarModal();
        } catch (error) {
            registerMessage.textContent = error.message;
        }
    });

}

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = loginForm.querySelector("input[name='email']").value.trim();
        const password = loginForm.querySelector("input[name='password']").value;

        try {
            const data = await apiRequest("/api/auth/login", {
                method: "POST",
                body: { email, password }
            });
            guardarSesion(data);
            loginForm.reset();
            loginMessage.textContent = "✅ Sesión iniciada.";
            renderAuthActions();
            cerrarModal();
        } catch (error) {
            loginMessage.textContent = error.message;
        }
    });

}

const petForm = document.getElementById("petForm");
const petMessage = document.getElementById("petMessage");

if (petForm) {

    petForm.addEventListener("submit", async (event) => {
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
        const archivoFoto = petForm.querySelector("input[name='foto']").files[0];

        if (!nombre || !raza || !edad || !descripcion) {
            petMessage.textContent = "Completa los datos de la mascota.";
            return;
        }

        let foto;
        try {
            foto = await procesarFotoMascota(archivoFoto);
        } catch (error) {
            petMessage.textContent = error.message || "No se pudo procesar la imagen seleccionada.";
            return;
        }

        try {
            const payload = new FormData();
            payload.append("name", nombre);
            payload.append("species", petForm.querySelector("select[name='tipo']")?.value || "perro");
            payload.append("breed", raza);
            payload.append("age", edad);
            payload.append("description", descripcion);
            if (foto) payload.append("photo", foto, "mascota.webp");

            await apiRequest("/api/pets", { method: "POST", body: payload });
        } catch (error) {
            console.error("No se pudo guardar la mascota.", error);
            petMessage.textContent = error.message || "No se pudo guardar la mascota.";
            return;
        }

        petForm.reset();
        petMessage.textContent = "✅ Mascota publicada correctamente.";
        renderMascotas();
        activarPestanaAdopciones("mascotas");
        document.getElementById("petsList")?.scrollIntoView({ behavior: "smooth", block: "center" });
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

        try {
            const data = await apiRequest("/api/auth/profile", {
                method: "PATCH",
                body: { name: nombre, email, password }
            });
            guardarSesion(data);
            profileMessage.textContent = "✅ Perfil actualizado correctamente.";
            renderAuthActions();
            renderProfile();
        } catch (error) {
            profileMessage.textContent = error.message;
        }
    });

}

async function restaurarSesion() {
    try {
        const data = await apiRequest("/api/auth/me");
        if (data.user) {
            guardarSesion(data);
        } else {
            sessionStorage.removeItem(SESSION_KEY);
        }
    } catch (error) {
        console.error("No se pudo verificar la sesión.", error);
        loginMessage.textContent = "No se pudo conectar con el servidor. Intenta actualizar la página.";
    }
    renderAuthActions();
}

restaurarSesion();

const formulario = document.getElementById("formulario");
formulario?.addEventListener("submit", (event) => {
    event.preventDefault();
    const correo = formulario.querySelector("input").value.trim();
    if (!correo) {
        alert("Ingresa un correo electrónico.");
        return;
    }
    alert("✅ Gracias por suscribirte.\n\nMuy pronto recibirás noticias sobre nuestros rescates.");
    formulario.reset();
});

const contactForm = document.getElementById("contactForm");
const contactMessage = document.getElementById("contactMessage");

contactForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(contactForm);
    contactMessage.textContent = "";

    try {
        await apiRequest("/api/messages", {
            method: "POST",
            body: {
                name: formData.get("name"),
                email: formData.get("email"),
                message: formData.get("message")
            }
        });
        contactForm.reset();
        contactMessage.textContent = "✅ Recibimos tu mensaje. Gracias por escribirnos.";
    } catch (error) {
        contactMessage.textContent = error.message;
    }
});

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
// Los reportes se guardan en MySQL y el mapa los vuelve a consultar periódicamente.

function initMapaReportes() {

    const mapEl = document.getElementById("reportMap");

    if (!mapEl || mapEl.dataset.mapInitialized === "true") {
        return;
    }

    if (typeof L === "undefined") {
        mapEl.innerHTML = '<div class="mapa-empty">No se pudo cargar el mapa. Revisa tu conexión a internet.</div>';
        return;
    }

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

    const usuarioActual = () => usuarioSesion();
    const puedeGestionar = () => ["admin", "entidad"].includes(usuarioActual()?.rol);

    async function cargarReportes() {
        return apiRequest("/api/reports");
    }

    // ---------- mapa ----------

    const mapa = L.map(mapEl, { scrollWheelZoom: false }).setView(CENTRO, 13);
    mapEl.dataset.mapInitialized = "true";

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

    async function refrescar(nuevoId = null) {
        try {
            const lista = await cargarReportes();
            pintarMarcadores(lista, nuevoId);
            pintarLista(lista);
            pintarEstado(lista);
        } catch (error) {
            console.error("No se pudieron cargar los reportes.", error);
            document.getElementById("mapStatusText").textContent = "No se pudieron cargar los reportes.";
        }
    }

    // ---------- tiempo real ----------

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
            if (puedeGestionar()) {
                apiRequest(`/api/reports/${ev.target.dataset.id}`, {
                    method: "PATCH",
                    body: { status: ev.target.value }
                }).then(() => refrescar()).catch((error) => {
                    console.error("No se pudo actualizar el reporte.", error);
                    msg.textContent = error.message;
                });
            }
        });
        el.querySelector("[data-accion='borrar']")?.addEventListener("click", (ev) => {
            if (!puedeGestionar() || !confirm("¿Eliminar este reporte?")) return;
            apiRequest(`/api/reports/${ev.target.dataset.id}`, { method: "DELETE" })
                .then(() => {
                    mapa.closePopup();
                    refrescar();
                })
                .catch((error) => {
                    console.error("No se pudo eliminar el reporte.", error);
                    msg.textContent = error.message;
                });
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

    form.addEventListener("submit", async (e) => {

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
        const lat = ubicacion.lat;
        const lng = ubicacion.lng;
        try {
            const respuesta = await apiRequest("/api/reports", {
                method: "POST",
                body: {
                    tipo: datos.get("tipo"),
                    estado: datos.get("estado"),
                    descripcion: String(datos.get("descripcion")).trim(),
                    foto: String(datos.get("foto") || "").trim(),
                    lat: ubicacion.lat,
                    lng: ubicacion.lng
                }
            });
            form.reset();
            limpiarUbicacion();
            msg.textContent = "✅ Reporte publicado. Ya aparece en el mapa.";
            await refrescar(respuesta.id);
            mapa.flyTo([lat, lng], 16);
        } catch (error) {
            msg.textContent = error.message;
        }
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