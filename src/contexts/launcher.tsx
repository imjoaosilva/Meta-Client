import type { MicrosoftAccount, UserSettings } from '@/@types/launcher';
import AuthService from '@/services/auth';
import { LauncherService } from '@/services/launcher';
import { invoke } from '@tauri-apps/api/core';
import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from 'react';
import { listen } from '@tauri-apps/api/event';

type ProgressStatus =
	| 'launch'
	| 'launching'
	| 'downloading'
	| 'installing'
	| 'done'
	| 'idle';

interface LauncherContextType {
	userSettings: UserSettings;
	updateUserSettings: (settings: Partial<UserSettings>) => void;
	Logout: () => void;
	LaunchMinecraft: () => void;
	progressValue: number;
	progressStatus: ProgressStatus;
	progressMessage: string;
	progressCurrent: number;
	progressTotal: number;
	globalLoading: boolean;
	setGlobalLoading: (value: boolean) => void;
}

const LauncherContext = createContext<LauncherContextType | undefined>(
	undefined,
);

export function LauncherProvider({ children }: { children: ReactNode }) {
	const launcherService = LauncherService.getInstance();
	const [userSettings, setUserSettings] = useState<UserSettings>(
		{} as UserSettings,
	);
	const [progressValue, setProgressValue] = useState(0);
	const [progressMessage, setProgressMessage] = useState('');
	const [progressCurrent, setProgressCurrent] = useState(0);
	const [progressTotal, setProgressTotal] = useState(0);
	const [progressStatus, setProgressStatus] =
		useState<ProgressStatus>('launch');
	const [globalLoading, setGlobalLoading] = useState(true);

	useEffect(() => {
		const settings = launcherService.getUserSettings();
		setUserSettings(settings);
	}, []);

	useEffect(() => {
		const setupProgressListener = async () => {
			const unlisten = await listen<{
				message: string;
				percentage: number;
				component: string;
				current: number;
				total: number;
			}>('minecraft-progress', (event) => {
				const { message, percentage, current, total, component } =
					event.payload;

				setProgressMessage(message);
				setProgressCurrent(current);
				setProgressTotal(total);

				if (total > 0) {
					setProgressValue(Math.round((current / total) * 100));
				} else if (percentage >= 0) {
					setProgressValue(Math.round(percentage));
				} else {
					setProgressValue(0);
				}

				if (component.includes('downloading')) setProgressStatus('downloading');
				else if (component.includes('installing'))
					setProgressStatus('installing');
				else if (component.includes('launching') || progressStatus === 'launch')
					setProgressStatus('launching');
				else if (component.includes('done')) setProgressStatus('done');
			});

			return unlisten;
		};

		setupProgressListener();
	}, [progressStatus]);

	useEffect(() => {
		let unlistenStarted: (() => void) | undefined;
		let unlistenExited: (() => void) | undefined;

		const setupMinecraftListeners = async () => {
			unlistenStarted = await listen('minecraft-started', () => {
				setProgressStatus('done');
				setProgressValue(100);
			});

			unlistenExited = await listen('minecraft-exited', () => {
				setProgressStatus('launch');
				setProgressValue(0);
				setProgressCurrent(0);
				setProgressTotal(0);
				setProgressMessage('');
			});
		};

		setupMinecraftListeners();

		return () => {
			unlistenStarted?.();
			unlistenExited?.();
		};
	}, []);

	const updateUserSettings = (settings: Partial<UserSettings>) => {
		const newSettings = { ...userSettings, ...settings };
		launcherService.saveUserSettings(newSettings);
		setUserSettings(newSettings);
	};

	const Logout = () => {
		localStorage.removeItem('MetaLauncher_settings');
		window.location.href = '/';
	};

	const LaunchMinecraft = async () => {
		const transformedSettings = transformUserSettingsForBackend(userSettings);
		setProgressStatus('launching');
		await invoke('launch_modpack', { settings: transformedSettings });
	};

	const transformUserSettingsForBackend = (settings: UserSettings) => ({
		username: settings.username,
		allocatedRam: settings.allocatedRam,
		authMethod: settings.authMethod,
		microsoftAccount: settings.microsoftAccount || null,
		clientToken: settings.clientToken || null,
	});

	useEffect(() => {
		if (
			userSettings.authMethod !== 'microsoft' ||
			!userSettings.microsoftAccount
		)
			return;

		const authService = AuthService.getInstance();

		const doRefresh = async () => {
			try {
				const refreshedAccount = await authService.refreshMicrosoftToken(
					userSettings.microsoftAccount!.refreshToken,
				);
				if (refreshedAccount) {
					updateUserSettings({
						authMethod: 'microsoft',
						microsoftAccount: refreshedAccount,
						username: refreshedAccount.username,
					});
				}
			} catch (error) {
				console.error('Token refresh failed:', error);
			}
		};

		const nowSec = Math.floor(Date.now() / 1000);
		const bufferSec = 120;
		const secsUntilExpiry = userSettings.microsoftAccount.exp - nowSec;
		const secsUntilRefresh = Math.max(0, secsUntilExpiry - bufferSec);

		if (secsUntilRefresh === 0) void doRefresh();

		const timeoutId = setTimeout(
			() => void doRefresh(),
			secsUntilRefresh * 1000,
		);
		return () => clearTimeout(timeoutId);
	}, [userSettings.authMethod, userSettings.microsoftAccount?.exp]);

	useEffect(() => {
		const setupTokenRefreshListener = async () => {
			const unlisten = await listen<MicrosoftAccount>(
				'microsoft-token-refreshed',
				(event) => {
					const refreshedAccount = event.payload;
					updateUserSettings({
						authMethod: 'microsoft',
						microsoftAccount: refreshedAccount,
						username: refreshedAccount.username,
					});
				},
			);
			return unlisten;
		};
		const cleanupPromise = setupTokenRefreshListener();
		return () => {
			cleanupPromise.then((cleanup) => cleanup?.());
		};
	}, []);

	return (
		<LauncherContext.Provider
			value={{
				userSettings,
				updateUserSettings,
				Logout,
				LaunchMinecraft,
				progressValue,
				progressStatus,
				progressMessage,
				progressCurrent,
				progressTotal,
				globalLoading,
				setGlobalLoading,
			}}
		>
			{children}
		</LauncherContext.Provider>
	);
}

export function useLauncher() {
	const context = useContext(LauncherContext);
	if (!context)
		throw new Error('useLauncher must be used within a LauncherProvider');
	return context;
}
