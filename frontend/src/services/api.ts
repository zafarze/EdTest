import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// URL API
export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const $api = axios.create({
	baseURL: API_URL,
	headers: {
		'Content-Type': 'application/json',
	}
});

// --- REQUEST INTERCEPTOR ---
// В Axios v1+ для интерцепторов нужно использовать InternalAxiosRequestConfig
$api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
	const token = localStorage.getItem('token');

	if (token) {
		if (!config.headers) {
			// В InternalAxiosRequestConfig headers обязательны, но мы инициализируем их если вдруг нет
			config.headers = {} as any;
		}
		// Принудительно указываем заголовок
		(config.headers as any).Authorization = `JWT ${token}`;
	}
	return config;
});

// --- RESPONSE INTERCEPTOR ---
$api.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		const originalRequest = error.config as InternalAxiosRequestConfig & { _isRetry?: boolean };

		if (error.response?.status === 401 && originalRequest && !originalRequest._isRetry) {
			originalRequest._isRetry = true;
			console.warn("⚠️ [Auth] Сессия истекла или токен невалиден. Выход...");

			localStorage.removeItem('token');
			window.location.href = '/login';
		}

		throw error;
	}
);

export default $api;