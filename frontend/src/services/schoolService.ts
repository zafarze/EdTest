import api from './api';

// Типизация ответа с пагинацией от Django REST Framework
interface PaginatedResponse<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
}

export interface School {
	id: number;
	custom_id: string;
	slug?: string; // Сделал опциональным, т.к. бэк генерирует сам
	students_count?: number;
	phone: string;
	email: string;
	logo: string | null;
	banner: string | null;
	name: string;
	address: string;
	name_tj?: string;
	address_tj?: string;
	name_en?: string;
	address_en?: string;
}

export const SchoolService = {
	/**
	 * Получает ВСЕ школы, автоматически проходя по страницам пагинации.
	 */
	getAll: async (): Promise<School[]> => {
		let allSchools: School[] = [];
		let nextUrl: string | null = '/schools/';

		try {
			while (nextUrl) {
				// Если nextUrl — полный URL (http...), обрезаем его до пути API, если api настроен с baseURL
				// Но обычно axios с baseURL корректно обрабатывает относительные пути, а DRF возвращает полные.
				// Для надежности передаем URL как есть, если это не первая страница.

				const response = await api.get<PaginatedResponse<School> | School[]>(nextUrl);
				const data = response.data;

				// 1. Сценарий с пагинацией (стандарт DRF)
				if ('results' in data && Array.isArray(data.results)) {
					allSchools = [...allSchools, ...data.results];
					// DRF возвращает полный URL (http://domain/api/schools/?page=2).
					// Нам нужно корректно обработать переход.
					// Если используем axios instance с baseURL, лучше передавать относительный путь или полный URL.
					nextUrl = data.next;
				}
				// 2. Сценарий без пагинации (возвращается сразу массив)
				else if (Array.isArray(data)) {
					allSchools = data;
					nextUrl = null; // Больше страниц нет
				}
				// 3. Непонятный формат
				else {
					nextUrl = null;
				}
			}
		} catch (error) {
			console.error("Error fetching schools:", error);
			throw error;
		}

		return allSchools;
	},

	/**
	 * Проверяет, существует ли школа с таким custom_id
	 * Использует API поиска для оптимизации (чтобы не качать все школы)
	 */
	checkExists: async (customId: string): Promise<boolean> => {
		try {
			// Используем SearchFilter из бэкенда (?search=...)
			const { data } = await api.get<PaginatedResponse<School> | School[]>('/schools/', {
				params: { search: customId }
			});

			let results: School[] = [];
			if ('results' in data && Array.isArray(data.results)) {
				results = data.results;
			} else if (Array.isArray(data)) {
				results = data;
			}

			// Ищем точное совпадение, так как поиск может быть нечетким (например "01" найдет "001" и "012")
			return results.some(s => s.custom_id.trim().toLowerCase() === customId.trim().toLowerCase());
		} catch (error) {
			console.warn("Failed to check duplicate ID:", error);
			return false; // В случае ошибки сети не блокируем создание, полагаемся на бэкенд
		}
	},

	create: async (formData: FormData) => {
		// --- ВАЛИДАЦИЯ НА ДУБЛИКАТЫ (ФРОНТЕНД) ---
		const customId = formData.get('custom_id');
		if (customId && typeof customId === 'string') {
			const exists = await SchoolService.checkExists(customId);
			if (exists) {
				// Выбрасываем ошибку, которую можно поймать в UI и показать алерт
				throw new Error(`Школа с ID "${customId}" уже существует! Введите другой ID.`);
			}
		}
		// ------------------------------------------

		const { data } = await api.post<School>('/schools/', formData, {
			headers: { 'Content-Type': 'multipart/form-data' },
		});
		return data;
	},

	update: async (id: number, formData: FormData) => {
		// При обновлении проверка сложнее: мы можем оставить тот же ID (свой), но не чужой.
		// Чтобы не усложнять, полагаемся на бэкенд или проверяем, не принадлежит ли ID другой школе.
		// Для простоты пока без блокировки, но можно добавить по аналогии, исключая текущий id.

		const { data } = await api.patch<School>(`/schools/${id}/`, formData, {
			headers: { 'Content-Type': 'multipart/form-data' },
		});
		return data;
	},

	delete: async (id: number) => {
		await api.delete(`/schools/${id}/`);
	}
};