import $api from './api';

export interface Subject {
	id: number;
	name: string;      // Русское название (основное)
	name_tj?: string;  // Таджикское
	name_en?: string;  // Английское
	abbreviation: string;
	category: string;
	questionsCount: number;
	isActive: boolean;
	color: string;
	iconType: string;
}

export const SubjectService = {
	getAll: async () => {
		const { data } = await $api.get<Subject[]>('/subjects/');
		return data;
	},

	create: async (data: Partial<Subject>) => {
		const { data: response } = await $api.post<Subject>('/subjects/', data);
		return response;
	},

	update: async (id: number, data: Partial<Subject>) => {
		const { data: response } = await $api.put<Subject>(`/subjects/${id}/`, data);
		return response;
	},

	delete: async (id: number) => {
		await $api.delete(`/subjects/${id}/`);
	}
};