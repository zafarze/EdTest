import $api from '../api';
import { AuthResponse, User } from '../types';

export const authService = {
	// Вход в систему
	login: async (username: string, password: string) => {
		// Djoser стандартный путь: /auth/jwt/create/
		const response = await $api.post<AuthResponse>('auth/jwt/create/', { username, password });

		if (response.data.access) {
			localStorage.setItem('token', response.data.access);
		}
		return response.data;
	},

	// Получение текущего юзера
	getMe: async () => {
		const response = await $api.get<User>('auth/users/me/');
		return response.data;
	},

	// Ручной выход
	logout: () => {
		localStorage.removeItem('token');
		window.location.href = '/login';
	}
};