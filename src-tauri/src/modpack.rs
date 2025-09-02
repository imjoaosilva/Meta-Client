use crate::meta::MetaDirectories;
use reqwest::Client;
use serde::{Serialize, Deserialize};
use std::fs;
use sha1::{Sha1, Digest};
use tauri::AppHandle;
use tauri::Emitter;

#[derive(Deserialize, Serialize)]
struct Manifest {
    version: String,
    files: Vec<FileEntry>
}

#[derive(Deserialize, Serialize)]
struct FileEntry {
    path: String,
    sha1: String,
    size: u64,
    url: String
}

pub async fn modpack_required_update() -> anyhow::Result<bool> {
    let meta_dirs = MetaDirectories::new()?;
    let manifest_path = meta_dirs.meta.join("manifest.json");

    if !manifest_path.exists() {
        Ok(true)
    } else {
        let client = Client::new();
        let data = client
            .get("https://testez4.astralresources.com.br/api/v1/update/minecraft/manifest")
            .send()
            .await?
            .bytes()
            .await?;

        let remote: Manifest = serde_json::from_slice(&data)?;
        let local_file = fs::read(&manifest_path)?;
        let local: Manifest = serde_json::from_slice(&local_file)?;

        Ok(local.version != remote.version)
    }   
}

pub async fn download_modpack(app: AppHandle) -> anyhow::Result<()> {
    let meta_dirs = MetaDirectories::new()?;
    let manifest_path = meta_dirs.meta.join("manifest.json");

    let client = Client::new();
    let data = client
        .get("https://testez4.astralresources.com.br/api/v1/update/minecraft/manifest")
        .send()
        .await?
        .bytes()
        .await?;
    let remote: Manifest = serde_json::from_slice(&data)?;

    let local: Option<Manifest> = if manifest_path.exists() {
        let local_file = fs::read(&manifest_path)?;
        Some(serde_json::from_slice(&local_file)?)
    } else {
        None
    };

    let total_files = remote.files.len() as u64;
    let mut downloaded = 0u64;

    let emit_progress = {
        let app = app.clone();
        move |message: &str, percentage: f32, component: &str, current: u64, total: u64| {
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

    emit_progress("Preparing modpack update...", 0.0, "installing", 0, total_files);

    if let Some(local) = &local {
        for old_file in &local.files {
            if !remote.files.iter().any(|f| f.path == old_file.path) {
                let path_to_remove = meta_dirs.default_instance.join(&old_file.path);
                if path_to_remove.exists() {
                    fs::remove_file(&path_to_remove)?;
                }
            }
        }
    }

    for file in &remote.files {
        let target_path = meta_dirs.default_instance.join(&file.path);
        let mut need_download = true;

        if target_path.exists() {
            let mut hasher = Sha1::new();
            let bytes = fs::read(&target_path)?;
            hasher.update(&bytes);
            let hash = format!("{:x}", hasher.finalize());
            if hash == file.sha1 {
                need_download = false;
            }
        }

        if need_download {
            emit_progress(
                &format!("Downloading {}", file.path),
                (downloaded as f32 / total_files as f32) * 100.0,
                "downloading",
                downloaded,
                total_files,
            );

            let bytes = client.get(&file.url).send().await?.bytes().await?;
            if let Some(parent) = target_path.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::write(&target_path, &bytes)?;
            emit_progress(
                &format!("Installed {}", file.path),
                (downloaded as f32 / total_files as f32) * 100.0,
                "installing",
                downloaded,
                total_files,
            );
        } else {
            emit_progress(
                &format!("Up-to-date: {}", file.path),
                (downloaded as f32 / total_files as f32) * 100.0,
                "downloading",
                downloaded,
                total_files,
            );
        }

        downloaded += 1;
        emit_progress(
            &format!("Progress {}", file.path),
            (downloaded as f32 / total_files as f32) * 100.0,
            "downloading",
            downloaded,
            total_files,
        );
    }

    emit_progress("Download complete", 100.0, "launch", total_files, total_files);

    fs::write(&manifest_path, serde_json::to_vec_pretty(&remote)?)?;

    Ok(())
}
