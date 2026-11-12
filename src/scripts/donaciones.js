//=====================================
// FORMULARIO DONACIÓN MONETARIA
//=====================================

const formDinero = document.getElementById("formDinero");
const donationNotice = document.getElementById("donationNotice");

function mostrarNotificacion(mensaje, tipo = "success") {

    if (!donationNotice) return;

    donationNotice.hidden = false;
    donationNotice.className = `donation-notice ${tipo}`;
    donationNotice.innerHTML = mensaje;

    window.scrollTo({ top: 0, behavior: "smooth" });

}

function verificarSesion() {

    const usuario = JSON.parse(sessionStorage.getItem("huellas_usuario") || "null");

    if (!usuario) {
        mostrarNotificacion("Para hacer una donación debes iniciar sesión o registrarte primero. <a href='../index.html' style='color:inherit; font-weight:700;'>Ir a acceder</a>", "error");
        return false;
    }

    return true;

}

formDinero.addEventListener("submit", function(e){

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

    mostrarNotificacion(`❤️ Gracias por tu apoyo, <strong>${JSON.parse(sessionStorage.getItem("huellas_usuario") || "{}")?.nombre || "usuario"}</strong>.<br><br>Has registrado una donación de <strong>$${Number(valor).toLocaleString("es-CO")}</strong>.<br><br>Tu aporte permitirá brindar alimento, atención médica y nuevas oportunidades a animales en situación de abandono.`, "success");

    formDinero.reset();

});

//=====================================
// FORMULARIO DONACIÓN EN ESPECIE
//=====================================

const formEspecie = document.getElementById("formEspecie");

formEspecie.addEventListener("submit",function(e){

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

    let productos=[];

    checks.forEach(check=>{

        productos.push(check.parentElement.textContent.trim());

    });

    mostrarNotificacion(`🐾 Gracias por tu donación en especie, <strong>${JSON.parse(sessionStorage.getItem("huellas_usuario") || "{}")?.nombre || "usuario"}</strong>.<br><br>Hemos recibido tu solicitud para entregar: <strong>${productos.join(", ")}</strong>.<br><br>Pronto un voluntario se comunicará contigo para coordinar la recolección en <strong>${ciudad}</strong>.`, "success");

    formEspecie.reset();

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