import type { UserSettings } from '@/@types/launcher';

export class LauncherService {
	private static instance: LauncherService;
	private userSettings: UserSettings;

	constructor() {
		this.userSettings = this.loadUserSettings();
	}

	static getInstance(): LauncherService {
		if (!LauncherService.instance) {
			LauncherService.instance = new LauncherService();
		}
		return LauncherService.instance;
	}

	getUserSettings(): UserSettings {
		return { ...this.userSettings };
	}

	saveUserSettings(settings: Partial<UserSettings>): void {
		this.userSettings = { ...this.userSettings, ...settings };
		localStorage.setItem(
			'MetaLauncher_settings',
			JSON.stringify(this.userSettings),
		);
	}

	private loadUserSettings(): UserSettings {
		const defaultSettings: UserSettings = {
			username: 'MetaPlayer',
			allocatedRam: 4,
			authMethod: 'offline',
			clientToken: undefined,
		};

		try {
			const saved = localStorage.getItem('MetaLauncher_settings');
			if (saved) {
				const merged = {
					...defaultSettings,
					...JSON.parse(saved),
				} as UserSettings;
				if (!merged.clientToken) {
					merged.clientToken = this.generateClientToken();
					localStorage.setItem('MetaLauncher_settings', JSON.stringify(merged));
				}
				return merged;
			}
		} catch (error) {
			console.error('Error loading user settings:', error);
		}

		defaultSettings.clientToken = this.generateClientToken();
		try {
			localStorage.setItem(
				'MetaLauncher_settings',
				JSON.stringify(defaultSettings),
			);
		} catch {}
		return defaultSettings;
	}

	private generateClientToken(): string {
		// Generate URL-safe random token
		const bytes = new Uint8Array(24);
		if (typeof crypto !== 'undefined' && (crypto as any).getRandomValues) {
			(crypto as any).getRandomValues(bytes);
		} else {
			for (let i = 0; i < bytes.length; i++)
				bytes[i] = Math.floor(Math.random() * 256);
		}
		let binary = '';
		for (let i = 0; i < bytes.length; i++)
			binary += String.fromCharCode(bytes[i]);
		const base64 =
			typeof btoa === 'function'
				? btoa(binary)
				: Buffer.from(binary, 'binary').toString('base64');
		return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
	}
}
