import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Импорт JSON файлов с переводами
//
import ru from './locales/ru.json';
import tj from './locales/tj.json';
import en from './locales/en.json';

i18n
	.use(LanguageDetector) // Автоматически определяет язык пользователя (браузер, localStorage)
	.use(initReactI18next) // Интеграция с React
	.init({
		resources: {
			ru: { translation: ru },
			tj: { translation: tj },
			en: { translation: en }
		},

		// Язык по умолчанию, если не удалось определить или перевод отсутствует
		fallbackLng: 'ru',

		// 🔥 ВАЖНО: Список поддерживаемых языков
		supportedLngs: ['ru', 'tj', 'en'],

		// Разрешает неточные совпадения (например, если браузер 'ru-RU', включится 'ru')
		nonExplicitSupportedLngs: true,

		// Настройки детектора языка
		detection: {
			// Где искать язык и куда сохранять выбор пользователя
			order: ['localStorage', 'cookie', 'navigator'],
			// Куда сохранять выбранный язык (чтобы запомнить выбор)
			caches: ['localStorage', 'cookie'],
		},

		interpolation: {
			escapeValue: false // React сам защищает от XSS атак
		},

		// Опционально: вывод отладочной информации в консоль (удобно при разработке)
		// debug: true, 
	});

export default i18n;