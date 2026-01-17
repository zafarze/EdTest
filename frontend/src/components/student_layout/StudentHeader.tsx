import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, Menu, Globe, Check, LogOut, UserCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// Обрати внимание на путь к API, он может отличаться в зависимости от структуры папок
// Если папка student_layout внутри components, то путь верный:
import $api from "../../services/api";

interface HeaderProps {
	onLogout: () => void;
	onOpenMobileMenu: () => void;
}

const StudentHeader = ({ onLogout, onOpenMobileMenu }: HeaderProps) => {
	const location = useLocation();
	const { i18n } = useTranslation();

	// Определяем заголовок страницы
	const getPageTitle = () => {
		const path = location.pathname;
		if (path === '/student') return 'Дашборд';
		if (path.includes('/exams')) return 'Мои Экзамены';
		if (path.includes('/results')) return 'Результаты';
		return 'GAT Student';
	};

	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLLIElement>(null);
	const [isLangOpen, setIsLangOpen] = useState(false);
	const langRef = useRef<HTMLLIElement>(null);

	// Данные студента
	const [userData, setUserData] = useState({ fullName: 'Загрузка...', initial: 'U' });

	useEffect(() => {
		const storedUser = localStorage.getItem('user');
		if (storedUser) {
			try {
				const parsed = JSON.parse(storedUser);
				const fullName = (parsed.first_name || parsed.last_name)
					? `${parsed.first_name} ${parsed.last_name}`.trim()
					: parsed.username;
				setUserData({
					fullName: fullName || 'Ученик',
					initial: (fullName || parsed.username || 'U').charAt(0).toUpperCase()
				});
			} catch (e) {
				console.error(e);
			}
		}
	}, []);

	// Закрытие меню при клике вне
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
			if (langRef.current && !langRef.current.contains(event.target as Node)) setIsLangOpen(false);
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => { document.removeEventListener('mousedown', handleClickOutside); };
	}, []);

	// Языки
	const languages = [
		{ code: 'ru', label: 'Русский', flag: '🇷🇺' },
		{ code: 'tj', label: 'Тоҷикӣ', flag: '🇹🇯' },
		{ code: 'en', label: 'English', flag: '🇺🇸' },
	];
	const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

	const changeLanguage = (code: string) => {
		i18n.changeLanguage(code);
		setIsLangOpen(false);
	};

	return (
		<nav className="relative flex items-center justify-between px-6 py-3 mx-4 mt-4 transition-all shadow-lg shadow-slate-200 bg-white/80 backdrop-blur-xl rounded-2xl z-40">

			{/* ЛЕВАЯ ЧАСТЬ: Меню и Хлебные крошки */}
			<div className="flex items-center gap-4">
				<button onClick={onOpenMobileMenu} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
					<Menu size={20} />
				</button>
				<nav className="hidden sm:block">
					<ol className="flex flex-wrap pt-1 mr-12 bg-transparent rounded-lg">
						<li className="text-sm leading-normal text-slate-500 opacity-50">Student</li>
						<li className="text-sm leading-normal text-slate-700 pl-2 before:float-left before:pr-2 before:text-slate-600 before:content-['/']" aria-current="page">
							{getPageTitle()}
						</li>
					</ol>
					<h6 className="mb-0 font-bold text-slate-800 capitalize text-base">{getPageTitle()}</h6>
				</nav>
			</div>

			{/* ПРАВАЯ ЧАСТЬ */}
			<div className="flex items-center mt-2 grow sm:mt-0 sm:mr-6 md:mr-0 lg:flex lg:basis-auto justify-end">

				{/* Поиск (декоративный пока) */}
				<div className="flex items-center md:ml-auto md:pr-4 hidden md:flex">
					<div className="relative flex flex-wrap items-stretch w-full transition-all rounded-xl">
						<span className="text-sm absolute z-50 -ml-px flex h-full items-center whitespace-nowrap rounded-xl rounded-tr-none rounded-br-none bg-transparent py-2 px-2.5 text-center font-normal text-slate-500">
							<Search size={16} strokeWidth={2.5} />
						</span>
						<input type="text" className="pl-9 text-sm w-full relative -ml-px block min-w-0 flex-auto rounded-xl border border-transparent bg-slate-50 focus:bg-white focus:shadow-md focus:shadow-indigo-500/10 py-2 pr-3 text-gray-700 transition-all placeholder:text-gray-400 focus:outline-none focus:ring-0 shadow-sm" placeholder="Поиск..." />
					</div>
				</div>

				<ul className="flex flex-row justify-end pl-0 mb-0 list-none md-max:w-full gap-4 items-center">

					{/* Язык */}
					<li className="relative flex items-center" ref={langRef}>
						<button onClick={() => setIsLangOpen(!isLangOpen)} className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${isLangOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'}`}>
							<Globe size={18} strokeWidth={2} /><span className="text-xs font-bold uppercase">{currentLang.code}</span>
						</button>
						{isLangOpen && (
							<div className="absolute top-12 right-0 w-40 bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-slate-100 p-1.5 z-50 animate-fade-in-up">
								{languages.map((lang) => (
									<button key={lang.code} onClick={() => changeLanguage(lang.code)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${i18n.language === lang.code ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
										<div className="flex items-center gap-3"><span className="text-lg leading-none">{lang.flag}</span><span>{lang.label}</span></div>
										{i18n.language === lang.code && <Check size={14} className="text-indigo-600" />}
									</button>
								))}
							</div>
						)}
					</li>

					{/* Уведомления */}
					<li className="relative flex items-center">
						<button className="p-0 text-slate-500 hover:text-indigo-600 transition-colors">
							<Bell size={18} strokeWidth={2} />
						</button>
					</li>

					{/* Профиль */}
					<li className="relative flex items-center" ref={dropdownRef}>
						<button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 shadow-md hover:shadow-lg transition-all transform hover:scale-105 active:scale-95 cursor-pointer ml-2">
							<div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
								<span className="font-bold text-transparent bg-clip-text bg-gradient-to-tr from-indigo-600 to-purple-600 text-sm">
									{userData.initial}
								</span>
							</div>
						</button>
						{isDropdownOpen && (
							<div className="absolute top-14 right-0 w-56 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 p-2 z-50 animate-fade-in-up origin-top-right">
								<div className="px-4 py-3 border-b border-slate-50 mb-1">
									<p className="text-sm font-bold text-slate-800">{userData.fullName}</p>
									<p className="text-xs text-slate-400 font-medium">Ученик</p>
								</div>
								<div className="space-y-1">
									<button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all"><UserCircle size={16} /><span>Профиль</span></button>
								</div>
								<div className="my-2 border-t border-slate-50"></div>
								<button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all"><LogOut size={16} /><span>Выйти</span></button>
							</div>
						)}
					</li>
				</ul>
			</div>
		</nav>
	);
};

export default StudentHeader;