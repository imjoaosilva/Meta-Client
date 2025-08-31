use std::path::PathBuf;

pub struct MetaDirectories {
    pub base: PathBuf,
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

        let meta = base.join("meta");
        let libraries = meta.join("libraries");
        let assets = meta.join("assets");
        let versions = meta.join("versions");
        let java_versions = meta.join("java_versions");

        let caches = base.join("caches");
        let icons = caches.join("icons");
        let screenshots = caches.join("screenshots");

        let instances = base.join("instances");
        let default_instance = instances.join("MetaInstance");

        Ok(Self {
            base,
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
        std::fs::create_dir_all(&self.libraries)?;
        std::fs::create_dir_all(&self.assets)?;
        std::fs::create_dir_all(&self.versions)?;
        std::fs::create_dir_all(&self.java_versions)?;
        std::fs::create_dir_all(&self.icons)?;
        std::fs::create_dir_all(&self.screenshots)?;
        std::fs::create_dir_all(&self.default_instance.join("mods"))?;
        std::fs::create_dir_all(&self.default_instance.join("config"))?;
        std::fs::create_dir_all(&self.default_instance.join("saves"))?;
        Ok(())
    }
}
