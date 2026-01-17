import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
	Search, Settings, Bell, Menu, Globe, Check, Info,
	AlertTriangle, CheckCircle, LogOut, UserCircle, PlusCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Импортируем настроенный API
import $api from "../services/api";

interface HeaderProps {
	onLogout: () => void;
	onOpenMobileMenu: () => void;
}

const Header = ({ onLogout, onOpenMobileMenu }: HeaderProps) => {
	const location = useLocation();
	const pathSegment = location.pathname.split('/').pop() || 'admin';
	const { i18n, t } = useTranslation();

	// Перевод заголовка страницы
	const translatedTitle = t(`header.titles.${pathSegment}`, { defaultValue: pathSegment.charAt(0).toUpperCase() + pathSegment.slice(1) });

	// --- СОСТОЯНИЯ ---
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLLIElement>(null);

	const [isLangOpen, setIsLangOpen] = useState(false);
	const langRef = useRef<HTMLLIElement>(null);

	// ✨ УВЕДОМЛЕНИЯ
	const [notifications, setNotifications] = useState<any[]>([]);
	const [isNotifOpen, setIsNotifOpen] = useState(false);
	const notifRef = useRef<HTMLLIElement>(null);

	// 🔥 НОВОЕ: Данные пользователя
	const [userData, setUserData] = useState({
		fullName: 'Загрузка...',
		email: '...',
		initial: 'U'
	});

	// --- 1. УМНАЯ ЗАГРУЗКА ДАННЫХ ПРОФИЛЯ ---
	useEffect(() => {
		const storedUser = localStorage.getItem('user');

		if (storedUser) {
			try {
				const parsed = JSON.parse(storedUser);
				// Пытаемся собрать красивое имя, иначе берем логин
				const fullName = (parsed.first_name || parsed.last_name)
					? `${parsed.first_name} ${parsed.last_name}`.trim()
					: parsed.username;

				setUserData({
					fullName: fullName || 'User',
					email: parsed.email || '',
					initial: (fullName || parsed.username || 'U').charAt(0).toUpperCase()
				});
			} catch (e) {
				console.error("Ошибка чтения профиля в Header", e);
			}
		} else {
			setUserData({ fullName: 'Гость', email: '', initial: 'G' });
		}
	}, []);

	// --- ЗАКРЫТИЕ ПРИ КЛИКЕ ВНЕ ЭЛЕМЕНТА ---
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
			if (langRef.current && !langRef.current.contains(event.target as Node)) setIsLangOpen(false);
			if (notifRef.current && !notifRef.current.contains(event.target as Node)) setIsNotifOpen(false);
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => { document.removeEventListener('mousedown', handleClickOutside); };
	}, []);

	// --- ЗАГРУЗКА УВЕДОМЛЕНИЙ ---
	const fetchNotifications = async () => {
		try {
			const response = await $api.get('notifications/');
			setNotifications(response.data);
		} catch (error: any) {
			console.error("Ошибка загрузки уведомлений:", error);
		}
	};

	useEffect(() => {
		fetchNotifications();
		const interval = setInterval(fetchNotifications, 60000);
		return () => clearInterval(interval);
	}, []);

	// --- СМЕНА ЯЗЫКА ---
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

	// Иконка для типа уведомления
	const getNotifIcon = (type: string) => {
		if (type === 'success') return <CheckCircle size={16} className="text-emerald-500" />;
		if (type === 'warning') return <AlertTriangle size={16} className="text-amber-500" />;
		return <Info size={16} className="text-blue-500" />;
	};

	return (
		<nav className="relative flex items-center justify-between px-6 py-3 mx-4 mt-4 transition-all shadow-lg shadow-slate-200 bg-white/80 backdrop-blur-xl rounded-2xl z-40">

			{/* ЛЕВАЯ ЧАСТЬ: ХЛЕБНЫЕ КРОШКИ */}
			<div className="flex items-center gap-4">
				<button onClick={onOpenMobileMenu} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"><Menu size={20} /></button>
				<nav className="hidden sm:block">
					<ol className="flex flex-wrap pt-1 mr-12 bg-transparent rounded-lg sm:mr-16">
						<li className="text-sm leading-normal"><a className="text-slate-500 opacity-50 hover:text-slate-800" href="#">GAT</a></li>
						<li className="text-sm leading-normal text-slate-700 pl-2 before:float-left before:pr-2 before:text-slate-600 before:content-['/']" aria-current="page">{translatedTitle}</li>
					</ol>
					<h6 className="mb-0 font-bold text-slate-800 capitalize text-base">{translatedTitle}</h6>
				</nav>
			</div>

			{/* ПРАВАЯ ЧАСТЬ */}
			<div className="flex items-center mt-2 grow sm:mt-0 sm:mr-6 md:mr-0 lg:flex lg:basis-auto justify-end">

				{/* ПОИСК */}
				<div className="flex items-center md:ml-auto md:pr-4">
					<div className="relative flex flex-wrap items-stretch w-full transition-all rounded-xl">
						<span className="text-sm absolute z-50 -ml-px flex h-full items-center whitespace-nowrap rounded-xl rounded-tr-none rounded-br-none bg-transparent py-2 px-2.5 text-center font-normal text-slate-500"><Search size={16} strokeWidth={2.5} /></span>
						<input type="text" className="pl-9 text-sm w-full relative -ml-px block min-w-0 flex-auto rounded-xl border border-transparent bg-slate-50 focus:bg-white focus:shadow-md focus:shadow-indigo-500/10 py-2 pr-3 text-gray-700 transition-all placeholder:text-gray-400 focus:outline-none focus:ring-0 shadow-sm" placeholder={t('header.search_placeholder')} />
					</div>
				</div>

				<ul className="flex flex-row justify-end pl-0 mb-0 list-none md-max:w-full gap-4 items-center">

					{/* 🌍 ЯЗЫКИ */}
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

					{/* ⚙️ НАСТРОЙКИ */}
					<li className="flex items-center"><a href="#" className="p-0 text-slate-500 hover:text-slate-800 transition-colors"><Settings size={18} strokeWidth={2} /></a></li>

					{/* 🔔 УВЕДОМЛЕНИЯ */}
					<li className="relative flex items-center" ref={notifRef}>
						<button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`p-0 text-slate-500 hover:text-red-500 transition-colors relative ${isNotifOpen ? 'text-red-500' : ''}`}>
							<Bell size={18} strokeWidth={2} />
							{notifications.length > 0 && (
								<span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
									<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
								</span>
							)}
						</button>

						{/* Выпадашка уведомлений */}
						{isNotifOpen && (
							<div className="absolute top-12 right-[-60px] md:right-0 w-80 bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden z-50 animate-fade-in-up origin-top-right">
								<div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
									<span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Уведомления</span>
									<span className="bg-red-50 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{notifications.length}</span>
								</div>
								<div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
									{notifications.length === 0 ? (
										<div className="py-8 text-center text-slate-400 text-xs font-medium">Нет новых уведомлений</div>
									) : (
										notifications.map((notif) => (
											<div key={notif.id} className="p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer flex gap-3 items-start group">
												<div className="mt-0.5 p-1.5 bg-white rounded-lg shadow-sm border border-slate-100 group-hover:border-indigo-100 group-hover:text-indigo-500 transition-colors">
													{getNotifIcon(notif.type)}
												</div>
												<div>
													<h4 className="text-sm font-bold text-slate-700 leading-tight mb-0.5">{notif.title}</h4>
													<p className="text-xs text-slate-500 font-medium leading-snug mb-1">{notif.message}</p>
													<span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">{notif.time || 'Сейчас'}</span>
												</div>
											</div>
										))
									)}
								</div>
							</div>
						)}
					</li>

					{/* 👤 ПРОФИЛЬ (🔥 ОБНОВЛЕНО: ТЕПЕРЬ ПОКАЗЫВАЕТ РЕАЛЬНОЕ ИМЯ) */}
					<li className="relative flex items-center" ref={dropdownRef}>
						<button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shadow-md hover:shadow-lg transition-all transform hover:scale-105 active:scale-95 cursor-pointer ml-2">
							<div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
								<span className="font-bold text-transparent bg-clip-text bg-gradient-to-tr from-indigo-600 to-purple-600 text-sm">
									{userData.initial}
								</span>
							</div>
						</button>
						{isDropdownOpen && (
							<div className="absolute top-14 right-0 w-60 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 p-2 z-50 animate-fade-in-up origin-top-right">
								<div className="px-4 py-3 border-b border-slate-50 mb-1">
									<p className="text-sm font-bold text-slate-800">{userData.fullName}</p>
									<p className="text-xs text-slate-400 font-medium truncate">{userData.email}</p>
								</div>
								<div className="space-y-1">
									<button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all group"><UserCircle size={16} /><span>{t('header.profile.title')}</span></button>
									<button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all group"><Settings size={16} /><span>{t('header.profile.settings')}</span></button>
									<button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all group"><PlusCircle size={16} /><span>{t('header.profile.add_account')}</span></button>
								</div>
								<div className="my-2 border-t border-slate-50"></div>
								<button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all"><LogOut size={16} /><span>{t('header.profile.logout')}</span></button>
							</div>
						)}
					</li>
				</ul>
			</div>
		</nav>
	);
};

export default Header;