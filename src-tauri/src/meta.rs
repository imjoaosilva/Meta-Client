use serde::Deserialize;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
struct SettingsConfig {
    path: Option<String>,
}

pub struct MetaDirectories {
    pub base: PathBuf,
    pub root_dir: PathBuf,
    pub meta: PathBuf,
    pub libraries: PathBuf,
    pub assets: PathBuf,
    pub versions: PathBuf,
    pub java_versions: PathBuf,
    pub caches: PathBuf,
    pub icons: PathBuf,
    pub screenshots: PathBuf,
    pub instances: PathBuf,
    pub default_instance: PathBuf,
}

impl MetaDirectories {
    pub fn new() -> Result<Self, anyhow::Error> {
        let base = dirs::data_dir().unwrap().join("MetaLauncher");
        let settings_path = base.join("settings.json");
        let mut root_dir = base.clone();

        if let Ok(contents) = fs::read_to_string(&settings_path) {
            if let Ok(cfg) = serde_json::from_str::<SettingsConfig>(&contents) {
                if let Some(path) = cfg.path {
                    if !path.trim().is_empty() {
                        root_dir = PathBuf::from(path);
                    }
                }
            }
        }

        let meta = root_dir.join("meta");
        let libraries = meta.join("libraries");
        let assets = meta.join("assets");
        let versions = meta.join("versions");
        let java_versions = meta.join("java_versions");

        let caches = root_dir.join("caches");
        let icons = caches.join("icons");
        let screenshots = caches.join("screenshots");

        let instances = root_dir.join("instances");
        let default_instance = instances.join("MetaInstance");

        Ok(Self {
            base,
            root_dir,
            meta,
            libraries,
            assets,
            versions,
            java_versions,
            caches,
            icons,
            screenshots,
            instances,
            default_instance,
        })
    }

    pub fn ensure(&self) -> std::io::Result<()> {
        std::fs::create_dir_all(&self.base)?;

        let settings_path = self.base.join("settings.json");
        if !settings_path.exists() {
            let default_contents = serde_json::json!({
                "path": self.root_dir.to_string_lossy().to_string()
            });
            let serialized = serde_json::to_string_pretty(&default_contents)?;
            fs::write(settings_path, serialized)?;
        }

        std::fs::create_dir_all(&self.meta)?;
        std::fs::create_dir_all(&self.libraries)?;
        std::fs::create_dir_all(&self.assets)?;
        std::fs::create_dir_all(&self.versions)?;
        std::fs::create_dir_all(&self.java_versions)?;
        std::fs::create_dir_all(&self.caches)?;
        std::fs::create_dir_all(&self.icons)?;
        std::fs::create_dir_all(&self.screenshots)?;
        std::fs::create_dir_all(&self.default_instance.join("mods"))?;
        std::fs::create_dir_all(&self.default_instance.join("config"))?;
        std::fs::create_dir_all(&self.default_instance.join("saves"))?;
        Ok(())
    }

    pub fn set_root_dir(&mut self, new_root: PathBuf) -> std::io::Result<()> {
        self.root_dir = new_root.clone();

        self.meta = new_root.join("meta");
        self.libraries = self.meta.join("libraries");
        self.assets = self.meta.join("assets");
        self.versions = self.meta.join("versions");
        self.java_versions = self.meta.join("java_versions");

        self.caches = new_root.join("caches");
        self.icons = self.caches.join("icons");
        self.screenshots = self.caches.join("screenshots");

        self.instances = new_root.join("instances");
        self.default_instance = self.instances.join("MetaInstance");

        self.ensure()?;

        let settings_path = self.base.join("settings.json");
        let default_contents = serde_json::json!({
            "path": new_root.to_string_lossy().to_string()
        });
        let serialized = serde_json::to_string_pretty(&default_contents)?;
        fs::write(settings_path, serialized)?;

        Ok(())
    }

    pub fn get_root_dir(&self) -> &PathBuf {
        &self.root_dir
    }
}
