import $api from './api';

// Описываем тип данных
export interface SchoolYear {
	id: number;
	name: string;
	name_tj?: string;
	name_en?: string;
	start: string;
	end: string;
	isActive: boolean;
	studentsCount: number;
	weeksTotal: number;
	daysLeft: number;
}

export const YearService = {
	getAll: async () => {
		const { data } = await $api.get<any>('/years/');

		// 🔥 FIX: Поддержка пагинации DRF
		if (data.results && Array.isArray(data.results)) {
			return data.results as SchoolYear[];
		} else if (Array.isArray(data)) {
			return data as SchoolYear[];
		}
		return [];
	},

	create: async (data: Partial<SchoolYear>) => {
		const { data: response } = await $api.post<SchoolYear>('/years/', data);
		return response;
	},

	update: async (id: number, data: Partial<SchoolYear>) => {
		const { data: response } = await $api.patch<SchoolYear>(`/years/${id}/`, data);
		return response;
	},

	delete: async (id: number) => {
		await $api.delete(`/years/${id}/`);
	}
};