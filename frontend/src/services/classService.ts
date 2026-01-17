import $api from './api';

export interface StudentClass {
	id: number;
	school: number;
	grade_level: number;
	section: string; // 'А', 'Б' и т.д.
	language: string;
	students_count?: number; // Если понадобится
}

export const ClassService = {
	// 🔥 ОБНОВЛЕНО: schoolId теперь необязательный (?)
	// Если передать ID, вернет классы школы. Если нет — вернет все классы (для админки).
	getAll: async (schoolId?: number) => {
		const params = schoolId ? { school_id: schoolId } : {};

		const { data } = await $api.get<StudentClass[] | { results: StudentClass[] }>('/classes/', { params });

		// Универсальная проверка (если бэкенд вернет массив или пагинацию)
		if (Array.isArray(data)) return data;
		return data.results || [];
	},

	create: async (data: Partial<StudentClass>) => {
		const { data: response } = await $api.post<StudentClass>('/classes/', data);
		return response;
	},

	update: async (id: number, data: Partial<StudentClass>) => {
		const { data: response } = await $api.patch<StudentClass>(`/classes/${id}/`, data);
		return response;
	},

	// Удаление одного конкретного класса
	delete: async (id: number) => {
		await $api.delete(`/classes/${id}/`);
	},

	// 🔥 Удаление всей параллели (например, удалить все 3-и классы)
	// Вызывает action delete_grade на бэкенде
	deleteGrade: async (schoolId: number, grade: number) => {
		await $api.delete(`/classes/delete_grade/?school_id=${schoolId}&grade=${grade}`);
	},

	// 🔥 Обновление структуры школы (мин/макс классы)
	updateSchoolSettings: async (schoolId: number, minGrade: number, maxGrade: number) => {
		const { data } = await $api.patch(`/schools/${schoolId}/`, {
			min_grade_level: minGrade,
			max_grade_level: maxGrade
		});
		return data;
	}
};