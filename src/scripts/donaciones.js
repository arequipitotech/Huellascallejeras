//=====================================
// FORMULARIO DONACIÓN MONETARIA
//=====================================

const formDinero = document.getElementById("formDinero");
const donationNotice = document.getElementById("donationNotice");

function mostrarNotificacion(mensaje, tipo = "success") {

    if (!donationNotice) return;

    donationNotice.hidden = false;
    donationNotice.className = `donation-notice ${tipo}`;
    donationNotice.textContent = mensaje;

    window.scrollTo({ top: 0, behavior: "smooth" });

}

function verificarSesion() {

    const usuario = JSON.parse(sessionStorage.getItem("huellas_usuario") || "null");

    if (!usuario) {
        mostrarNotificacion("Para hacer una donación debes iniciar sesión o registrarte primero. Vuelve al inicio para acceder.", "error");
        return false;
    }

    return true;

}

async function enviarDonacion(datos) {
    const usuario = JSON.parse(sessionStorage.getItem("huellas_usuario") || "null");
    const response = await fetch("/api/donations", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": usuario?.csrfToken || ""
        },
        credentials: "same-origin",
        body: JSON.stringify(datos)
    });
    let result;
    try {
        result = await response.json();
    } catch {
        throw new Error("No se pudo leer la respuesta del servidor. Verifica que la API y MySQL estén iniciados.");
    }
    if (!response.ok) throw new Error(result.error || "No se pudo registrar la donación.");
}

formDinero.addEventListener("submit", async function(e){

    e.preventDefault();

    if (!verificarSesion()) return;

    const opcion = document.querySelector('input[name="valor"]:checked');
    const otroValor = formDinero.querySelector('input[type="number"]').value;

    if(!opcion && otroValor == ""){

        mostrarNotificacion("Debes seleccionar o escribir un valor para donar.", "error");

        return;

    }

    let valor;

    if(opcion){

        valor = opcion.value;

    }else{

        valor = otroValor;

    }

    try {
        await enviarDonacion({ type: "money", amount: Number(valor) });
        mostrarNotificacion(`Gracias por tu apoyo. Registramos tu aporte de $${Number(valor).toLocaleString("es-CO")}.`, "success");
        formDinero.reset();
    } catch (error) {
        mostrarNotificacion(error.message, "error");
    }

});

//=====================================
// FORMULARIO DONACIÓN EN ESPECIE
//=====================================

const formEspecie = document.getElementById("formEspecie");

formEspecie.addEventListener("submit", async function(e){

    e.preventDefault();

    if (!verificarSesion()) return;

    const checks = formEspecie.querySelectorAll('input[type="checkbox"]:checked');

    if(checks.length==0){

        mostrarNotificacion("Selecciona al menos un artículo para donar.", "error");

        return;

    }

    const ciudad = formEspecie.querySelector('input[placeholder="Ciudad"]').value;

    const direccion = formEspecie.querySelector('input[placeholder="Dirección donde recoger"]').value;

    const telefono = formEspecie.querySelector('input[type="tel"]').value;

    if(ciudad=="" || direccion=="" || telefono==""){

        mostrarNotificacion("Completa todos los datos para programar la recolección.", "error");

        return;

    }

    const productos = [...checks].map((check) => check.parentElement.textContent.trim());
    try {
        await enviarDonacion({
            type: "in_kind",
            items: productos,
            city: ciudad,
            address: direccion,
            phone: telefono
        });
        mostrarNotificacion(`Gracias por tu donación en especie. Registramos: ${productos.join(", ")}. Nos comunicaremos contigo para coordinar la recolección.`, "success");
        formEspecie.reset();
    } catch (error) {
        mostrarNotificacion(error.message, "error");
    }

});

//=====================================
// EFECTO DE APARICIÓN
//=====================================

const cards=document.querySelectorAll(".card,.info div");

const observer=new IntersectionObserver((entries)=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

entry.target.style.opacity="1";

entry.target.style.transform="translateY(0px)";

}

});

},{threshold:.2});

cards.forEach(card=>{

card.style.opacity="0";

card.style.transform="translateY(40px)";

card.style.transition=".7s";

observer.observe(card);

});

//=====================================
// BOTÓN VOLVER ARRIBA
//=====================================

const btnTop=document.createElement("button");

btnTop.innerHTML="⬆";

btnTop.className="topButton";

document.body.appendChild(btnTop);

btnTop.style.position="fixed";
btnTop.style.bottom="25px";
btnTop.style.right="25px";
btnTop.style.width="55px";
btnTop.style.height="55px";
btnTop.style.borderRadius="50%";
btnTop.style.border="none";
btnTop.style.background="#db2777";
btnTop.style.color="white";
btnTop.style.fontSize="22px";
btnTop.style.cursor="pointer";
btnTop.style.display="none";
btnTop.style.boxShadow="0 10px 25px rgba(0,0,0,.3)";
btnTop.style.transition=".3s";

window.addEventListener("scroll",()=>{

if(window.scrollY>300){

btnTop.style.display="block";

}else{

btnTop.style.display="none";

}

});

btnTop.addEventListener("click",()=>{

window.scrollTo({

top:0,

behavior:"smooth"

});

});