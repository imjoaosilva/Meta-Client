import axios from 'axios';

export const api = axios.create({
	//baseURL: 'https://c820416b84b7.ngrok-free.app/api/v1/',
	baseURL: 'http://localhost:3000/api/v1/',
});

api.interceptors.request.use(async (config) => {
	const token = localStorage.getItem('meta_token');

	if (token) {
		config.headers.authorization = `Bearer ${token}`;
	}

	return config;
});

api.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		if (error.response?.status === 500 || error.response?.status === 403) {
			window.location.href = '/';
		}
		return Promise.reject(error);
	},
);
