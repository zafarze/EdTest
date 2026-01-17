import $api from './api';

// --- ТИПЫ ДАННЫХ ---
export interface Badge {
	slug: string;
	name: string;
	score: string | number;
	color: string;
}

export interface StudentData {
	id: number;
	name: string;
	firstName: string;
	lastName: string;
	school: string;
	schoolId: number;
	grade: number;
	section: string;
	exam: string;
	day: number;
	score: number;
	badges: Badge[];
	avatar?: string;
}

export interface SchoolFilterOption {
	id: number;
	name: string;
	color_theme: string;
}

// Тип для Мета-данных (списки для фильтров)
export interface MonitoringMeta {
	availableGrades: number[];
	availableSections: string[];
	availableGats: string[];
	availableSubjects: { id: string; label: string; slug: string }[];
	schoolClasses?: Record<string, {
		id: number;
		name: string;
		color_theme: string;
		grades: number[];
		sections: string[];
		all_classes: string[];
	}>;
	pagination?: {
		page: number;
		limit: number;
		total: number;
		has_next: boolean;
	};
}

// Тип для статистики
export interface MonitoringStats {
	participants: number;
	avgScore: number;
}

// Тип для "Лидера" (динамический)
export interface LeaderInfo {
	key: string;      // Например: "leader_school"
	params: any;      // Параметры для перевода
	value: string;    // Значение (название школы или имя)
	type: 'school' | 'student' | 'class';
}

// Тип ответа от сервера
export interface RatingResponse {
	data: StudentData[];
	meta: MonitoringMeta;
	stats: MonitoringStats;
	leader: LeaderInfo;
}

// Тип фильтров, которые мы отправляем
export interface RatingFilters {
	page?: number;
	limit?: number;
	schoolIds?: number[];
	grades?: number[];
	sections?: string[];
	subjects?: string[];
	exams?: string[];
	days?: number[];
	lang?: string; // 🔥 Добавили поле для языка
}

export const MonitoringService = {
	// Получение рейтинга с фильтрацией
	getRating: async (filters: RatingFilters = {}): Promise<RatingResponse> => {
		const params = new URLSearchParams();

		if (filters.page) params.append('page', filters.page.toString());
		if (filters.limit) params.append('limit', filters.limit.toString());

		if (filters.schoolIds?.length) params.append('schools', filters.schoolIds.join(','));
		if (filters.grades?.length) params.append('grades', filters.grades.join(','));
		if (filters.sections?.length) params.append('sections', filters.sections.join(','));
		if (filters.exams?.length) params.append('exams', filters.exams.join(','));
		if (filters.days?.length) params.append('days', filters.days.join(','));
		if (filters.subjects?.length) params.append('subjects', filters.subjects.join(','));

		// 🔥 Конфигурация запроса с заголовком языка
		const config = {
			params,
			headers: filters.lang ? { 'Accept-Language': filters.lang } : {}
		};

		const { data } = await $api.get<RatingResponse>('/monitoring/rating/', config);
		return data;
	},

	// Получение списка школ (если нужно отдельно)
	getSchools: async () => {
		const { data } = await $api.get<SchoolFilterOption[]>('/schools/');
		return data;
	}
};