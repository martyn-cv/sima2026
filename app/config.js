// Dirección de la API. Por defecto usa el mismo equipo en el puerto 8000.
// Para otro servidor, defina window.SIMA_API antes de cargar la página (ej. "https://sima.miempresa.cl/api").
window.SIMA_API = window.SIMA_API || (location.protocol + '//' + (location.hostname || 'localhost') + ':8000/api');
