import $api from '../api';
import { ScanResult, ExamVariant } from '../types';

export const scanService = {
	// 1. Загрузка скана (File -> OMR Result)
	uploadScan: async (file: File, variantId: number) => {
		const formData = new FormData();
		formData.append('scanned_image', file);
		formData.append('exam_variant', variantId.toString());

		// Используем post запрос. 
		// Важно: браузер сам выставит boundary для multipart/form-data, 
		// поэтому Content-Type мы тут явно сбрасываем или даем axios решить.
		const response = await $api.post<ScanResult>('api/scans/', formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		});
		return response.data;
	},

	// 2. Получение истории сканирований
	getAllResults: async () => {
		const response = await $api.get<ScanResult[]>('api/scans/');
		return response.data;
	},

	// 3. Получение списка вариантов (для выпадающего списка при загрузке)
	getVariants: async () => {
		const response = await $api.get<ExamVariant[]>('api/variants/');
		return response.data;
	}
};