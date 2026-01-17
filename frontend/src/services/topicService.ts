import $api from './api';

export interface Topic {
	id: number;
	school: number;
	title: string;
	description: string;
	subject: number;
	subject_name: string;
	grade_level: number;
	quarter: number;
	questions_count: number;
	status: 'ready' | 'progress' | 'empty';
	author_name: string;
	created_at: string;
}

export interface TopicFilters {
	school: string;
	grade_level: number;
	quarter: number;
	subject?: string;
	search?: string;
}

export const TopicService = {
	getAll: async (params: TopicFilters) => {
		const { data } = await $api.get<Topic[]>('/topics/', { params });
		return data;
	},

	create: async (data: Partial<Topic>) => {
		const { data: response } = await $api.post<Topic>('/topics/', data);
		return response;
	},

	update: async (id: number, data: Partial<Topic>) => {
		const { data: response } = await $api.patch<Topic>(`/topics/${id}/`, data);
		return response;
	},

	delete: async (id: number) => {
		await $api.delete(`/topics/${id}/`);
	},

	// Массовое удаление (параллельные запросы)
	bulkDelete: async (ids: number[]) => {
		await Promise.all(ids.map(id => $api.delete(`/topics/${id}/`)));
	},

	// Трансфер (копирование/перемещение)
	transfer: async (payload: { topic_ids: number[], target_school_id: string, target_grade: number, mode: 'move' | 'copy' }) => {
		const { data } = await $api.post('/topics/transfer/', payload);
		return data;
	}
};