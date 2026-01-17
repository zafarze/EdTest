import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languages = [
	{ code: 'ru', label: 'RU', flag: '🇷🇺' },
	{ code: 'tj', label: 'TJ', flag: '🇹🇯' },
	{ code: 'en', label: 'EN', flag: '🇺🇸' },
];

const LanguageSwitcher = () => {
	const { i18n } = useTranslation();

	return (
		<div className="flex bg-white/50 backdrop-blur-md p-1 rounded-xl border border-slate-200 shadow-sm">
			{languages.map((lang) => (
				<button
					key={lang.code}
					onClick={() => i18n.changeLanguage(lang.code)}
					className={`
            px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-1.5
            ${i18n.language === lang.code
							? 'bg-white text-indigo-600 shadow-md transform scale-105'
							: 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}
          `}
				>
					<span className="text-sm">{lang.flag}</span>
					<span>{lang.label}</span>
				</button>
			))}
		</div>
	);
};

export default LanguageSwitcher;