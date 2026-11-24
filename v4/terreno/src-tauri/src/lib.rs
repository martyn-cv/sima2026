/// App de escritorio de terreno: la ventana carga la interfaz de React; la sesión, las alarmas en vivo
/// y las órdenes de trabajo corren contra la API de SIMA.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("no se pudo iniciar la app de terreno");
}
