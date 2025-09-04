use serde::{Deserialize, Serialize};
use crate::meta::MetaDirectories;
use std::path::PathBuf;
use tauri::Emitter;

pub mod meta;
pub mod minecraft;
pub mod modpack;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserSettings {
    pub username: String,
    #[serde(rename = "allocatedRam")]
    pub allocated_ram: f32,
    #[serde(rename = "authMethod")]
    pub auth_method: String, // "offline" or "microsoft"
    #[serde(rename = "microsoftAccount")]
    pub microsoft_account: Option<MicrosoftAccount>,
    #[serde(rename = "clientToken")]
    pub client_token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MicrosoftAccount {
    pub xuid: String,
    pub exp: u64,
    pub uuid: String,
    pub username: String,
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[serde(rename = "refreshToken")]
    pub refresh_token: String,
    #[serde(rename = "clientId")]
    pub client_id: String,
}

#[tauri::command]
async fn get_root_dir(app: tauri::AppHandle) -> Result<PathBuf, String> {
    let _ = app.emit("logs", serde_json::json!({
        "type": "launcher",
        "message": "[Launcher:Rust] Fetching root dir..."
    }));

    let meta_dirs = MetaDirectories::new()
        .map_err(|e| {
            let _ = app.emit("logs", serde_json::json!({
                "type": "launcher",
                "message": format!("[Launcher:Rust][ERROR] Failed to init MetaDirectories: {}", e)
            }));
            e.to_string()
        })?;

    if let Err(e) = meta_dirs.ensure() {
        let _ = app.emit("logs", serde_json::json!({
            "type": "launcher",
            "message": format!("[Launcher:Rust][ERROR] Failed to ensure MetaDirectories: {}", e)
        }));
        return Err(e.to_string());
    }

    let root_dir = meta_dirs.get_root_dir().to_path_buf();

    let _ = app.emit("logs", serde_json::json!({
        "type": "launcher",
        "message": format!("[Launcher:Rust] Root dir found: {}", root_dir.display())
    }));

    Ok(root_dir)
}


#[tauri::command]
async fn set_root_dir(path: String) -> Result<(), String>{
    let mut meta_dirs = MetaDirectories::new().map_err(|e| e.to_string())?;
    meta_dirs.set_root_dir(path.into());
    Ok(())
}


#[tauri::command]
async fn create_microsoft_auth_link() -> Result<String, String> {
    match lyceris::auth::microsoft::create_link() {
        Ok(url) => Ok(url),
        Err(e) => Err(format!("Failed to create Microsoft auth link: {}", e)),
    }
}

#[tauri::command]
async fn check_manifest_update() -> Result<bool, bool> {
    match modpack::modpack_required_update().await {
        Ok(v) => Ok(v),
        Err(_) => Err(false),
    }
}

#[tauri::command]
async fn update_modpack(app: tauri::AppHandle) -> Result<(), String> {
    match crate::modpack::download_modpack(app.clone()).await {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to launch modpack: {}", e)),
    }
}

#[tauri::command]
async fn launch_meta(app: tauri::AppHandle, settings: UserSettings) -> Result<(), String> {

    match crate::minecraft::launch_minecraft_with_forge(settings, app.clone()).await {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to launch modpack: {}", e)),
    }
}

#[tauri::command]
async fn authenticate_microsoft(code: String) -> Result<MicrosoftAccount, String> {
    let client = reqwest::Client::new();
    match lyceris::auth::microsoft::authenticate(code, &client).await {
        Ok(account) => Ok(MicrosoftAccount {
            xuid: account.xuid,
            exp: account.exp,
            uuid: account.uuid,
            username: account.username,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            client_id: account.client_id,
        }),
        Err(e) => Err(format!("Failed to authenticate with Microsoft: {}", e)),
    }
}

#[tauri::command]
async fn refresh_microsoft_token(refresh_token: String) -> Result<MicrosoftAccount, String> {
    let client = reqwest::Client::new();
    match lyceris::auth::microsoft::refresh(refresh_token, &client).await {
        Ok(account) => Ok(MicrosoftAccount {
            xuid: account.xuid,
            exp: account.exp,
            uuid: account.uuid,
            username: account.username,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            client_id: account.client_id,
        }),
        Err(e) => Err(format!("Failed to refresh Microsoft token: {}", e)),
    }
}

#[tauri::command]
async fn validate_microsoft_token(exp: u64) -> Result<bool, String> {
    Ok(lyceris::auth::microsoft::validate(exp))
}

#[tauri::command]
async fn open_microsoft_auth_and_get_url() -> Result<String, String> {
    // Create Microsoft auth URL and open it
    let auth_url = match lyceris::auth::microsoft::create_link() {
        Ok(url) => url,
        Err(e) => return Err(format!("Failed to create auth URL: {}", e)),
    };

    Ok(auth_url)
}

#[tauri::command]
async fn extract_code_from_redirect_url(url: String) -> Result<String, String> {
    // Extract code from the URL
    if let Some(code) = url.split("code=").nth(1).and_then(|s| s.split('&').next()) {
        Ok(code.to_string())
    } else if url.contains("error=") {
        let error = url
            .split("error=")
            .nth(1)
            .and_then(|s| s.split('&').next())
            .unwrap_or("Authentication failed");
        Err(format!("Microsoft authentication error: {}", error))
    } else {
        Err("No authorization code found in URL".to_string())
    }
}

#[tauri::command]
async fn open_microsoft_auth_modal(app: tauri::AppHandle) -> Result<String, String> {
    use std::sync::{Arc, Mutex};
    use std::time::Duration;
    use tauri::{WebviewUrl, WebviewWindowBuilder};

    // Create Microsoft auth URL
    let auth_url = match lyceris::auth::microsoft::create_link() {
        Ok(url) => url,
        Err(e) => return Err(format!("Failed to create auth URL: {}", e)),
    };

    // Store the result
    let result = Arc::new(Mutex::new(None::<Result<String, String>>));

    // Create a new webview window for authentication
    let auth_window = WebviewWindowBuilder::new(
        &app,
        "microsoft-auth",
        WebviewUrl::External(
            auth_url
                .parse()
                .map_err(|e| format!("Invalid URL: {}", e))?,
        ),
    )
    .title("Microsoft Authentication")
    .inner_size(600.0, 800.0)
    .center()
    .resizable(true)
    .minimizable(false)
    .maximizable(true)
    .always_on_top(false)
    .build()
    .map_err(|e| format!("Failed to create auth window: {}", e))?;

    // Monitor the window URL directly using a polling approach
    let result_check = Arc::clone(&result);
    let window_check = auth_window.clone();

    tokio::spawn(async move {
        loop {
            // Get current URL from the window
            if let Ok(current_url) = window_check.url() {
                let url_str = current_url.as_str();

                // Check if URL contains code parameter or is the redirect URL
                if url_str.contains("code=")
                    || url_str.contains("login.live.com/oauth20_desktop.srf")
                {
                    if let Some(code) = url_str
                        .split("code=")
                        .nth(1)
                        .and_then(|s| s.split('&').next())
                    {
                        if let Ok(mut result_guard) = result_check.lock() {
                            *result_guard = Some(Ok(code.to_string()));
                        }
                        let _ = window_check.close();
                        break;
                    } else if url_str.contains("error=") {
                        let error = url_str
                            .split("error=")
                            .nth(1)
                            .and_then(|s| s.split('&').next())
                            .unwrap_or("Authentication failed");
                        if let Ok(mut result_guard) = result_check.lock() {
                            *result_guard =
                                Some(Err(format!("Microsoft authentication error: {}", error)));
                        }
                        let _ = window_check.close();
                        break;
                    }
                }
            }

            // Check if window is still visible
            if !window_check.is_visible().unwrap_or(false) {
                break;
            }

            // Wait 100ms before next check
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
    });

    // Wait for the result with timeout
    let start_time = std::time::Instant::now();
    let timeout = Duration::from_secs(300); // 5 minutes timeout

    loop {
        // Check if we have a result
        if let Ok(result_guard) = result.lock() {
            if let Some(auth_result) = result_guard.as_ref() {
                return auth_result.clone();
            }
        }

        // Check for timeout
        if start_time.elapsed() > timeout {
            let _ = auth_window.close();
            return Err("Authentication timeout".to_string());
        }

        // Check if window is still open
        if !auth_window.is_visible().unwrap_or(false) {
            return Err("Authentication window was closed".to_string());
        }

        // Wait a bit before checking again
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            create_microsoft_auth_link,
            authenticate_microsoft,
            refresh_microsoft_token,
            validate_microsoft_token,
            open_microsoft_auth_and_get_url,
            extract_code_from_redirect_url,
            open_microsoft_auth_modal,
            launch_meta,
            check_manifest_update,
            update_modpack,
            get_root_dir,
            set_root_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
