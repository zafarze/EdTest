import { useState, useEffect } from 'react';
import {
	LayoutDashboard, FileText, BarChart2,
	LogOut, ChevronLeft, ChevronRight, GraduationCap,
	Map, Building2 // 👈 Новые иконки
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
	isOpen: boolean;
	isCollapsed: boolean;
	toggleCollapse: () => void;
	closeMobile: () => void;
	logout: () => void;
}

const StudentSidebar = ({ isOpen, isCollapsed, toggleCollapse, closeMobile, logout }: SidebarProps) => {
	const navigate = useNavigate();
	const location = useLocation();

	// Данные школы (логотип)
	const [schoolData, setSchoolData] = useState<{ name: string; logo: string | null } | null>(null);
	useEffect(() => {
		const stored = localStorage.getItem('schoolSettings');
		if (stored) setSchoolData(JSON.parse(stored));
	}, []);

	// 🔥 ОБНОВЛЕННОЕ МЕНЮ
	const menuItems = [
		{ name: "Дашборд", icon: LayoutDashboard, path: '/student' },
		{ name: "Мой Путь (Roadmap)", icon: Map, path: '/student/roadmap' }, // 👈 Новое
		{ name: "Факультеты", icon: Building2, path: '/student/faculties' }, // 👈 Новое
		{ name: "Мои Экзамены", icon: FileText, path: '/student/exams' },
		{ name: "Результаты", icon: BarChart2, path: '/student/results' },
	];

	return (
		<>
			{/* Затемнение (Mobile) */}
			<div className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={closeMobile}></div>

			{/* САЙДБАР */}
			<aside className={`fixed top-0 left-0 z-50 h-[calc(100vh-24px)] m-3 flex flex-col rounded-2xl bg-white shadow-2xl shadow-slate-200/50 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-[70px]' : 'w-64'} ${isOpen ? 'translate-x-0' : '-translate-x-[200%] lg:translate-x-0'}`}>

				{/* Кнопка сворачивания */}
				<button onClick={toggleCollapse} className="hidden lg:flex absolute -right-3 top-6 w-6 h-6 bg-white rounded-full shadow-md items-center justify-center text-slate-400 hover:text-indigo-600 border border-slate-100 transition-colors z-50">
					{isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
				</button>

				{/* Логотип */}
				<div className={`flex flex-col items-center justify-center transition-all duration-300 border-b border-dashed border-slate-100 ${isCollapsed ? 'py-4 gap-0' : 'py-5 gap-2'}`}>
					<div className={`transition-all duration-300 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl shadow-md flex items-center justify-center text-white ${isCollapsed ? 'w-9 h-9 min-w-[36px]' : 'w-14 h-14 min-w-[56px]'}`}>
						{schoolData?.logo ? <img src={schoolData.logo} className="w-full h-full object-cover rounded-xl" /> : <GraduationCap size={isCollapsed ? 18 : 28} />}
					</div>
					<div className={`text-center transition-all duration-300 overflow-hidden px-2 ${isCollapsed ? 'opacity-0 h-0 w-0' : 'opacity-100 h-auto w-full'}`}>
						<h3 className="font-extrabold text-slate-800 text-sm leading-tight line-clamp-2">{schoolData?.name || "GAT Student"}</h3>
						<p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Кабинет</p>
					</div>
				</div>

				{/* Навигация */}
				<nav className="flex-1 space-y-1 p-2 overflow-y-auto mt-2 custom-scrollbar">
					{menuItems.map((item) => {
						const isActive = location.pathname === item.path;
						return (
							<button
								key={item.path}
								onClick={() => { navigate(item.path); closeMobile(); }}
								className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 group relative 
                                ${isActive ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'hover:bg-slate-50'} 
                                ${isCollapsed ? 'justify-center' : ''}`}
							>
								<div className="flex items-center gap-3">
									<div className={`p-1.5 rounded-lg transition-all min-w-[32px] flex items-center justify-center ${isActive ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 group-hover:text-slate-600'}`}>
										<item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
									</div>
									<span className={`text-[13px] font-bold transition-all duration-300 whitespace-nowrap ${isActive ? 'text-indigo-700' : 'text-slate-600'} ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
										{item.name}
									</span>
								</div>
								{isCollapsed && (
									<div className="absolute left-14 bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-xl">
										{item.name}
									</div>
								)}
							</button>
						);
					})}
				</nav>

				{/* Выход */}
				<div className="p-3 border-t border-dashed border-slate-200">
					<button onClick={logout} className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-all font-black text-xs ${isCollapsed ? 'justify-center' : ''}`}>
						<LogOut size={18} />
						{!isCollapsed && <span>Выйти</span>}
					</button>
				</div>
			</aside>
		</>
	);
};

export default StudentSidebar;