/// Simulador de PLC de SIMA: la ventana carga la interfaz de React y toda la lógica (ciclo de scan,
/// proceso físico, conexión con la API) corre en TypeScript dentro de ella.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("no se pudo iniciar el simulador de PLC");
}
