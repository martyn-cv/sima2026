// En Windows, la versión final no abre una consola detrás de la ventana.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    sima_desktop_lib::run()
}
