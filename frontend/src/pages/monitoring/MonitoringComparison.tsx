import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
	BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
	ResponsiveContainer, Legend, AreaChart, Area, Cell
} from 'recharts';
import {
	Filter, Calendar, School, Layers,
	BookOpen, Hash, AlertTriangle,
	Zap, TrendingUp, LayoutGrid, LayoutDashboard,
	FileWarning, Users, BrainCircuit, Microscope, Calculator,
	ChevronDown, ChevronRight, ChevronLeft,
	FileSpreadsheet, FileText, Printer, Search, Check,
	ArrowUpRight, ArrowDownRight, Download, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- ТИПЫ ДАННЫХ ---
interface ChartData { labels: string[]; datasets: any[]; }
interface HeatmapItem { q_num: string; percentage: number; }
interface HeatmapSchool { school: string; avg: number; }
interface RiskStudent { name: string; class: string; school: string; subject: string; score: number; trend: 'down' | 'stable' | 'up' }

interface DeepData {
	charts: {
		summary: ChartData;
		comparison: ChartData;
		trend: ChartData | null;
		gender: ChartData | null;
	};
	heatmap: {
		data: Record<string, {
			questions: string[];
			schools: Record<string, Record<string, { percentage: number }>>;
		}>;
		summary: Record<string, {
			easiest: HeatmapItem[];
			hardest: HeatmapItem[];
			ranking: HeatmapSchool[];
		}>;
	};
	risk_group: RiskStudent[];
	ai_insights: {
		forecast: { label: string; actual: number | null; predicted: number | null; }[];
		cheating_risk: { name: string; value: number; color: string; }[];
		cluster_analysis: { label: string; value: number; desc: string; icon: any; color: string }[];
		recommendations: { subject: string; topic: string; priority: 'High' | 'Medium'; }[];
	}
}

// --- КОМПОНЕНТЫ UI ---

// Скелетон
const DashboardSkeleton = () => (
	<div className="animate-pulse space-y-6">
		<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
			{[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-2xl"></div>)}
		</div>
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<div className="h-80 bg-slate-200 rounded-[2rem]"></div>
			<div className="h-80 bg-slate-200 rounded-[2rem]"></div>
		</div>
	</div>
);

// 🔥 ВОССТАНОВЛЕННЫЙ ДИЗАЙН МУЛЬТИ-СЕЛЕКТА (Как на скриншоте)
const MultiSelectWithSearch = ({ label, icon: Icon, options, selected, onChange, placeholder, emptyText }: any) => {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState("");
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: any) => {
			if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const filteredOptions = options.filter((opt: any) =>
		opt.label.toLowerCase().includes(search.toLowerCase())
	);

	const toggleOption = (value: string) => {
		if (selected.includes(value)) {
			onChange(selected.filter((v: string) => v !== value));
		} else {
			onChange([...selected, value]);
		}
	};

	return (
		<div className="mb-4" ref={ref}>
			<label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
				<Icon size={12} className="text-slate-400" /> {label}
			</label>
			<div className="relative">
				<button
					onClick={() => setIsOpen(!isOpen)}
					className={`w-full bg-white border text-left text-xs font-bold rounded-xl px-4 py-3 outline-none transition-all flex justify-between items-center shadow-sm ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'}`}
				>
					<span className={`truncate ${selected.length === 0 ? 'text-slate-500' : 'text-slate-800'}`}>
						{selected.length === 0 ? placeholder : `${placeholder} (${selected.length})`}
					</span>
					<ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
				</button>

				{isOpen && (
					<div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-2 max-h-64 overflow-hidden flex flex-col animation-fade-in-up">
						{/* Поле поиска внутри дропдауна */}
						<div className="relative mb-2 shrink-0 px-1">
							<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
							<input
								type="text"
								placeholder={placeholder}
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-9 pr-3 py-2 text-xs font-bold outline-none focus:bg-white focus:border-indigo-200 transition-all placeholder:text-slate-400"
								autoFocus
							/>
						</div>

						<div className="overflow-y-auto custom-scrollbar space-y-1 px-1 pb-1">
							{filteredOptions.length > 0 ? filteredOptions.map((opt: any) => (
								<button
									key={opt.value}
									onClick={() => toggleOption(opt.value)}
									className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold flex items-center justify-between transition-all ${selected.includes(opt.value) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
								>
									<span>{opt.label}</span>
									{selected.includes(opt.value) && <Check size={14} className="text-indigo-600" />}
								</button>
							)) : (
								<div className="text-center py-4 text-[10px] text-slate-400 font-bold">{emptyText}</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

const CompactChip = ({ label, active, onClick, fullWidth = false }: any) => (
	<button
		onClick={onClick}
		className={`px-3 py-2 rounded-lg text-[11px] font-bold transition-all border ${fullWidth ? 'w-full' : 'flex-1'} flex items-center justify-center ${active
			? 'bg-white text-indigo-600 border-indigo-500 shadow-sm shadow-indigo-100 z-10'
			: 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
			}`}
	>
		{label}
	</button>
);

const ExportButton = ({ icon: Icon, label, color, onClick }: any) => {
	const bgColors: any = {
		emerald: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200",
		rose: "bg-rose-500 hover:bg-rose-600 shadow-rose-200",
		blue: "bg-blue-500 hover:bg-blue-600 shadow-blue-200"
	};

	return (
		<button
			onClick={onClick}
			className={`${bgColors[color]} text-white flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold shadow-lg transition-all active:scale-95 flex-1`}
		>
			<Icon size={14} />
			<span>{label}</span>
		</button>
	);
};

const TabButton = ({ id, label, icon: Icon, active, onClick }: any) => (
	<button
		onClick={() => onClick(id)}
		className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${active
			? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
			: 'bg-white/50 text-slate-500 hover:bg-white hover:text-slate-700'
			}`}
	>
		<Icon size={16} />
		{label}
	</button>
);

const MiniStatCard = ({ title, value, sub, icon: Icon, color, trend }: any) => (
	<div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
		<div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
			<Icon size={24} className="text-white" />
		</div>
		<div>
			<div className="text-xs font-bold text-slate-400 uppercase">{title}</div>
			<div className="text-xl font-black text-slate-800 flex items-center gap-2">
				{value}
				{trend && (
					<span className={`text-[10px] px-1.5 py-0.5 rounded-md flex items-center ${trend === 'up' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
						{trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
						{trend === 'up' ? '+4%' : '-2%'}
					</span>
				)}
			</div>
			<div className="text-[10px] font-bold text-slate-400">{sub}</div>
		</div>
	</div>
);

// --- ГЛАВНЫЙ КОМПОНЕНТ ---

const MonitoringComparison = () => {
	const { t } = useTranslation();
	const [isLoading, setIsLoading] = useState(false);
	const [data, setData] = useState<DeepData | null>(null);
	const [activeTab, setActiveTab] = useState<'overview' | 'heatmap' | 'problems' | 'ai' | 'risk'>('overview');
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);

	const [showDelta, setShowDelta] = useState(false);
	const [selectedBar, setSelectedBar] = useState<string | null>(null);

	// --- STATE ФИЛЬТРОВ ---
	const [filters, setFilters] = useState({
		schools: [] as string[],
		grades: [] as string[],
		letters: [] as string[],
		gats: [] as string[],
		subjects: [] as string[], // Добавили фильтр по предметам
		quarters: [] as string[]
	});

	// --- ДИНАМИЧЕСКИЕ ОПЦИИ (УБРАН ХАРДКОР) ---
	const [metaOptions, setMetaOptions] = useState({
		schools: [] as { value: string, label: string }[],
		subjects: [] as { value: string, label: string }[],
		grades: [11, 10, 9, 8, 7, 6, 5],
		letters: ['А', 'Б', 'В', 'Г', 'Д'],
		gats: [1, 2, 3, 4],
	});

	// 1. ЗАГРУЗКА ОПЦИЙ ФИЛЬТРОВ (ШКОЛЫ, ПРЕДМЕТЫ)
	useEffect(() => {
		const fetchOptions = async () => {
			try {
				// Загружаем школы
				const schoolsRes = await fetch('/api/schools/');
				const schoolsData = await schoolsRes.json();

				// Загружаем предметы
				const subjectsRes = await fetch('/api/subjects/');
				const subjectsData = await subjectsRes.json();

				setMetaOptions(prev => ({
					...prev,
					schools: schoolsData.map((s: any) => ({ value: String(s.id), label: s.name })),
					subjects: subjectsData.map((s: any) => ({ value: String(s.id), label: s.name }))
				}));
			} catch (e) {
				console.error("Ошибка загрузки опций:", e);
			}
		};
		fetchOptions();
	}, []);

	// 2. ЗАГРУЗКА ДАННЫХ АНАЛИТИКИ
	const fetchData = async () => {
		setIsLoading(true);
		try {
			const params = new URLSearchParams();
			filters.schools.forEach(id => params.append('schools[]', id));
			filters.grades.forEach(g => params.append('grades[]', String(g)));
			filters.letters.forEach(l => params.append('letters[]', l));
			filters.gats.forEach(g => params.append('gats[]', String(g)));
			filters.subjects.forEach(s => params.append('subjects[]', s));

			const response = await fetch(`/api/analytics/dashboard/?${params.toString()}`);
			if (!response.ok) throw new Error('Network error');

			const jsonData = await response.json();
			setData(jsonData);
		} catch (error) {
			console.error("Failed to fetch analytics:", error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => { fetchData(); }, []); // Загрузка при старте

	const getHeatmapColor = (percent: number) => {
		if (percent >= 80) return 'bg-emerald-500 text-white shadow-emerald-200 shadow-sm';
		if (percent >= 60) return 'bg-emerald-100 text-emerald-800';
		if (percent >= 40) return 'bg-yellow-100 text-yellow-800';
		if (percent >= 20) return 'bg-orange-100 text-orange-800';
		return 'bg-rose-500 text-white shadow-rose-200 shadow-sm';
	};

	const handleBarClick = (data: any) => {
		if (data && data.name) {
			setSelectedBar(selectedBar === data.name ? null : data.name);
		}
	};

	const handleGenerateLesson = (topic: string) => {
		alert(`${t('ai_generating_lesson', 'Генерирую урок по теме:')} ${topic}`);
	};

	return (
		<div className="flex h-screen bg-slate-100 overflow-hidden font-sans">

			<style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .animation-fade-in-up { animation: fadeInUp 0.2s ease-out; }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

			{/* 1. ОСНОВНОЙ КОНТЕНТ */}
			<div className="flex-1 flex flex-col h-full relative min-w-0 transition-all duration-300">
				<div className="pt-8 px-8 pb-4 z-10">
					<header className="mb-6 flex justify-between items-end">
						<div>
							<h1 className="text-3xl font-black text-slate-800 mb-2 flex items-center gap-3">
								<LayoutGrid className="text-indigo-600" size={32} />
								{t('monitoring.rating.filters.title', 'Аналитика')}
							</h1>
							<p className="text-slate-500 font-medium">{t('monitoring.monitoring_page.subtitle', 'Комплексная оценка эффективности')}</p>
						</div>
					</header>

					<div className="flex justify-between items-center">
						<div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/50 backdrop-blur-md rounded-2xl w-fit border border-white/50">
							<TabButton id="overview" label={t('sidebar.dashboard', 'Дашборд')} icon={LayoutDashboard} active={activeTab === 'overview'} onClick={setActiveTab} />
							<TabButton id="ai" label={t('sidebar.ai_insights', 'AI Инсайты')} icon={BrainCircuit} active={activeTab === 'ai'} onClick={setActiveTab} />
							<TabButton id="heatmap" label={t('monitoring.rating.performance', 'Тепловые карты')} icon={LayoutGrid} active={activeTab === 'heatmap'} onClick={setActiveTab} />
							<TabButton id="risk" label={t('monitoring.monitoring_page.tabs.success', 'Группа риска')} icon={Users} active={activeTab === 'risk'} onClick={setActiveTab} />
						</div>

						<button
							onClick={() => setShowDelta(!showDelta)}
							className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${showDelta ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 border-slate-200'}`}
						>
							<TrendingUp size={14} />
							{showDelta ? t('common.cancel', 'Скрыть динамику') : t('monitoring_page.chart_title', 'Показать динамику')}
						</button>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-32">
					{isLoading ? (
						<div className="mt-2">
							<DashboardSkeleton />
						</div>
					) : data ? (
						<div className="mt-2">
							<AnimatePresence mode="wait">

								{/* 📊 ТАБ 1: ДАШБОРД */}
								{activeTab === 'overview' && (
									<motion.div
										key="overview"
										initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
										className="space-y-6"
									>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
											{/* Берем первое значение из summary графика для отображения среднего балла */}
											<MiniStatCard
												title={t('monitoring.rating.stats.avg_score', 'Ср. балл')}
												value={data.charts.summary?.datasets?.[0]?.data?.[0] || '-'}
												sub="Global"
												icon={Zap} color="bg-indigo-500" trend="up"
											/>
											<MiniStatCard title={t('stats.total_students', 'Всего учеников')} value="1,245" sub="Active" icon={Users} color="bg-emerald-500" />
											<MiniStatCard title={t('monitoring.rating.filters.title', 'Группа риска')} value={data.risk_group.length} sub="Требуют внимания" icon={AlertTriangle} color="bg-rose-500" trend="down" />
										</div>

										<div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-white/60">
											<div className="flex justify-between items-center mb-6">
												<h3 className="font-bold text-lg text-slate-700">🏆 {t('monitoring.rating.subtitle', 'Рейтинг')}</h3>
												<div className="text-xs text-slate-400 font-bold bg-slate-50 px-3 py-1 rounded-lg">
													{selectedBar ? `${t('monitoring.rating.filters.selected')}: ${selectedBar}` : t('common.actions', 'Действия')}
												</div>
											</div>
											<div className="h-80">
												<ResponsiveContainer width="100%" height="100%">
													<BarChart
														data={data.charts.comparison.datasets[0].data.map((val: any, i: number) => ({
															name: data.charts.comparison.labels[i],
															val,
														}))}
														onClick={handleBarClick}
														cursor="pointer"
													>
														<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
														<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
														<YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
														<RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
														<Bar dataKey="val" name={t('monitoring.rating.stats.avg_score')} fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40}>
															{data.charts.comparison.labels.map((entry: any, index: number) => (
																<Cell key={`cell-${index}`} fill={selectedBar === entry ? '#4f46e5' : '#6366f1'} />
															))}
														</Bar>
														<Legend wrapperStyle={{ paddingTop: '20px' }} />
													</BarChart>
												</ResponsiveContainer>
											</div>
										</div>

										{/* TREND CHART */}
										<div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-white/60">
											<h3 className="font-bold text-lg text-slate-700 mb-6 flex items-center gap-2">
												<TrendingUp size={20} className="text-emerald-500" /> {t('monitoring.monitoring_page.chart_title', 'Динамика')}
											</h3>
											<div className="h-64">
												<ResponsiveContainer width="100%" height="100%">
													<AreaChart data={data.charts.trend?.labels.map((l, i) => {
														const obj: any = { name: l };
														data.charts.trend?.datasets.forEach(ds => obj[ds.label] = ds.data[i]);
														return obj;
													})}>
														<defs>
															<linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
														</defs>
														<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
														<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
														<YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
														<RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
														{data.charts.trend?.datasets.map((ds, idx) => (
															<Area key={idx} type="monotone" dataKey={ds.label} stroke={idx === 0 ? "#8b5cf6" : "#10b981"} fill={idx === 0 ? "url(#grad1)" : "transparent"} strokeWidth={3} />
														))}
													</AreaChart>
												</ResponsiveContainer>
											</div>
										</div>
									</motion.div>
								)}

								{/* 🧠 AI ИНСАЙТЫ */}
								{activeTab === 'ai' && (
									<motion.div
										key="ai"
										initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
										className="space-y-6"
									>
										<div className="p-5 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-3xl text-white shadow-xl shadow-indigo-200 flex items-center justify-between">
											<div className="flex items-center gap-5">
												<div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-inner"><BrainCircuit size={32} /></div>
												<div>
													<h3 className="font-bold text-lg">AI Analyst</h3>
													<p className="text-indigo-100 text-sm opacity-90">{t('sidebar.ai_insights')}</p>
												</div>
											</div>
										</div>

										<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
											<div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-white/60">
												<h3 className="font-bold text-lg text-slate-700 mb-6 flex items-center gap-2">
													<Sparkles size={20} className="text-amber-500" /> {t('monitoring.monitoring_page.tabs.success', 'Рекомендации')}
												</h3>
												<div className="space-y-3">
													{data.ai_insights.recommendations.map((rec, idx) => (
														<div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:border-indigo-200 transition-all">
															<div>
																<div className="text-xs font-bold text-slate-400 uppercase mb-1">{rec.subject}</div>
																<div className="font-bold text-slate-800">{rec.topic}</div>
															</div>
															<button
																onClick={() => handleGenerateLesson(rec.topic)}
																className="bg-white text-indigo-600 border border-indigo-200 px-3 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2"
															>
																<BrainCircuit size={14} />
																{t('common.create', 'Создать')}
															</button>
														</div>
													))}
												</div>
											</div>

											<div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-white/60">
												<h3 className="font-bold text-lg text-slate-700 mb-4 flex items-center gap-2">
													<Microscope size={20} className="text-indigo-500" /> Analysis
												</h3>
												<div className="space-y-4">
													{data.ai_insights.cluster_analysis.map((c, idx) => (
														<div key={idx} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex gap-4 items-start hover:bg-white hover:shadow-md transition-all">
															<div className={`p-3 rounded-xl ${c.color} shrink-0`}><LayoutGrid size={20} /></div>
															<div className="flex-1">
																<div className="flex justify-between items-center mb-1">
																	<div className="font-bold text-slate-800">{c.label}</div>
																	<div className="text-xs font-black text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-100">{c.value}%</div>
																</div>
																<div className="text-xs text-slate-500 font-medium mb-3">{c.desc}</div>
																<div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
																	<div className="h-full bg-current opacity-70" style={{ width: `${c.value}%`, color: 'inherit' }}></div>
																</div>
															</div>
														</div>
													))}
												</div>
											</div>
										</div>
									</motion.div>
								)}

								{/* ТЕПЛОВЫЕ КАРТЫ */}
								{activeTab === 'heatmap' && (
									<motion.div key="heatmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
										{Object.entries(data.heatmap.data).map(([subject, hData]) => (
											<div key={subject} className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-white/60 mb-6">
												<h3 className="font-bold text-lg text-slate-700 mb-4 flex items-center gap-2">
													<BookOpen size={20} className="text-indigo-500" /> {subject}
												</h3>

												<div className="relative overflow-x-auto pb-4 no-scrollbar rounded-xl border border-slate-100">
													<div className="min-w-max">
														<div className="flex bg-slate-50 border-b border-slate-200">
															<div className="w-56 shrink-0 p-3 text-xs font-bold text-slate-500 uppercase sticky left-0 bg-slate-50 z-10 border-r border-slate-200">{t('monitoring.rating.filters.school')}</div>
															{hData.questions.map(q => (
																<div key={q} className="w-12 text-center p-3 text-xs font-bold text-slate-400 border-r border-slate-100">#{q}</div>
															))}
														</div>
														{Object.entries(hData.schools).map(([schoolName, questions], idx) => (
															<div key={schoolName} className={`flex items-center group hover:bg-indigo-50/30 transition-colors ${idx !== Object.keys(hData.schools).length - 1 ? 'border-b border-slate-100' : ''}`}>
																<div className="w-56 shrink-0 p-3 text-xs font-bold text-slate-700 truncate sticky left-0 bg-white group-hover:bg-indigo-50/30 z-10 border-r border-slate-200 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">
																	<div className="flex items-center gap-2">
																		<div className={`w-1.5 h-1.5 rounded-full ${['bg-indigo-400', 'bg-pink-400', 'bg-emerald-400'][idx % 3]}`}></div>
																		{schoolName}
																	</div>
																</div>
																{hData.questions.map(q => {
																	const cell = questions[q];
																	return (
																		<div key={q} className="w-12 h-10 p-1 border-r border-slate-50">
																			<div
																				className={`w-full h-full rounded flex items-center justify-center text-[10px] font-bold transition-all hover:scale-110 cursor-default ${cell ? getHeatmapColor(cell.percentage) : 'bg-slate-50 text-slate-300'}`}
																				title={cell ? `${cell.percentage}%` : t('common.no_data')}
																			>
																				{cell ? Math.round(cell.percentage) : '-'}
																			</div>
																		</div>
																	)
																})}
															</div>
														))}
													</div>
												</div>
											</div>
										))}
									</motion.div>
								)}

								{/* ГРУППА РИСКА */}
								{activeTab === 'risk' && (
									<motion.div
										key="risk"
										initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
										className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-white/60"
									>
										<h3 className="font-bold text-lg text-rose-600 mb-6 flex items-center gap-2">
											<AlertTriangle size={20} className="fill-rose-100" /> {t('monitoring.rating.filters.title', 'Зона риска')}
										</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
											{data.risk_group.map((st, idx) => (
												<div key={idx} className="p-5 rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/40 to-white hover:shadow-lg hover:shadow-rose-100 transition-all group relative overflow-hidden">
													<div className="relative z-10 flex justify-between items-start mb-4">
														<div className="flex items-center gap-4">
															<div className="w-12 h-12 rounded-full bg-white text-rose-600 flex items-center justify-center font-black text-lg border-2 border-rose-50 shadow-sm">
																{st.name.charAt(0)}
															</div>
															<div>
																<div className="font-black text-slate-800 text-base group-hover:text-rose-600 transition-colors">{st.name}</div>
																<div className="text-xs text-slate-500 font-bold uppercase tracking-wide mt-0.5">{st.school} • {st.class}</div>
															</div>
														</div>
														<div className="bg-rose-500 text-white font-black text-sm px-2.5 py-1.5 rounded-xl shadow-lg shadow-rose-200 transform group-hover:scale-110 transition-transform">
															{st.score}
														</div>
													</div>
													<div className="relative z-10 flex items-center gap-2 text-xs font-bold text-rose-500 bg-white px-3 py-2 rounded-xl border border-rose-100 shadow-sm mb-2">
														<FileWarning size={14} />
														{st.subject}
													</div>
													{st.trend === 'down' && (
														<div className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
															<ArrowDownRight size={12} />
															{t('common.irreversible', 'Возможно ухудшение')}
														</div>
													)}
												</div>
											))}
										</div>
									</motion.div>
								)}

							</AnimatePresence>
						</div>
					) : (
						<div className="flex items-center justify-center h-full pt-20 text-slate-400 font-bold">
							{t('common.no_data')}
						</div>
					)}
				</div>
			</div>

			{/* КНОПКА ОТКРЫТИЯ/ЗАКРЫТИЯ САЙДБАРА */}
			<button
				onClick={() => setIsSidebarOpen(!isSidebarOpen)}
				className={`absolute top-1/2 -translate-y-1/2 z-50 w-8 h-12 bg-white rounded-l-xl shadow-lg border-l border-y border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:w-10 transition-all cursor-pointer`}
				style={{ right: isSidebarOpen ? '300px' : '0' }}
			>
				{isSidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
			</button>

			{/* 2. ПРАВАЯ ЧАСТЬ: КОМПАКТНЫЙ САЙДБАР */}
			<div className={`relative h-full transition-all duration-300 ease-in-out z-20 shrink-0 bg-white/95 backdrop-blur-2xl border-l border-white/50 shadow-2xl flex flex-col overflow-hidden ${isSidebarOpen ? 'w-[300px]' : 'w-0'}`}>

				<div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
					<h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
						<Filter size={20} className="text-indigo-600" />
						{t('monitoring.rating.filters.title')}
					</h2>
					<button
						onClick={() => setFilters({ schools: [], grades: [], letters: [], gats: [], subjects: [], quarters: [] })}
						className="bg-rose-50 text-rose-500 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide uppercase hover:bg-rose-100 transition-colors"
					>
						{t('common.reset')}
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-5 no-scrollbar bg-white">

					{/* --- ЭКСПОРТ --- */}
					<div className="mb-6">
						<label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t('common.export_to')}</label>
						<div className="flex gap-2">
							<ExportButton label="Excel" color="emerald" icon={FileSpreadsheet} onClick={() => alert('📊 Excel...')} />
							<ExportButton label="PDF" color="rose" icon={FileText} onClick={() => alert('📄 PDF...')} />
							<ExportButton label={t('common.print')} color="blue" icon={Printer} onClick={() => window.print()} />
						</div>
					</div>

					<hr className="border-slate-100 mb-5" />

					{/* МУЛЬТИ-СЕЛЕКТ ШКОЛ */}
					<MultiSelectWithSearch
						label={t('monitoring.rating.filters.school')}
						icon={School}
						options={metaOptions.schools}
						selected={filters.schools}
						onChange={(val: string[]) => setFilters({ ...filters, schools: val })}
						placeholder={t('monitoring.rating.filters.all_schools', 'Все школы')}
						emptyText={t('common.no_data')}
					/>

					{/* GAT ТЕСТ */}
					<div className="mb-4">
						<label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
							<Hash size={12} /> {t('monitoring.rating.filters.gat')}
						</label>
						<div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
							<CompactChip label={t('common.all')} active={filters.gats.length === 0} fullWidth onClick={() => setFilters({ ...filters, gats: [] })} />
							{metaOptions.gats.map(g => (
								<CompactChip
									key={g}
									label={`GAT${g}`}
									active={filters.gats.includes(String(g))}
									fullWidth
									onClick={() => {
										const s = String(g);
										setFilters(prev => ({ ...prev, gats: prev.gats.includes(s) ? prev.gats.filter(x => x !== s) : [...prev.gats, s] }))
									}}
								/>
							))}
						</div>
					</div>

					{/* КЛАССЫ */}
					<div className="mb-4">
						<label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
							<Layers size={12} /> {t('classes.modal.grade_label')}
						</label>
						<div className="flex flex-wrap gap-1 mb-1.5">
							<CompactChip label={t('common.all')} active={filters.grades.length === 0} onClick={() => setFilters({ ...filters, grades: [] })} />
							{metaOptions.grades.map(g => (
								<CompactChip
									key={g}
									label={g}
									active={filters.grades.includes(String(g))}
									onClick={() => {
										const s = String(g);
										setFilters(prev => ({ ...prev, grades: prev.grades.includes(s) ? prev.grades.filter(x => x !== s) : [...prev.grades, s] }))
									}}
								/>
							))}
						</div>
					</div>

					{/* БУКВЫ */}
					<div className="mb-4">
						<label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
							<Hash size={12} /> {t('classes.modal.section_label')}
						</label>
						<div className="flex flex-wrap gap-1">
							{metaOptions.letters.map(l => (
								<CompactChip
									key={l}
									label={l}
									active={filters.letters.includes(l)}
									onClick={() => {
										setFilters(prev => ({ ...prev, letters: prev.letters.includes(l) ? prev.letters.filter(x => x !== l) : [...prev.letters, l] }))
									}}
								/>
							))}
						</div>
					</div>

					{/* ПРЕДМЕТЫ (ТЕПЕРЬ ТОЖЕ ЧЕРЕЗ API) */}
					<MultiSelectWithSearch
						label={t('monitoring.rating.filters.subject')}
						icon={BookOpen}
						options={metaOptions.subjects}
						selected={filters.subjects}
						onChange={(val: string[]) => setFilters({ ...filters, subjects: val })}
						placeholder={t('monitoring.rating.filters.all_subjects', 'Все предметы')}
						emptyText={t('common.no_data')}
					/>

				</div>

				<div className="p-5 border-t border-slate-100 bg-slate-50">
					<button
						onClick={fetchData}
						className="w-full bg-slate-900 text-white text-xs font-bold py-3.5 rounded-xl shadow-lg hover:bg-indigo-600 hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-95"
					>
						<Download size={16} />
						{t('common.save')} & {t('common.actions')}
					</button>
				</div>
			</div>

		</div>
	);
};

export default MonitoringComparison;