import $api from './api';

export interface Student {
	id: number;
	custom_id: string;
	first_name_ru: string;
	last_name_ru: string;
	first_name_tj: string;
	last_name_tj: string;
	first_name_en: string;
	last_name_en: string;
	username: string;
	status: 'active' | 'blocked' | 'graduated';
	password?: string;
	is_online: boolean;
	last_login: string;
	class_name: string;
	gender: 'male' | 'female';
}

export const StudentService = {
	getAll: async (params: any) => {
		const response = await $api.get<Student[]>('/students/', { params });
		return response.data;
	},

	create: async (data: any) => {
		const response = await $api.post('/students/', data);
		return response.data;
	},

	update: async (id: number, data: any) => {
		const response = await $api.patch(`/students/${id}/`, data);
		return response.data;
	},

	bulkDelete: async (ids: number[]) => {
		const response = await $api.post('/students/bulk-delete/', { ids });
		return response.data;
	},

	transfer: async (data: { ids: number[], type: string, target_class_id: string | null }) => {
		const response = await $api.post('/students/transfer/', data);
		return response.data;
	},

	resetPassword: async (id: number, password: string) => {
		const response = await $api.post(`/students/${id}/reset-password/`, { password });
		return response.data;
	},

	bulkGenerateCredentials: async (ids: number[]) => {
		const response = await $api.post('/students/bulk-generate-credentials/', { ids });
		return response.data;
	},

	previewImport: async (formData: FormData) => {
		const response = await $api.post('/students/preview-import/', formData, {
			headers: { 'Content-Type': 'multipart/form-data' }
		});
		return response.data;
	},

	importExcel: async (formData: FormData) => {
		const response = await $api.post('/students/import-excel/', formData, {
			headers: { 'Content-Type': 'multipart/form-data' }
		});
		return response.data;
	},

	// 🔥 ВАЖНО: responseType: 'blob' для Excel
	exportExcel: async (params: URLSearchParams) => {
		const response = await $api.get(`/students/export-excel/?${params.toString()}`, {
			responseType: 'blob'
		});
		return response.data;
	},

	// 🔥 ВАЖНО: responseType: 'blob' для PDF (Иначе файл придет битым)
	exportPdfCards: async (params: URLSearchParams) => {
		const response = await $api.get(`/students/export-pdf-cards/?${params.toString()}`, {
			responseType: 'blob'
		});
		return response.data;
	},

	downloadTemplate: async () => {
		const response = await $api.get(`/students/export-excel/?ids=0`, {
			responseType: 'blob'
		});
		return response.data;
	}
};