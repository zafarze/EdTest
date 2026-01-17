import $api from './api';

// --- ТИПЫ ДАННЫХ ---

export interface ExamSettings {
	isAdaptive: boolean;
	lockdownMode: boolean;
	emotionalCheck: boolean;
	smartSeating: boolean;
	aiAuditPassed: boolean;
	allowAppeals: boolean;
	collaborators: number[];
}

export interface TestPayload {
	title: string;
	type: string;
	subject_ids: number[];
	school: number;
	quarter: number;
	gat_round: number;
	gat_day: number;
	class_ids: number[];
	status: string;
	date: string;
	duration: number;
	settings: ExamSettings;
}

// Основной интерфейс Экзамена (то, что приходит с бэкенда)
export interface Exam {
	id: number;
	title: string;
	type: 'online' | 'offline' | 'cambridge_ai';

	subject_ids: number[];
	subjects_data?: { name: string, color: string }[]; // Для отображения цветных бейджиков

	school: number;
	school_name?: string;
	quarter: number;
	gat_round: number;
	gat_day: number;

	class_ids: number[];
	classes_names?: string[]; // Названия классов (5А, 5Б...)

	status: 'planned' | 'active' | 'grading' | 'finished';
	date: string;
	duration: number;
	variants_count: number;
	settings: ExamSettings;
	questions_count?: number;
	appeals_count?: number;
}

// --- САМ СЕРВИС ---

export const ExamService = {
	// 1. Получить все экзамены
	getAll: async () => {
		const { data } = await $api.get<Exam[]>('/exams/');
		return data;
	},

	// 2. Получить один экзамен по ID
	getById: async (id: number) => {
		const { data } = await $api.get<Exam>(`/exams/${id}/`);
		return data;
	},

	// 3. Создать новый
	create: async (payload: Partial<TestPayload>) => {
		const { data } = await $api.post<Exam>('/exams/', payload);
		return data;
	},

	// 4. Обновить существующий
	update: async (id: number, payload: Partial<TestPayload>) => {
		const { data } = await $api.put<Exam>(`/exams/${id}/`, payload);
		return data;
	},

	// 5. Удалить
	delete: async (id: number) => {
		await $api.delete(`/exams/${id}/`);
	},

	// --- ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ (из твоего старого файла) ---

	// Генерация буклета
	downloadBooklet: async (examId: number, classId: number) => {
		return $api.get('booklets/generate_class_booklet/', {
			params: { exam_id: examId, class_id: classId },
			responseType: 'blob'
		});
	},

	// Загрузка файла (скан или Excel)
	uploadFile: async (file: File, mode: 'scan' | 'scores' | 'answers', examId: number) => {
		const formData = new FormData();
		formData.append('file', file);
		formData.append('mode', mode);
		formData.append('exam_id', examId.toString());

		return $api.post('upload/', formData, {
			headers: { 'Content-Type': 'multipart/form-data' },
		});
	}
};