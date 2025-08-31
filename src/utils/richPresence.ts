import { invoke } from '@tauri-apps/api/core';

export async function startRichPresence() {
	try {
		await invoke('start_rich_presence');
	} catch (err) {
		console.error('Failed to start Discord RPC', err);
	}
}

export async function setActivity({
	title,
	artist,
	albumArt,
	current_time,
	total_time,
}: {
	title: string;
	artist: string;
	albumArt: string;
	current_time: number;
	total_time: number;
}) {
	try {
		await invoke('set_activity', {
			title,
			artist,
			albumArt,
			currentTime: current_time,
			totalTime: total_time,
		});
	} catch (err) {
		console.error('Failed to set Discord activity', err);
	}
}

export async function clearActivity() {
	try {
		await invoke('clear_activity');
	} catch (err) {
		console.error('Failed to clear Discord activity', err);
	}
}
