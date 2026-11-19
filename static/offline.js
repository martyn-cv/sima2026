// Registro sin conexión (prototipo): si no hay red al guardar, el registro queda en este equipo
// y se envía solo cuando vuelve la conexión. Cada registro lleva un uid, así que no se duplica.
(function () {
  var KEY = "sima_cola";
  function leer() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function guardar(c) { localStorage.setItem(KEY, JSON.stringify(c)); }
  function aviso(t, error) {
    var el = document.getElementById("estado-red");
    if (el) { el.textContent = t; el.className = "msg" + (error ? " error" : ""); el.style.display = "block"; }
  }
  function enviar(item) {
    return fetch(item.url, { method: "POST", headers: { "X-CSRFToken": item.csrf, "X-Requested-With": "fetch",
      "Content-Type": "application/x-www-form-urlencoded" }, body: item.body, credentials: "same-origin" });
  }
  function sincronizar() {
    var cola = leer();
    if (!cola.length || !navigator.onLine) return;
    var item = cola[0];
    enviar(item).then(function (r) {
      if (r.status === 403 || r.status === 401 || r.redirected) { aviso("Inicie sesión de nuevo para enviar " + cola.length + " registro(s) pendiente(s).", true); return; }
      cola = leer(); cola.shift(); guardar(cola);   // éxito o rechazo definitivo (400/409): sale de la cola
      if (r.ok) aviso("Registro sincronizado. Pendientes: " + cola.length);
      else aviso("Un registro fue rechazado por el servidor (" + r.status + ").", true);
      if (cola.length) sincronizar(); else if (r.ok) setTimeout(function () { location.reload(); }, 800);
    }).catch(function () { aviso("Sin conexión. Pendientes en este equipo: " + cola.length, true); });
  }
  window.addEventListener("online", sincronizar);
  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("form-bitacora");
    var n = leer().length;
    if (n) aviso("Hay " + n + " registro(s) pendientes de enviar.", true);
    sincronizar();
    if (!form) return;
    form.addEventListener("submit", function (ev) {
      var uid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random();
      form.elements["uid"].value = uid;
      form.elements["hecho_en"].value = new Date().toISOString();
      if (navigator.onLine) return;            // con red: envío normal del formulario
      ev.preventDefault();
      var cola = leer();
      cola.push({ url: form.action, csrf: form.elements["csrfmiddlewaretoken"].value, body: new URLSearchParams(new FormData(form)).toString() });
      guardar(cola);
      form.reset();
      aviso("Sin conexión: registro guardado en este equipo (" + cola.length + " pendiente/s). Se enviará solo al volver la señal.");
    });
  });
})();
