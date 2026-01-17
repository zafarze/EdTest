import $api from './api';

// Интерфейс строго соответствует Django Serializer
export interface Quarter {
	id: number;
	name: string;
	name_tj?: string;
	name_en?: string;
	start_date: string;
	end_date: string;
	is_active: boolean;
	school_year?: number;
	school_year_name?: string;

	// Поля для UI (вычисляемые)
	progress: number;
	status: 'completed' | 'active' | 'upcoming';
}

// Хелпер для расчета прогресса
const calculateMeta = (start: string, end: string, isActive: boolean) => {
	if (!start || !end) return { progress: 0, status: 'upcoming' as const };

	const now = new Date().getTime();
	const s = new Date(start).getTime();
	const e = new Date(end).getTime();
	const total = e - s;
	const passed = now - s;

	let progress = 0;
	if (total > 0) {
		progress = Math.min(100, Math.max(0, Math.round((passed / total) * 100)));
	}

	let status: 'completed' | 'active' | 'upcoming' = 'upcoming';
	if (isActive) status = 'active';
	else if (progress >= 100) status = 'completed';
	else if (progress > 0) status = 'active';

	return { progress, status };
};

export const QuarterService = {
	getAll: async () => {
		// 🔥 FIX: Используем <any>, чтобы принять и массив, и объект пагинации
		const { data } = await $api.get<any>('/quarters/');

		let items: Quarter[] = [];

		// 🔥 УМНЫЙ КОД: Проверка структуры ответа Django
		if (data.results && Array.isArray(data.results)) {
			items = data.results;
		} else if (Array.isArray(data)) {
			items = data;
		}

		// Обогащаем данные для UI (расчет прогресса)
		return items.map((q: Quarter) => {
			const { progress, status } = calculateMeta(q.start_date, q.end_date, q.is_active);
			return { ...q, progress, status };
		});
	},

	create: async (data: Partial<Quarter>) => {
		const { data: response } = await $api.post<Quarter>('/quarters/', data);
		return response;
	},

	update: async (id: number, data: Partial<Quarter>) => {
		const { data: response } = await $api.patch<Quarter>(`/quarters/${id}/`, data);
		return response;
	},

	delete: async (id: number) => {
		await $api.delete(`/quarters/${id}/`);
	}
};