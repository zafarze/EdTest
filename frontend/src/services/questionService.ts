import $api from './api';

export interface Choice {
	id?: number;
	text: string;
	is_correct: boolean;
	image?: string | File | null; // URL или Файл
	previewUrl?: string; // Для фронтенда
}

export interface Question {
	id: number;
	text: string;
	difficulty: 'easy' | 'medium' | 'hard';
	question_type: 'single' | 'multiple';
	image?: string;
	choices: Choice[];
	topic: number | null;
}

export const QuestionService = {
	// Получить вопросы по ID темы
	getByTopic: async (topicId: number) => {
		const { data } = await $api.get<Question[]>(`/questions/?topic=${topicId}`);
		return data;
	},

	// Создать вопрос (с картинками)
	create: async (formData: FormData) => {
		const { data } = await $api.post<Question>('/questions/', formData, {
			headers: { 'Content-Type': 'multipart/form-data' }
		});
		return data;
	},

	// Обновить вопрос
	update: async (id: number, formData: FormData) => {
		const { data } = await $api.patch<Question>(`/questions/${id}/`, formData, {
			headers: { 'Content-Type': 'multipart/form-data' }
		});
		return data;
	},

	// Удалить вопрос
	delete: async (id: number) => {
		await $api.delete(`/questions/${id}/`);
	},

	// Скачать шаблон Excel
	downloadTemplate: async () => {
		const response = await $api.get('/questions/download_template/', {
			responseType: 'blob',
		});
		// Создаем ссылку для скачивания
		const url = window.URL.createObjectURL(new Blob([response.data]));
		const link = document.createElement('a');
		link.href = url;
		link.setAttribute('download', 'questions_template.xlsx');
		document.body.appendChild(link);
		link.click();
		link.remove();
	},

	// Импорт Excel
	importExcel: async (formData: FormData) => {
		const { data } = await $api.post<{ status: string, count: number }>('/questions/import_excel/', formData, {
			headers: { 'Content-Type': 'multipart/form-data' }
		});
		return data;
	}
};