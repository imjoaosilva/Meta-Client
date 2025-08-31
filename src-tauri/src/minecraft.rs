use crate::{meta::MetaDirectories, UserSettings};
use anyhow::{anyhow, Result};
use lyceris::auth::AuthMethod;
use lyceris::minecraft::loader::fabric::Fabric;
use lyceris::minecraft::loader::forge::Forge;
use lyceris::minecraft::loader::neoforge::NeoForge;
use lyceris::minecraft::loader::quilt::Quilt;
use lyceris::minecraft::loader::Loader;
use lyceris::minecraft::{
    config::{ConfigBuilder, Memory, Profile},
    emitter::{Emitter as LycerisEmitter, Event},
    install::install,
    launch::launch,
};
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::AppHandle;
use tauri::Emitter;
use tokio::sync::Mutex as AsyncMutex;

pub static RUNNING_PROCS: Lazy<
    std::sync::Mutex<HashMap<String, Arc<AsyncMutex<tokio::process::Child>>>>,
> = Lazy::new(|| std::sync::Mutex::new(HashMap::new()));

pub async fn launch_minecraft_with_forge(settings: UserSettings, app: AppHandle) -> Result<()> {
    let meta_dirs = MetaDirectories::new()?;
    meta_dirs.ensure()?;

    let instance_dir = meta_dirs.default_instance.clone();

    let emit_progress = {
        let app = app.clone();
        move |message: String, percentage: f32, component: String, current: u64, total: u64| {
            let _ = app.emit(
                "minecraft-progress",
                serde_json::json!({
                    "message": message,
                    "percentage": percentage,
                    "component": component,
                    "current": current,
                    "total": total,
                }),
            );
        }
    };

    let emitter = create_emitter_with_progress(emit_progress);

    {
        let app_clone = app.clone();
        let emitter_clone = emitter.clone();
        tokio::spawn(async move {
            emitter_clone
                .on(Event::Console, move |line: String| {
                    let _ = app_clone.emit("minecraft-log", line);
                })
                .await;
        });
    }

    let (auth_method, refreshed_account) = get_auth_method_with_validation(&settings).await?;
    if let Some(refreshed_account) = refreshed_account {
        let _ = app.emit(
            "microsoft-token-refreshed",
            serde_json::json!({
                "xuid": refreshed_account.xuid,
                "exp": refreshed_account.exp,
                "uuid": refreshed_account.uuid,
                "username": refreshed_account.username,
                "accessToken": refreshed_account.access_token,
                "refreshToken": refreshed_account.refresh_token,
                "clientId": refreshed_account.client_id
            }),
        );
    }

    let memory_gb = settings.allocated_ram.max(1);
    let loader = get_loader_by_name("forge", "47.4.0")?;

    let config = ConfigBuilder::new(meta_dirs.meta.clone(), "1.20.1".to_string(), auth_method)
        .profile(Profile::new("".to_string(), instance_dir.clone()))
        .runtime_dir(meta_dirs.java_versions.join("default").join("bin"))
        .memory(Memory::Gigabyte(memory_gb as u16))
        .loader(loader)
        .build();

    install(&config, Some(&emitter)).await?;

    let child = launch(&config, Some(&emitter)).await?;
    let child_arc = Arc::new(AsyncMutex::new(child));

    RUNNING_PROCS
        .lock()
        .unwrap()
        .insert("minecraft".to_string(), child_arc.clone());

    let _ = app.emit("minecraft-started", "started");

    {
        let app_clone = app.clone();
        tokio::spawn(async move {
            let mut guard = child_arc.lock().await;
            let _ = guard.wait().await;
            RUNNING_PROCS.lock().unwrap().remove("minecraft");
            let _ = app_clone.emit("minecraft-exited", "exited");
        });
    }

    Ok(())
}

async fn get_auth_method_with_validation(
    settings: &UserSettings,
) -> Result<(
    AuthMethod,
    Option<lyceris::auth::microsoft::MinecraftAccount>,
)> {
    match settings.auth_method.as_str() {
        "microsoft" => {
            if let Some(ref account) = settings.microsoft_account {
                Ok((
                    AuthMethod::Microsoft {
                        username: account.username.clone(),
                        xuid: account.xuid.clone(),
                        uuid: account.uuid.clone(),
                        access_token: account.access_token.clone(),
                        refresh_token: account.refresh_token.clone(),
                    },
                    None,
                ))
            } else {
                Ok((
                    AuthMethod::Offline {
                        username: settings.username.clone(),
                        uuid: None,
                    },
                    None,
                ))
            }
        }
        _ => Ok((
            AuthMethod::Offline {
                username: settings.username.clone(),
                uuid: None,
            },
            None,
        )),
    }
}

pub fn create_emitter_with_progress<F>(emit_progress: F) -> LycerisEmitter
where
    // Aqui adicionamos current e total como parâmetros do callback
    F: Fn(String, f32, String, u64, u64) + Send + Sync + 'static + Clone,
{
    let emitter = LycerisEmitter::default();

    // Single download progress
    /* {
        let emitter = emitter.clone();
        let emit_progress = emit_progress.clone();
        tokio::spawn(async move {
            emitter
                .on(
                    Event::SingleDownloadProgress,
                    move |(path, current, total): (String, u64, u64)| {
                        let file_name = std::path::Path::new(&path)
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or(&path);

                        // Chamamos o callback passando current e total
                        /*                   emit_progress(
                            format!("Downloading {}", file_name),
                            -1.0, // -1 indica que não atualiza o percentual geral
                            "downloading_minecraft_file".to_string(),
                            current,
                            total,
                        ); */

                        /* println!("Downloading {} - {}/{}", file_name, current, total); */
                    },
                )
                .await;
        });
    } */

    {
        let emitter = emitter.clone();
        let emit_progress = emit_progress.clone();
        tokio::spawn(async move {
            emitter
                .on(
                    Event::MultipleDownloadProgress,
                    move |(_, current, total, current_file): (String, u64, u64, String)| {
                        let percentage = if total > 0 {
                            (current as f64 / total as f64 * 100.0) as f32
                        } else {
                            0.0
                        };

                        emit_progress(
                            format!("{} ({}/{})", current_file, current, total),
                            percentage.clamp(0.0, 100.0),
                            "downloading_minecraft_general".to_string(),
                            current,
                            total,
                        );

                        println!(
                            "Progress: {}/{} - {} ({}%)",
                            current, total, current_file, percentage
                        );
                    },
                )
                .await;
        });
    }

    // Console
    {
        let emitter = emitter.clone();
        let emit_progress = emit_progress.clone();
        tokio::spawn(async move {
            emitter
                .on(Event::Console, move |line: String| {
                    println!("Minecraft: {}", line);
                    if line.contains("Installing") {
                        emit_progress(
                            format!("Installing: {}", line),
                            -1.0,
                            "installing_component".to_string(),
                            0,
                            0,
                        );
                    }
                })
                .await;
        });
    }

    emitter
}

fn get_loader_by_name(name: &str, loader_version: &str) -> Result<Box<dyn Loader>> {
    match name.to_lowercase().as_str() {
        "fabric" => Ok(Fabric(loader_version.to_string()).into()),
        "forge" => Ok(Forge(loader_version.to_string()).into()),
        "quilt" => Ok(Quilt(loader_version.to_string()).into()),
        "neoforge" => Ok(NeoForge(loader_version.to_string()).into()),
        _ => Err(anyhow!("Unsupported mod loader: {}", name)),
    }
}
