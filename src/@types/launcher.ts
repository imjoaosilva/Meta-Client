export interface MicrosoftAccount {
	xuid: string;
	exp: number;
	uuid: string;
	username: string;
	accessToken: string;
	refreshToken: string;
	clientId: string;
}

export interface UserSettings {
	username: string;
	allocatedRam: number; // in GB
	authMethod: 'offline' | 'microsoft';
	microsoftAccount?: MicrosoftAccount;
	clientToken?: string;
}
