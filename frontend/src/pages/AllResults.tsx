import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
	BarChart3, Trophy, Users, Search,
	School, ChevronDown, Check, Filter,
	RefreshCw, Layers, GraduationCap, Zap, Clock,
	X, SlidersHorizontal, ChevronUp, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from 'recharts';
import $api from "../services/api";

// --- ТИПЫ ДАННЫХ ---
interface SchoolItem {
	id: number;
	name: string;
}

interface ResultItem {
	id: number;
	student_name: string;
	class_name: string;
	school_name: string;
	score: number;
	max_score: number;
	percentage: number;
	details: Record<string, number>; // Пример: "MATH_1": 1, "ENG_2": 0
	day?: number;
}

// --- КОМПОНЕНТ 1: ЛЕПЕСТКОВАЯ ДИАГРАММА (RADAR CHART) ---
const StudentRadarChart = ({ details }: { details: Record<string, number> }) => {
	const data = useMemo(() => {
		const groups: Record<string, { total: number; correct: number }> = {};

		if (!details) return [];

		Object.entries(details).forEach(([key, val]) => {
			const subject = key.split('_')[0];
			if (!groups[subject]) groups[subject] = { total: 0, correct: 0 };
			groups[subject].total += 1;
			if (val === 1) groups[subject].correct += 1;
		});

		return Object.keys(groups).map(subject => ({
			subject,
			A: Math.round((groups[subject].correct / groups[subject].total) * 100),
			fullMark: 100,
		}));
	}, [details]);

	if (data.length === 0) return <div className="text-xs text-slate-400">Нет данных для графика</div>;

	return (
		<div className="h-[280px] w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100 relative">
			<h4 className="absolute top-4 left-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Баланс знаний</h4>
			<ResponsiveContainer width="100%" height="100%">
				<RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
					<PolarGrid stroke="#e2e8f0" />
					<PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
					<Radar
						name="Успеваемость"
						dataKey="A"
						stroke="#4f46e5"
						fill="#6366f1"
						fillOpacity={0.4}
					/>
				</RadarChart>
			</ResponsiveContainer>
		</div>
	);
};

// --- КОМПОНЕНТ 2: Выпадающий список школ с поиском ---
const SchoolSelector = ({
	schools,
	selectedSchools,
	onChange
}: {
	schools: SchoolItem[],
	selectedSchools: number[],
	onChange: (ids: number[]) => void
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState("");
	const wrapperRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const filteredSchools = schools.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

	const toggleSchool = (id: number) => {
		if (selectedSchools.includes(id)) {
			onChange(selectedSchools.filter(sid => sid !== id));
		} else {
			onChange([...selectedSchools, id]);
		}
	};

	return (
		<div className="relative" ref={wrapperRef}>
			<label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
				<School size={12} /> Школа
			</label>

			<div
				onClick={() => setIsOpen(!isOpen)}
				className={`w-full p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer flex justify-between items-center hover:border-indigo-300 transition-all ${isOpen ? 'ring-2 ring-indigo-100 border-indigo-300 bg-white' : ''}`}
			>
				<div className="text-xs font-bold text-slate-700 truncate pr-2 select-none">
					{selectedSchools.length === 0
						? "Выберите школу..."
						: selectedSchools.length === 1
							? schools.find(s => s.id === selectedSchools[0])?.name
							: `Выбрано школ: ${selectedSchools.length}`}
				</div>
				{isOpen ? <ChevronUp size={16} className="text-indigo-500" /> : <ChevronDown size={16} className="text-slate-400" />}
			</div>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, y: 5, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 5, scale: 0.98 }}
						className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
					>
						<div className="p-2 border-b border-slate-100 sticky top-0 bg-white z-10">
							<div className="flex items-center bg-slate-50 rounded-lg px-2 border border-transparent focus-within:border-indigo-200 focus-within:bg-white transition-all">
								<Search size={14} className="text-slate-400" />
								<input
									type="text"
									placeholder="Найти школу..."
									className="w-full bg-transparent border-none text-xs font-bold p-2 focus:ring-0 outline-none text-slate-700 placeholder:text-slate-400"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									autoFocus
								/>
							</div>
						</div>

						<div className="max-h-[220px] overflow-y-auto custom-scrollbar p-1 space-y-0.5">
							{filteredSchools.length > 0 ? filteredSchools.map(school => (
								<div
									key={school.id}
									onClick={() => toggleSchool(school.id)}
									className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedSchools.includes(school.id) ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
								>
									<div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${selectedSchools.includes(school.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
										{selectedSchools.includes(school.id) && <Check size={10} className="text-white" strokeWidth={4} />}
									</div>
									<span className={`text-xs font-bold truncate ${selectedSchools.includes(school.id) ? 'text-indigo-900' : 'text-slate-600'}`}>
										{school.name}
									</span>
								</div>
							)) : (
								<div className="p-4 text-center text-xs text-slate-400 font-medium">Ничего не найдено</div>
							)}
						</div>

						{selectedSchools.length > 0 && (
							<div className="p-2 bg-slate-50 border-t border-slate-100 flex justify-end">
								<button
									onClick={(e) => { e.stopPropagation(); onChange([]); }}
									className="text-[10px] font-bold text-rose-500 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors"
								>
									Сбросить всё
								</button>
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

// --- КОМПОНЕНТ 3: Карточка статистики ---
const StatCard = ({ icon: Icon, label, value, subValue, colorClass }: any) => (
	<div className="bg-white p-5 rounded-[20px] shadow-sm border border-slate-200/60 flex items-center gap-4 flex-1 min-w-[160px]">
		<div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
			<Icon size={24} />
		</div>
		<div>
			<p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
			<div className="flex items-baseline gap-2">
				<h3 className="text-2xl font-black text-slate-800 leading-none">{value}</h3>
				{subValue && <span className="text-xs font-bold text-slate-400">{subValue}</span>}
			</div>
		</div>
	</div>
);

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const GlobalMonitoring: React.FC = () => {
	// --- STATE ---
	const [schools, setSchools] = useState<SchoolItem[]>([]);
	const [isSidebarOpen, setSidebarOpen] = useState(true);

	// Filters
	const [selectedSchools, setSelectedSchools] = useState<number[]>([]);
	const [selectedQuarter, setSelectedQuarter] = useState('');
	const [selectedGat, setSelectedGat] = useState('');
	const [selectedDay, setSelectedDay] = useState('');
	const [selectedGrade, setSelectedGrade] = useState('');

	// Data
	const [results, setResults] = useState<ResultItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [subjects, setSubjects] = useState<string[]>([]);
	const [searchTerm, setSearchTerm] = useState('');
	const [expandedId, setExpandedId] = useState<number | null>(null);

	// --- EFFECTS ---
	useEffect(() => {
		const fetchSchools = async () => {
			try {
				const res = await $api.get('schools/');
				setSchools(Array.isArray(res.data) ? res.data : (res.data.results || []));
			} catch (e) { console.error("Error loading schools", e); }
		};
		fetchSchools();
	}, []);

	const fetchResults = async () => {
		if (selectedSchools.length === 0 && !selectedGrade && !selectedGat) return;

		setLoading(true);
		setResults([]);
		setExpandedId(null);

		try {
			const params = new URLSearchParams();
			if (selectedSchools.length) params.append('schools', selectedSchools.join(','));
			if (selectedQuarter) params.append('quarter', selectedQuarter);
			if (selectedGat) params.append('gat', selectedGat);
			if (selectedGrade) params.append('grade', selectedGrade);
			if (selectedDay) params.append('day', selectedDay);

			const response = await $api.get(`monitoring/results/?${params.toString()}`);
			const data = response.data;

			// Сортировка по баллам
			data.sort((a: ResultItem, b: ResultItem) => b.score - a.score);

			// Определение предметов
			const allSubjects = new Set<string>();
			data.forEach((item: ResultItem) => {
				if (item.details) {
					Object.keys(item.details).forEach(key => {
						const parts = key.split('_');
						if (parts.length > 1) allSubjects.add(parts[0]);
					});
				}
			});
			setSubjects(Array.from(allSubjects).sort());
			setResults(data);
		} catch (error) {
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	// --- COMPUTED ---
	const filteredResults = useMemo(() => {
		const lowerSearch = searchTerm.toLowerCase();
		return results.filter(r =>
			r.student_name.toLowerCase().includes(lowerSearch) ||
			r.school_name.toLowerCase().includes(lowerSearch)
		);
	}, [results, searchTerm]);

	const stats = useMemo(() => {
		if (!results.length) return null;
		const avg = results.reduce((acc, curr) => acc + curr.percentage, 0) / results.length;
		const max = Math.max(...results.map(r => r.score));
		return { avg: avg.toFixed(1), max, total: results.length };
	}, [results]);

	// --- HELPERS ---
	const getSubjectScore = (details: Record<string, number>, subject: string) => {
		if (!details) return { score: 0, total: 0 };
		let score = 0, total = 0;
		Object.entries(details).forEach(([key, val]) => {
			const sName = key.split('_')[0];
			if (sName === subject) {
				if (val === 1) score++;
				total++;
			}
		});
		return { score, total };
	};

	const groupedDetails = (details: Record<string, number>) => {
		const groups: Record<string, { key: string, val: number }[]> = {};
		Object.entries(details).forEach(([key, val]) => {
			const [subj, num] = key.split('_');
			if (subj && num) {
				if (!groups[subj]) groups[subj] = [];
				groups[subj].push({ key: num, val });
			}
		});
		Object.keys(groups).forEach(s => groups[s].sort((a, b) => parseInt(a.key) - parseInt(b.key)));
		return groups;
	};

	// --- RENDER ---
	return (
		<div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 p-4 md:p-6 pb-20">

			<div className="max-w-[1920px] mx-auto transition-all duration-300">

				{/* 1. HEADER & STATS */}
				<header className="mb-6">
					<div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
						<div>
							<h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
								<Zap className="text-indigo-600 fill-indigo-600" size={32} /> GAT Monitor
							</h1>
							<p className="text-slate-500 font-medium ml-1">Панель мониторинга результатов</p>
						</div>
						<div className="flex flex-wrap gap-4 w-full md:w-auto">
							{stats ? (
								<>
									<StatCard icon={Users} label="Участников" value={stats.total} colorClass="bg-blue-50 text-blue-600" />
									<StatCard icon={BarChart3} label="Ср. балл" value={stats.avg + '%'} colorClass="bg-violet-50 text-violet-600" />
									<StatCard icon={Trophy} label="Рекорд" value={stats.max} colorClass="bg-amber-50 text-amber-500" />
								</>
							) : (
								<>
									<StatCard icon={Users} label="Участников" value="—" colorClass="bg-slate-100 text-slate-400" />
									<StatCard icon={BarChart3} label="Ср. балл" value="—" colorClass="bg-slate-100 text-slate-400" />
									<StatCard icon={Trophy} label="Рекорд" value="—" colorClass="bg-slate-100 text-slate-400" />
								</>
							)}
						</div>
					</div>
				</header>

				{/* 2. MAIN LAYOUT GRID */}
				<div className="flex gap-6 items-start relative">

					{/* ЛЕВАЯ КОЛОНКА: ТАБЛИЦА */}
					<motion.div
						layout
						className="flex-1 min-w-0 space-y-4"
						initial={false}
					>
						<div className="flex gap-4">
							<div className="bg-white p-2 rounded-[20px] shadow-sm border border-slate-200 flex items-center flex-1">
								<div className="p-3 text-slate-400"><Search size={20} /></div>
								<input
									type="text"
									placeholder="Поиск ученика или школы..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium"
								/>
								{results.length > 0 && (
									<div className="pr-4 text-xs font-bold text-slate-400">
										{filteredResults.length} найдено
									</div>
								)}
							</div>
						</div>

						<div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
							{loading ? (
								<div className="p-10 space-y-6 animate-pulse">
									{[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-slate-50 rounded-2xl w-full" />)}
								</div>
							) : results.length > 0 ? (
								<div className="overflow-x-auto custom-scrollbar">
									<table className="w-full text-left border-collapse">
										<thead className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
											<tr>
												<th className="px-6 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-14 text-center">#</th>
												<th className="px-6 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[220px]">Ученик</th>
												<th className="px-6 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Школа / Класс</th>
												{subjects.map(subj => (
													<th key={subj} className="px-4 py-6 text-[10px] font-bold text-indigo-500 uppercase tracking-wider text-center">{subj}</th>
												))}
												<th className="px-6 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Итог</th>
												<th className="w-10"></th>
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-50">
											{filteredResults.map((item, index) => (
												<React.Fragment key={item.id}>
													<tr
														onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
														className={`group transition-all cursor-pointer hover:bg-slate-50 ${expandedId === item.id ? 'bg-slate-50' : ''}`}
													>
														<td className="px-6 py-5 text-center text-xs font-black text-slate-300 group-hover:text-indigo-400 transition-colors">
															{index + 1}
														</td>
														<td className="px-6 py-5">
															<div className="flex items-center gap-4">
																<div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${index < 3 ? 'bg-indigo-600' : 'bg-slate-400'}`}>
																	{item.student_name.charAt(0)}
																</div>
																<div>
																	<div className="font-black text-slate-700 text-sm leading-tight mb-1">{item.student_name}</div>
																</div>
															</div>
														</td>
														<td className="px-6 py-5">
															<div className="flex flex-col">
																<span className="text-xs font-bold text-slate-700 mb-1 max-w-[200px] truncate" title={item.school_name}>
																	{item.school_name}
																</span>
																<div className="flex gap-2">
																	<span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500">{item.class_name}</span>
																	{item.day && <span className="px-1.5 py-0.5 bg-blue-50 rounded text-[10px] font-bold text-blue-500">День {item.day}</span>}
																</div>
															</div>
														</td>
														{subjects.map(subj => {
															const { score, total } = getSubjectScore(item.details, subj);
															return (
																<td key={subj} className="px-4 py-5 text-center">
																	<div className={`text-sm font-bold ${total > 0 ? 'text-slate-800' : 'text-slate-200'}`}>
																		{total > 0 ? score : '—'}
																	</div>
																</td>
															);
														})}
														<td className="px-6 py-5 text-center">
															<div className="flex flex-col items-center">
																<span className="text-xl font-black text-slate-800">{item.score}</span>
																<span className="text-[10px] text-slate-400 font-bold">из {item.max_score}</span>
															</div>
															<div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden max-w-[80px]">
																<div
																	className={`h-full rounded-full ${item.percentage >= 80 ? 'bg-emerald-500' : item.percentage >= 50 ? 'bg-indigo-500' : 'bg-amber-500'}`}
																	style={{ width: `${item.percentage}%` }}
																/>
															</div>
														</td>
														<td className="px-4">
															<motion.div animate={{ rotate: expandedId === item.id ? 180 : 0 }}>
																<ChevronDown size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
															</motion.div>
														</td>
													</tr>

													{/* --- РАЗВЕРНУТАЯ ЧАСТЬ С ГРАФИКОМ --- */}
													{expandedId === item.id && (
														<tr>
															<td colSpan={100} className="p-0">
																<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden bg-slate-50/50 shadow-inner border-b border-slate-100">
																	<div className="p-8">
																		<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
																			{/* 1. ГРАФИК */}
																			<div className="lg:col-span-1">
																				<StudentRadarChart details={item.details} />
																			</div>

																			{/* 2. ВОПРОСЫ */}
																			<div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
																				{item.details && Object.entries(groupedDetails(item.details)).map(([subj, qs]) => (
																					<div key={subj} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
																						<h4 className="font-bold text-slate-700 text-xs mb-3 flex justify-between items-center">
																							{subj}
																							<span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${(qs.filter(q => q.val === 1).length / qs.length) >= 0.8 ? 'bg-emerald-100 text-emerald-600' :
																									(qs.filter(q => q.val === 1).length / qs.length) >= 0.5 ? 'bg-indigo-100 text-indigo-600' :
																										'bg-rose-100 text-rose-600'
																								}`}>
																								{Math.round((qs.filter(q => q.val === 1).length / qs.length) * 100)}%
																							</span>
																						</h4>
																						<div className="flex flex-wrap gap-1.5">
																							{qs.map((q, i) => (
																								<div
																									key={i}
																									className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-black transition-transform hover:scale-110 cursor-help ${q.val === 1 ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-400 border border-rose-100'
																										}`}
																									title={q.val === 1 ? 'Верно' : 'Ошибка'}
																								>
																									{q.key}
																								</div>
																							))}
																						</div>
																					</div>
																				))}
																			</div>
																		</div>
																	</div>
																</motion.div>
															</td>
														</tr>
													)}
												</React.Fragment>
											))}
										</tbody>
									</table>
								</div>
							) : (
								<div className="flex flex-col items-center justify-center h-[500px] text-center">
									<div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-300">
										<Filter size={48} />
									</div>
									<h3 className="text-xl font-black text-slate-800 mb-2">Настройте фильтры</h3>
									<p className="text-slate-400 font-medium max-w-xs mx-auto">
										Нажмите кнопку фильтров, выберите школу и класс, чтобы увидеть результаты.
									</p>
								</div>
							)}
						</div>
					</motion.div>

					{/* ПРАВАЯ КОЛОНКА: САЙДБАР */}
					<AnimatePresence mode="popLayout">
						{isSidebarOpen && (
							<motion.div
								initial={{ width: 0, opacity: 0 }}
								animate={{ width: "340px", opacity: 1 }}
								exit={{ width: 0, opacity: 0 }}
								className="hidden lg:block relative shrink-0"
							>
								<div className="bg-white rounded-[24px] shadow-sm border border-slate-200 p-6 sticky top-6 h-[calc(100vh-100px)]">

									{/* КНОПКА-ЯЗЫЧОК ДЛЯ СКРЫТИЯ */}
									<button
										onClick={() => setSidebarOpen(false)}
										className="absolute top-[80px] -left-3 w-6 h-12 bg-white border border-slate-200 border-r-0 rounded-l-xl shadow-[-2px_0_5px_rgba(0,0,0,0.02)] flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors z-20 cursor-pointer"
										title="Скрыть панель"
									>
										<ChevronDown size={16} className="-rotate-90" />
									</button>

									<div className="flex items-center gap-3 mb-8">
										<SlidersHorizontal size={24} className="text-slate-800" />
										<h3 className="font-black text-slate-800 text-xl">Фильтры</h3>
									</div>

									<div className="space-y-8 overflow-y-auto h-[calc(100%-80px)] custom-scrollbar pr-2 pb-10">

										<SchoolSelector
											schools={schools}
											selectedSchools={selectedSchools}
											onChange={setSelectedSchools}
										/>

										<div>
											<label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
												<GraduationCap size={12} /> Класс
											</label>
											<div className="grid grid-cols-5 gap-2">
												{[...Array(11)].map((_, i) => {
													const v = String(i + 1);
													const active = selectedGrade === v;
													return (
														<button
															key={v}
															onClick={() => setSelectedGrade(active ? '' : v)}
															className={`aspect-square rounded-xl text-xs font-bold border transition-all flex items-center justify-center
                                                            ${active
																	? 'bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-800/20'
																	: 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-slate-50'}`}
														>
															{v}
														</button>
													)
												})}
											</div>
										</div>

										<div>
											<label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
												<Layers size={12} /> Четверть
											</label>
											<div className="grid grid-cols-2 gap-2">
												{[1, 2, 3, 4].map(n => (
													<button
														key={n}
														onClick={() => setSelectedQuarter(selectedQuarter === String(n) ? '' : String(n))}
														className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${selectedQuarter === String(n) ? 'bg-white border-purple-500 text-purple-600 shadow-md shadow-purple-100 ring-1 ring-purple-500' : 'bg-white border-slate-200 text-slate-500 hover:border-purple-300 hover:text-purple-500'}`}
													>Четверть {n}</button>
												))}
											</div>
										</div>

										<div>
											<label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
												<Zap size={12} /> GAT Тест
											</label>
											<div className="grid grid-cols-2 gap-2">
												{[1, 2, 3, 4].map(n => (
													<button
														key={n}
														onClick={() => setSelectedGat(selectedGat === String(n) ? '' : String(n))}
														className={`py-3 rounded-xl text-xs font-bold border transition-all ${selectedGat === String(n) ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}`}
													>GAT-{n}</button>
												))}
											</div>
										</div>

										<div>
											<label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
												<Calendar size={12} /> День сдачи
											</label>
											<div className="flex bg-slate-100 p-1.5 rounded-xl">
												{['', '1', '2'].map(d => (
													<button
														key={d}
														onClick={() => setSelectedDay(d)}
														className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedDay === d ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
													>
														{d === '' ? 'Все' : `День ${d}`}
													</button>
												))}
											</div>
										</div>

										<button
											onClick={fetchResults}
											disabled={loading}
											className="w-full py-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-900/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
										>
											{loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} strokeWidth={3} />}
											Показать результаты
										</button>
									</div>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* КНОПКА ОТКРЫТИЯ (когда сайдбар скрыт) */}
					<AnimatePresence>
						{!isSidebarOpen && (
							<motion.div
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 20 }}
								className="fixed right-0 top-[180px] z-40"
							>
								<button
									onClick={() => setSidebarOpen(true)}
									className="w-10 h-14 bg-indigo-600 rounded-l-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center text-white hover:bg-indigo-700 hover:w-12 transition-all cursor-pointer"
									title="Открыть фильтры"
								>
									<SlidersHorizontal size={20} />
								</button>
							</motion.div>
						)}
					</AnimatePresence>

				</div>
			</div>

			<style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
		</div>
	);
};

export default GlobalMonitoring;