// src/services/journalService.ts

// Тип записи в журнале
export interface JournalEntry {
	id: number;
	student: {
		id: number;
		name: string;
		avatar?: string;
	};
	className: string;
	subject: string;
	examDate: string;
	score: number;
	grade: number | string;
	status: 'passed' | 'failed' | 'absent';
	topicsMastery: number;
}

// Интерфейс для фильтров (Type Safety)
export interface JournalFilters {
	schoolId?: string | number;
	grade?: string | number;
	section?: string;
	subject?: string;
	examDate?: string;
}

// Имитация задержки сервера
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const JournalService = {
	// Получение данных журнала (Mock)
	getJournal: async (filters: JournalFilters): Promise<JournalEntry[]> => {
		await delay(600); // Оптимизировал время ожидания

		// Генерируем ~25 учеников
		return Array.from({ length: 25 }, (_, i) => {
			const score = Math.floor(Math.random() * (100 - 35) + 35); // Балл 35-100

			// Расчет оценки
			let grade: number | string = 2;
			let status: 'passed' | 'failed' | 'absent' = 'failed';

			if (score >= 90) { grade = 5; status = 'passed'; }
			else if (score >= 70) { grade = 4; status = 'passed'; }
			else if (score >= 50) { grade = 3; status = 'passed'; }

			return {
				id: i + 1,
				student: {
					id: 202600 + i,
					name: `Ученик ${i + 1} Фамилия`,
					avatar: undefined
				},
				className: filters.grade ? `${filters.grade}-${filters.section || 'А'}` : '11-А',
				subject: filters.subject || 'math',
				examDate: filters.examDate || '12.01.2026',
				score: score,
				grade: grade,
				status: status,
				topicsMastery: Math.floor(Math.random() * 30 + 70) // 70-100%
			};
		}).sort((a, b) => a.student.name.localeCompare(b.student.name));
	}
};