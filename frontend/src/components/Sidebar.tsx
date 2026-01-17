import { useState, useEffect } from 'react';
import {
	LayoutDashboard, UploadCloud, ClipboardList, BarChart2, Activity,
	Users, Settings, LogOut, ChevronLeft, ChevronRight, ChevronDown,
	GraduationCap, BrainCircuit, Trophy, TrendingUp, GitCompare, FileSpreadsheet
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
	isOpen: boolean;
	isCollapsed: boolean;
	toggleCollapse: () => void;
	closeMobile: () => void;
	logout: () => void;
}

const Sidebar = ({ isOpen, isCollapsed, toggleCollapse, closeMobile, logout }: SidebarProps) => {
	const navigate = useNavigate();
	const location = useLocation();
	const { t } = useTranslation();

	const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
	const [schoolData, setSchoolData] = useState<{ name: string; logo: string | null } | null>(null);

	// --- УМНАЯ ЗАГРУЗКА ДАННЫХ ШКОЛЫ ---
	const loadData = () => {
		const storedSettings = localStorage.getItem('schoolSettings');
		if (storedSettings) {
			try {
				setSchoolData(JSON.parse(storedSettings));
			} catch (e) {
				console.error("Ошибка парсинга:", e);
				setSchoolData(null);
			}
		} else {
			setSchoolData(null);
		}
	};

	useEffect(() => {
		loadData();
		window.addEventListener('schoolDataChanged', loadData);
		return () => window.removeEventListener('schoolDataChanged', loadData);
	}, []);

	const handleToggleSubmenu = (name: string) => {
		if (isCollapsed) {
			toggleCollapse();
			setExpandedMenu(name);
			return;
		}
		setExpandedMenu(expandedMenu === name ? null : name);
	};

	// --- СТРУКТУРА МЕНЮ ---
	const menuItems = [
		{ name: t('sidebar.dashboard'), icon: LayoutDashboard, path: '/admin' },
		{ name: t('sidebar.upload'), icon: UploadCloud, path: '/admin/upload' },
		{ name: t('sidebar.results'), icon: ClipboardList, path: '/admin/results' },
		{ name: t('sidebar.analytics'), icon: BarChart2, path: '/admin/statistics' },
		{ name: t('sidebar.ai_insights'), icon: BrainCircuit, path: '/admin/analysis' },
		{
			// === ОБНОВЛЕННЫЙ РАЗДЕЛ МОНИТОРИНГ ===
			name: t('sidebar.monitoring.title'), // "Мониторинг"
			icon: Activity,
			path: '#',
			subItems: [
				{
					name: t('sidebar.monitoring.rating'), // "Рейтинг"
					icon: Trophy,
					path: '/admin/monitoring/rating'
				},
				{
					name: t('sidebar.monitoring.performance'), // "Показатели" (Сифати таҳсилот / азхудкуни)
					icon: TrendingUp,
					path: '/admin/monitoring/performance'
				},
				{
					name: t('sidebar.monitoring.comparison'), // "Сравнение"
					icon: GitCompare,
					path: '/admin/monitoring/comparison'
				},
				{
					name: t('sidebar.monitoring.journal'), // "Журнал"
					icon: FileSpreadsheet,
					path: '/admin/monitoring/journal'
				}
			]
		},
		{ name: t('sidebar.management'), icon: Users, path: '/admin/management' },
		{ name: t('sidebar.settings'), icon: Settings, path: '/admin/settings' },
	];

	return (
		<>
			{/* Затемнение фона (для мобильных) */}
			<div className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={closeMobile}></div>

			{/* САЙДБАР */}
			<aside className={`fixed top-0 left-0 z-50 h-[calc(100vh-24px)] m-3 flex flex-col rounded-2xl bg-white shadow-2xl shadow-slate-200/50 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-[70px]' : 'w-64'} ${isOpen ? 'translate-x-0' : '-translate-x-[200%] lg:translate-x-0'}`}>

				{/* КНОПКА СВОРАЧИВАНИЯ */}
				<button onClick={toggleCollapse} className="hidden lg:flex absolute -right-3 top-6 w-6 h-6 bg-white rounded-full shadow-md items-center justify-center text-slate-400 hover:text-indigo-600 border border-slate-100 transition-colors z-50">
					{isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
				</button>

				{/* --- HEADER --- */}
				<div className={`flex flex-col items-center justify-center transition-all duration-300 border-b border-dashed border-slate-100 
                    ${isCollapsed ? 'py-4 gap-0' : 'py-5 gap-2'}`}>

					{/* ЛОГОТИП */}
					{schoolData ? (
						<div className={`transition-all duration-300 rounded-xl shadow-md flex items-center justify-center overflow-hidden border border-slate-100 bg-white
                            ${isCollapsed ? 'w-9 h-9 min-w-[36px]' : 'w-16 h-16 min-w-[64px]'} 
                        `}>
							{schoolData.logo ? (
								<img src={schoolData.logo} alt="Logo" className="w-full h-full object-cover" />
							) : (
								<span className="font-bold text-indigo-600 text-xl">{schoolData.name ? schoolData.name.charAt(0) : 'S'}</span>
							)}
						</div>
					) : (
						<div className={`transition-all duration-300 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-xl shadow-md flex items-center justify-center text-white
                            ${isCollapsed ? 'w-9 h-9 min-w-[36px]' : 'w-14 h-14 min-w-[56px]'}
                        `}>
							<GraduationCap size={isCollapsed ? 18 : 28} />
						</div>
					)}

					{/* НАЗВАНИЕ ШКОЛЫ */}
					<div className={`text-center transition-all duration-300 overflow-hidden px-2 ${isCollapsed ? 'opacity-0 h-0 w-0' : 'opacity-100 h-auto w-full'}`}>
						<h3 className="font-extrabold text-slate-800 text-sm leading-tight uppercase tracking-tight break-words line-clamp-2">
							{schoolData ? schoolData.name : "GAT Premium"}
						</h3>
						<p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
							{schoolData ? t('common.school_panel') : "Platform"}
						</p>
					</div>
				</div>

				{/* --- СПИСОК МЕНЮ --- */}
				<nav className="flex-1 space-y-0.5 p-2 overflow-y-auto overflow-x-hidden custom-scrollbar mt-1">
					{menuItems.map((item) => {
						// Логика активного родительского элемента
						const isParentActive = item.subItems
							? item.subItems.some(sub => location.pathname === sub.path) || expandedMenu === item.name
							: location.pathname === item.path;
						const hasSubmenu = item.subItems && item.subItems.length > 0;

						return (
							<div key={item.name} className="flex flex-col">
								<button onClick={() => hasSubmenu ? handleToggleSubmenu(item.name) : (navigate(item.path), closeMobile())} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${isParentActive && !hasSubmenu ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'hover:bg-slate-50'} ${isCollapsed ? 'justify-center' : ''}`}>
									<div className="flex items-center gap-3">
										<div className={`p-1.5 rounded-lg transition-all min-w-[32px] flex items-center justify-center ${isParentActive ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 group-hover:text-slate-600'}`}>
											<item.icon size={18} strokeWidth={isParentActive ? 2.5 : 2} />
										</div>
										<span className={`text-[13px] font-bold transition-all duration-300 whitespace-nowrap ${isParentActive ? 'text-indigo-700' : 'text-slate-600'} ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>{item.name}</span>
									</div>
									{hasSubmenu && !isCollapsed && <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${expandedMenu === item.name ? 'rotate-180' : ''}`} />}

									{/* Всплывающая подсказка при свернутом меню */}
									{isCollapsed && <div className="absolute left-14 bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-xl">{item.name}</div>}
								</button>

								{/* ПОДМЕНЮ */}
								{hasSubmenu && (
									// max-h-64 чтобы вместить 4 пункта
									<div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedMenu === item.name && !isCollapsed ? 'max-h-64 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
										<div className="flex flex-col gap-0.5 pl-12 pr-2">
											{item.subItems?.map((subItem) => {
												const isSubActive = location.pathname === subItem.path;
												return (
													<button key={subItem.path} onClick={() => { navigate(subItem.path); closeMobile(); }} className={`flex items-center gap-2 py-2 px-3 rounded-lg text-xs transition-all font-bold ${isSubActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
														<div className={`w-1 h-1 rounded-full ${isSubActive ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
														<span>{subItem.name}</span>
													</button>
												);
											})}
										</div>
									</div>
								)}
							</div>
						);
					})}
				</nav>

				{/* --- FOOTER (ВЫХОД) --- */}
				<div className="p-3 border-t border-dashed border-slate-200">
					<button onClick={logout} className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-all font-black text-xs ${isCollapsed ? 'justify-center' : ''}`}>
						<LogOut size={18} />
						{!isCollapsed && <span>{t('header.profile.logout')}</span>}
					</button>
				</div>
			</aside>
		</>
	);
};

export default Sidebar;