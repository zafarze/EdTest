import React, { useState, useEffect } from 'react';
import {
	BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
	ResponsiveContainer, Line, ComposedChart, Legend
} from 'recharts';
import {
	Users, School, Award, Filter,
	CheckCircle2, Layers, PanelRightClose, X,
	ChevronDown, Search, CheckSquare, Square, Hash,
	LayoutDashboard, FileBarChart, BookOpen, Calculator, FlaskConical, Languages, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import $api from '../services/api';

// --- ТИПЫ ДАННЫХ (Интерфейсы) ---
interface Leader {
	id: number;
	name: string;
	school: string;
	score: number;
}

interface SchoolStat {
	name: string;
	score: number;
	prev: number;
}

interface ClassMatrix {
	name: string;
	marks: Record<number, number>; // {10: 5, 9: 2 ...}
	total: number;
	avg: number;
}

interface GradeLevel {
	level: string;
	classes: ClassMatrix[];
}

interface SubjectReport {
	id: number;
	title: string;
	icon?: any;
	color?: string;
	bg?: string;
	grades: GradeLevel[];
}

// --- КОМПОНЕНТЫ UI ---

// 1. Таблица оценок (Осталась без изменений, она идеальна)
const GradeTable = ({ classes, levelName }: { classes: ClassMatrix[], levelName: string }) => {
	const totals = { 10: 0, 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, studentCount: 0 };
	classes.forEach(c => {
		totals.studentCount += c.total;
		for (let i = 1; i <= 10; i++) totals[i as keyof typeof totals] += (c.marks[i] || 0);
	});

	const getHeaderColor = (mark: number) => {
		if (mark >= 9) return 'text-emerald-600 bg-emerald-50';
		if (mark >= 7) return 'text-indigo-600 bg-indigo-50';
		if (mark >= 5) return 'text-amber-600 bg-amber-50';
		return 'text-rose-600 bg-rose-50';
	};

	return (
		<div className="mb-8 last:mb-0">
			<h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 pl-2 border-l-4 border-indigo-500">{levelName}</h4>
			<div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
				<table className="w-full text-center border-collapse text-sm">
					<thead>
						<tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-200">
							<th className="px-4 py-3 text-left w-32">Класс</th>
							{[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(mark => (<th key={mark} className={`px-2 py-3 w-12 border-l border-slate-100 ${getHeaderColor(mark)}`}>{mark}</th>))}
							<th className="px-4 py-3 border-l border-slate-200 w-24">Всего</th>
							<th className="px-4 py-3 border-l border-slate-200 w-24">Ср. балл</th>
						</tr>
					</thead>
					<tbody className="bg-white font-medium text-slate-700">
						{classes.map((row, idx) => (
							<tr key={idx} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
								<td className="px-4 py-2 text-left font-bold text-indigo-900">{row.name}</td>
								{[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(mark => (<td key={mark} className={`px-2 py-2 border-l border-slate-50 ${row.marks[mark] > 0 ? 'text-slate-800' : 'text-slate-200'}`}>{row.marks[mark] > 0 ? row.marks[mark] : '-'}</td>))}
								<td className="px-4 py-2 border-l border-slate-100 text-slate-500">{row.total}</td>
								<td className="px-4 py-2 border-l border-slate-100 font-bold bg-slate-50/50">{row.avg}</td>
							</tr>
						))}
						<tr className="bg-slate-900 text-white font-bold text-xs">
							<td className="px-4 py-2 text-left uppercase">Итого</td>
							{[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(mark => (
								<td key={mark} className="px-2 py-2 border-l border-slate-700">{totals[mark as keyof typeof totals]}</td>
							))}
							<td className="px-4 py-2 border-l border-slate-700">{totals.studentCount}</td>
							<td className="px-4 py-2 border-l border-slate-700">-</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
};

// 2. MultiSelect (Остался прежним)
const MultiSelect = ({ label, icon: Icon, options, selected, onChange, hasSearch = false }: any) => {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const dropdownRef = React.useRef<HTMLDivElement>(null);
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);
	const toggleOption = (option: string) => selected.includes(option) ? onChange(selected.filter((i: string) => i !== option)) : onChange([...selected, option]);
	const handleSelectAll = () => selected.length === options.length ? onChange([]) : onChange(options);
	const filteredOptions = options.filter((opt: string) => opt.toLowerCase().includes(searchQuery.toLowerCase()));

	return (
		<div className="mb-5 relative" ref={dropdownRef}>
			<label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Icon size={12} /> {label}</label>
			<button onClick={() => setIsOpen(!isOpen)} className={`w-full bg-slate-50 border-2 rounded-xl py-3 px-4 flex items-center justify-between transition-all duration-200 ${isOpen ? 'border-indigo-500 ring-4 ring-indigo-500/10 bg-white' : 'border-slate-100 hover:border-slate-200'}`}><span className={`text-sm font-bold truncate ${selected.length > 0 ? 'text-slate-800' : 'text-slate-400'}`}>{selected.length === 0 ? 'Не выбрано' : selected.length === options.length ? 'Все выбраны' : `${selected[0]} +${selected.length - 1}`}</span><ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} /></button>
			<AnimatePresence>{isOpen && (<motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden">{hasSearch && (<div className="p-2 border-b border-slate-50"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 rounded-lg py-2 pl-9 pr-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700" /></div></div>)}<div className="max-h-60 overflow-y-auto custom-scrollbar p-1"><button onClick={handleSelectAll} className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 transition-colors mb-1">{selected.length === options.length ? <CheckSquare size={16} /> : <Square size={16} />} Выбрать все</button>{filteredOptions.map((option: string) => { const isSelected = selected.includes(option); return (<button key={option} onClick={() => toggleOption(option)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${isSelected ? 'bg-indigo-50 text-indigo-900' : 'text-slate-600 hover:bg-slate-50'}`}><div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>{isSelected && <CheckCircle2 size={12} className="text-white" />}</div><span className="truncate">{option}</span></button>); })}</div></motion.div>)}</AnimatePresence>
		</div>
	);
};

const Statistics = () => {
	// --- STATE ---
	const [isFilterOpen, setIsFilterOpen] = useState(true);
	const [activeTab, setActiveTab] = useState<'overview' | 'matrix'>('overview');
	const [isLoading, setIsLoading] = useState(true);

	// Данные с сервера (Инициализируем пустыми массивами)
	const [schoolsData, setSchoolsData] = useState<SchoolStat[]>([]);
	const [leaders, setLeaders] = useState<Leader[]>([]);
	const [matrixData, setMatrixData] = useState<SubjectReport[]>([]);
	const [kpi, setKpi] = useState({ avg_gat: 0, total_students: 0, top_school: '-' });

	// Фильтры
	const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
	const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
	const [selectedGats, setSelectedGats] = useState<string[]>([]);
	const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

	// --- 🔥 ЗАГРУЗКА РЕАЛЬНЫХ ДАННЫХ ---
	useEffect(() => {
		const fetchData = async () => {
			setIsLoading(true);
			try {
				// Прямой запрос к бэкенду
				const response = await $api.get('/analytics/dashboard/');

				// Распаковка данных
				setSchoolsData(response.data.chart_schools || []);
				setLeaders(response.data.leaders || []);
				setKpi(response.data.kpi || {});

				// Для матрицы мы можем добавить дефолтные иконки, если бэкенд шлет только строки
				const enrichedMatrix = (response.data.matrix || []).map((subj: any) => ({
					...subj,
					icon: Calculator, // Заглушка, можно мапить по ID или названию
					color: subj.color || 'text-indigo-600',
					bg: subj.bg || 'bg-indigo-50'
				}));
				setMatrixData(enrichedMatrix);

			} catch (error) {
				console.error("Ошибка загрузки аналитики:", error);
				// Тут можно показать тост с ошибкой
			} finally {
				setIsLoading(false);
			}
		};
		fetchData();
	}, []);

	const activeFiltersCount = selectedSchools.length + selectedClasses.length + selectedGats.length + selectedSubjects.length;

	if (isLoading) {
		return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;
	}

	return (
		<div className="flex flex-col lg:flex-row gap-6 min-h-screen relative">

			<div className="flex-1 space-y-6 animate-fade-in-up transition-all duration-500 ease-in-out">

				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl font-black text-slate-800">Аналитика</h1>
						<p className="text-slate-400 text-sm font-medium">Мониторинг успеваемости (Real-Time)</p>
					</div>
					<div className="flex items-center gap-3">
						<div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex">
							<button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
								<LayoutDashboard size={16} /> Обзор
							</button>
							<button onClick={() => setActiveTab('matrix')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'matrix' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
								<FileBarChart size={16} /> Сводный отчет
							</button>
						</div>
						<button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm border ${isFilterOpen ? 'bg-white text-indigo-600 border-indigo-100' : 'bg-slate-900 text-white border-transparent hover:bg-slate-800'}`}>
							{isFilterOpen ? <PanelRightClose size={18} /> : <Filter size={18} />}
							<span className="hidden sm:inline">{isFilterOpen ? 'Скрыть' : 'Фильтры'}</span>
							{!isFilterOpen && activeFiltersCount > 0 && <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] ml-1">{activeFiltersCount}</span>}
						</button>
					</div>
				</div>

				{/* --- TAB 1: OVERVIEW --- */}
				{activeTab === 'overview' && (
					<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

						{/* KPI Cards */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							{[
								{ title: 'Средний балл GAT', value: kpi.avg_gat, trend: '+0.0', icon: Award, color: 'text-indigo-600', bg: 'bg-indigo-50' },
								{ title: 'Участие учеников', value: kpi.total_students, trend: 'Всего', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
								{ title: 'Лидер рейтинга', value: kpi.top_school, trend: 'TOP 1', icon: School, color: 'text-amber-600', bg: 'bg-amber-50' },
							].map((stat, i) => (
								<div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
									<div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${stat.color}`}><stat.icon size={80} /></div>
									<div className="relative z-10">
										<div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${stat.bg} ${stat.color}`}><stat.icon size={24} /></div>
										<p className="text-slate-400 text-xs font-bold uppercase">{stat.title}</p>
										<div className="flex items-end gap-3 mt-1"><h3 className="text-3xl font-black text-slate-800">{stat.value}</h3><span className="mb-1 text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-600">{stat.trend}</span></div>
									</div>
								</div>
							))}
						</div>

						{/* Chart: Schools */}
						<div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
							<h3 className="text-xl font-black text-slate-800 mb-6">Динамика успеваемости (ср. балл)</h3>
							{schoolsData.length > 0 ? (
								<div className="h-[350px] w-full">
									<ResponsiveContainer width="100%" height="100%">
										<ComposedChart data={schoolsData} barSize={isFilterOpen ? 30 : 50}>
											<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
											<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={10} />
											<YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 10]} />
											<RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }} />
											<Bar dataKey="prev" fill="#e0e7ff" radius={[8, 8, 8, 8]} name="Прошлый" />
											<Bar dataKey="score" fill="#6366f1" radius={[8, 8, 8, 8]} name="Текущий" />
											<Line type="monotone" dataKey="score" stroke="#fbbf24" strokeWidth={3} dot={{ r: 4, fill: '#fbbf24', strokeWidth: 2, stroke: '#fff' }} />
										</ComposedChart>
									</ResponsiveContainer>
								</div>
							) : (
								<div className="h-64 flex items-center justify-center text-slate-400 font-bold">Нет данных для графика</div>
							)}
						</div>

						{/* TOP STUDENTS & SUBJECTS */}
						<div className={`grid gap-6 ${isFilterOpen ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>

							{/* ТОП УЧЕНИКОВ */}
							<div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-[2.5rem] shadow-xl shadow-indigo-200 text-white relative overflow-hidden flex flex-col justify-between min-h-[300px]">
								<div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
								<div className="flex justify-between items-center mb-4 relative z-10">
									<h3 className="text-lg font-bold">Лидеры GAT</h3>
									<Award className="text-yellow-300" />
								</div>
								<div className="space-y-3 relative z-10">
									{leaders.length > 0 ? leaders.map((student, i) => (
										<div key={student.id} className="flex items-center gap-4 p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
											<div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">{i + 1}</div>
											<div className="flex-1 min-w-0">
												<p className="font-bold text-sm truncate">{student.name}</p>
												<p className="text-xs text-indigo-100 truncate">{student.school}</p>
											</div>
											<span className="font-black text-base text-yellow-300">{student.score}</span>
										</div>
									)) : (
										<div className="text-center text-indigo-200 text-sm mt-10">Нет данных о лидерах</div>
									)}
								</div>
								<button className="w-full mt-4 py-3 bg-white text-indigo-700 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-indigo-50 transition-colors">
									Посмотреть всех
								</button>
							</div>

							{/* Заглушка для графика предметов (пока бэкенд не возвращает матрицу для чартов) */}
							<div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-center">
								<div className="text-center">
									<div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
										<FileBarChart size={32} />
									</div>
									<h3 className="text-slate-800 font-bold">Детализация</h3>
									<p className="text-slate-400 text-xs mt-1">Выберите предмет в матрице</p>
								</div>
							</div>
						</div>
					</motion.div>
				)}

				{/* --- TAB 2: MATRIX 1-10 --- */}
				{activeTab === 'matrix' && (
					<motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
						{matrixData.length > 0 ? matrixData.map((subject) => (
							<div key={subject.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
								<div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
									<div className="flex items-center gap-4">
										<div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${subject.bg} ${subject.color}`}><subject.icon size={24} strokeWidth={2} /></div>
										<div><h3 className="text-xl font-black text-slate-800">{subject.title}</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Детальный срез (1-10)</p></div>
									</div>
									<button className="text-indigo-600 text-xs font-bold uppercase hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors border border-slate-200">Скачать отчет</button>
								</div>
								<div className="p-6 md:p-8">
									{subject.grades.map((gradeLevelData, idx) => (<GradeTable key={idx} levelName={gradeLevelData.level} classes={gradeLevelData.classes} />))}
								</div>
							</div>
						)) : (
							<div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100">
								<h3 className="text-lg font-bold text-slate-700">Нет данных для отчета</h3>
								<p className="text-slate-400 text-sm mt-2">Экзамены еще не проводились или результаты не загружены.</p>
							</div>
						)}
					</motion.div>
				)}
			</div>

			{/* Sidebar (Без изменений) */}
			<AnimatePresence>
				{isFilterOpen && (
					<motion.div initial={{ width: 0, opacity: 0, x: 50 }} animate={{ width: 320, opacity: 1, x: 0 }} exit={{ width: 0, opacity: 0, x: 50 }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="flex-shrink-0">
						<div className="w-80 sticky top-6 h-[calc(100vh-3rem)]">
							<div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-xl border border-white/50 h-full flex flex-col">
								<div className="flex items-center justify-between mb-6"><h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Filter className="text-indigo-600" size={20} /> Фильтры</h2><button onClick={() => setIsFilterOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20} /></button></div>
								<div className="h-px bg-slate-100 mb-6"></div>
								<div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
									<MultiSelect label="Школы" icon={School} options={['Лицей №1', 'Гимназия']} selected={selectedSchools} onChange={setSelectedSchools} hasSearch={true} />
									<MultiSelect label="Классы" icon={Layers} options={['11 Класс', '10 Класс']} selected={selectedClasses} onChange={setSelectedClasses} />
									<MultiSelect label="GAT Экзамены" icon={Hash} options={['GAT-A', 'GAT-B']} selected={selectedGats} onChange={setSelectedGats} />
									<MultiSelect label="Предметы" icon={Award} options={['Математика', 'Физика']} selected={selectedSubjects} onChange={setSelectedSubjects} />
								</div>
								<div className="absolute bottom-6 left-6 right-6 pt-4 border-t border-slate-100 bg-white/50 backdrop-blur-sm">
									<button className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-slate-200 transition-all transform active:scale-95 flex items-center justify-center gap-2"><span>Применить</span>{activeFiltersCount > 0 && <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">{activeFiltersCount}</div>}</button>
								</div>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default Statistics;