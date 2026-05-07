mod commands;
mod crypto;
mod db;
mod errors;
mod services;
mod state;

use state::AppState;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::new())
        .setup(|app| {
            let show_item = MenuItem::with_id(app, "show", "Show LockGrid", true, None::<&str>)?;
            let lock_item = MenuItem::with_id(app, "lock", "Lock Vault", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &lock_item, &quit_item])?;

            TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("LockGrid Auth")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main_window(app),
                    "lock" => {
                        if let Some(state) = app.try_state::<AppState>() {
                            state.lock();
                        }
                        show_main_window(app);
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Auth
            commands::auth::get_auth_status,
            commands::auth::setup_master_password,
            commands::auth::unlock,
            commands::auth::lock_app,
            commands::auth::setup_pin,
            commands::auth::verify_pin,
            // Credentials
            commands::credentials::create_credential,
            commands::credentials::get_credential,
            commands::credentials::list_credentials,
            commands::credentials::update_credential,
            commands::credentials::delete_credential,
            commands::credentials::get_credential_history,
            commands::credentials::generate_password,
            commands::credentials::calculate_password_strength,
            // Categories
            commands::categories::list_categories,
            commands::categories::create_category,
            commands::categories::update_category,
            commands::categories::delete_category,
            // Tags
            commands::tags::list_tags,
            commands::tags::create_tag,
            commands::tags::delete_tag,
            // Attachments
            commands::attachments::list_attachments,
            commands::attachments::upload_attachment,
            commands::attachments::download_attachment,
            commands::attachments::delete_attachment,
            // Search
            commands::search::search_credentials,
            // Clipboard
            commands::clipboard::copy_and_clear,
            commands::clipboard::clear_clipboard,
            // Files & Connections
            commands::files::open_url,
            commands::files::open_file,
            commands::files::execute_command,
            commands::files::guided_connect,
            // Backup
            commands::backup::export_backup,
            commands::backup::import_backup,
            // Settings
            commands::settings::get_settings,
            commands::settings::get_setting,
            commands::settings::set_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running LockGrid Auth");
}
