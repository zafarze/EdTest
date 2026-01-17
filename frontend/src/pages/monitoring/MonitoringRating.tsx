import React, { useState, useRef, useEffect } from 'react';
import {
	Trophy, Medal, Crown, Filter,
	School, Users, ChevronDown, X, Check, SlidersHorizontal, Calendar,
	BarChart3, Zap, BookOpen, Printer,
	LayoutList, LayoutGrid, FileDown, Sheet, Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Импорт сервиса и типов
import { MonitoringService } from '../../services/monitoringService';
import type { StudentData, MonitoringMeta, LeaderInfo } from '../../services/monitoringService';

// --- 🎨 ГЕНЕРАТОР ЦВЕТОВ ---
const SCHOOL_THEMES = [
	{ name: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'bg-emerald-500', badge: 'bg-emerald-100', active: 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-200' },
	{ name: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'bg-blue-500', badge: 'bg-blue-100', active: 'bg-blue-600 border-blue-600 text-white shadow-blue-200' },
	{ name: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'bg-amber-500', badge: 'bg-amber-100', active: 'bg-amber-500 border-amber-500 text-white shadow-amber-200' },
	{ name: 'rose', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: 'bg-rose-500', badge: 'bg-rose-100', active: 'bg-rose-600 border-rose-600 text-white shadow-rose-200' },
	{ name: 'violet', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', icon: 'bg-violet-500', badge: 'bg-violet-100', active: 'bg-violet-600 border-violet-600 text-white shadow-violet-200' },
	{ name: 'cyan', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', icon: 'bg-cyan-500', badge: 'bg-cyan-100', active: 'bg-cyan-600 border-cyan-600 text-white shadow-cyan-200' },
];

const getSchoolTheme = (id: number | undefined, themeName?: string, schoolName?: string) => {
	if (schoolName) {
		if (schoolName.toUpperCase().includes('HORIZON')) return SCHOOL_THEMES.find(t => t.name === 'emerald') || SCHOOL_THEMES[0];
		if (schoolName.toUpperCase().includes('ДЖОМИ')) return SCHOOL_THEMES.find(t => t.name === 'blue') || SCHOOL_THEMES[1];
	}
	if (themeName) {
		const found = SCHOOL_THEMES.find(t => t.name === themeName);
		if (found) return found;
	}
	const numId = Number(id);
	if (typeof numId !== 'number' || isNaN(numId)) return SCHOOL_THEMES[0];
	return SCHOOL_THEMES[numId % SCHOOL_THEMES.length];
};

const getBadgeColor = (slug: string) => {
	const colors: Record<string, string> = {
		math: "bg-indigo-50 text-indigo-600 border-indigo-100",
		physics: "bg-violet-50 text-violet-600 border-violet-100",
		english: "bg-rose-50 text-rose-600 border-rose-100",
		default: "bg-slate-50 text-slate-600 border-slate-100"
	};
	return colors[slug] || colors.default;
};

// --- КОМПОНЕНТЫ UI ---

const ActiveFilters = ({ selectedIds, options, onRemove, t }: any) => {
	if (selectedIds.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-2 mb-4 animate-fade-in-up">
			{selectedIds.map((id: number) => {
				const school = options.find((o: any) => o.id === id);
				if (!school) return null;
				const theme = getSchoolTheme(id, school.color_theme, school.name);
				return (
					<div key={id} className={`flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${theme.bg} ${theme.border} ${theme.text}`}>
						<span>{school.name}</span>
						<button onClick={() => onRemove(id)} className="p-0.5 hover:bg-white/50 rounded-md transition-colors"><X size={12} /></button>
					</div>
				);
			})}
			<button onClick={() => onRemove('all')} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 underline decoration-dashed underline-offset-2 transition-colors">{t('common.reset')}</button>
		</div>
	);
};

const MultiSelectSchool = ({ selectedIds, onChange, options, t }: any) => {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false); };
		document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	return (
		<div className="relative mb-2" ref={dropdownRef}>
			<label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"><School size={12} /> {t('monitoring.rating.filters.school')}</label>
			<button onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between bg-slate-50 border transition-all text-xs font-bold rounded-xl py-2.5 px-3 ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/10 bg-white' : 'border-slate-200 hover:border-slate-300'}`}>
				<span className={`truncate ${selectedIds.length === 0 ? 'text-slate-400' : 'text-slate-700'}`}>{selectedIds.length === 0 ? t('monitoring.rating.filters.all_schools') : `${t('monitoring.rating.filters.selected')}: ${selectedIds.length}`}</span><ChevronDown size={14} />
			</button>
			{isOpen && (
				<div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden max-h-40 overflow-y-auto p-1">
					{options.map((opt: any) => {
						const isSelected = selectedIds.includes(opt.id);
						const theme = getSchoolTheme(opt.id, opt.color_theme, opt.name);
						return (
							<button key={opt.id} onClick={() => { if (isSelected) onChange(selectedIds.filter((x: number) => x !== opt.id)); else onChange([...selectedIds, opt.id]); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors mb-0.5 ${isSelected ? `${theme.bg} ${theme.text}` : 'text-slate-600 hover:bg-slate-50'}`}>
								<span className="truncate flex items-center gap-2">{isSelected && <span className={`w-2 h-2 rounded-full ${theme.icon}`}></span>}{opt.name}</span>{isSelected && <Check size={14} />}
							</button>
						)
					})}
				</div>
			)}
		</div>
	);
};

const AdvancedClassSelector = ({ availableGrades, availableSections, selectedGrades, selectedSections, onGradeChange, onSectionChange, t, schoolClasses = {}, selectedSchoolIds = [] }: any) => {
	const classes = availableGrades.length > 0 ? availableGrades : [];
	const sections = availableSections && availableSections.length > 0 ? availableSections : ['А', 'Б', 'В', 'Г', 'Д'];

	const getButtonStyle = (itemValue: number | string, type: 'grade' | 'section') => {
		const isSelected = type === 'grade' ? selectedGrades.includes(itemValue) : selectedSections.includes(itemValue);
		let affiliatedTheme = null;
		if (selectedSchoolIds.length > 0 && schoolClasses) {
			const ownerSchoolId = selectedSchoolIds.find((sId: number) => {
				const info = schoolClasses[sId];
				if (!info) return false;
				if (type === 'grade') return info.grades.includes(itemValue);
				if (type === 'section') return info.sections.includes(itemValue);
				return false;
			});
			if (ownerSchoolId) {
				const info = schoolClasses[ownerSchoolId];
				affiliatedTheme = getSchoolTheme(ownerSchoolId, info.color_theme, info.name);
			}
		}
		if (isSelected) {
			if (affiliatedTheme) return `${affiliatedTheme.active} shadow-md transform scale-105 transition-all`;
			return 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105 transition-all';
		}
		if (affiliatedTheme) {
			return `${affiliatedTheme.bg} ${affiliatedTheme.text} ${affiliatedTheme.border} hover:opacity-80 transition-all border`;
		}
		return 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all border';
	};

	return (
		<div className="mb-4 animate-fade-in-up">
			<label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"><Users size={12} /> {t('monitoring.rating.filters.class_section')}</label>
			<div className="flex flex-wrap gap-1 mb-2">
				<button onClick={() => onGradeChange([])} className={`py-1.5 px-2.5 rounded-lg text-[10px] font-bold border transition-all ${selectedGrades.length === 0 ? 'bg-slate-100 text-slate-600 border-slate-300 border-dashed' : 'bg-white text-slate-500 border-slate-200'}`}>{t('common.all')}</button>
				{classes.map((num: number) => (
					<button key={num} onClick={() => selectedGrades.includes(num) ? onGradeChange(selectedGrades.filter((x: any) => x !== num)) : onGradeChange([...selectedGrades, num])} className={`w-8 py-1.5 rounded-lg text-[10px] font-bold relative ${getButtonStyle(num, 'grade')}`}>{num}</button>
				))}
			</div>
			<div className="flex flex-wrap gap-1">
				<button onClick={() => onSectionChange([])} className={`flex-1 min-w-[50px] py-1.5 rounded-lg text-[10px] font-bold border transition-all ${selectedSections.length === 0 ? 'bg-slate-100 text-slate-600 border-slate-300 border-dashed' : 'text-slate-400 border-slate-200 hover:text-slate-600'}`}>{t('common.all')}</button>
				{sections.map((sec: string) => (
					<button key={sec} onClick={() => selectedSections.includes(sec) ? onSectionChange(selectedSections.filter((x: any) => x !== sec)) : onSectionChange([...selectedSections, sec])} className={`w-8 py-1.5 rounded-lg text-[10px] font-bold relative ${getButtonStyle(sec, 'section')}`}>{sec}</button>
				))}
			</div>
		</div>
	);
};

const SubjectSelector = ({ availableSubjects, selected, onChange, t }: any) => {
	const toggle = (id: string) => { if (selected.includes(id)) onChange(selected.filter((x: any) => x !== id)); else onChange([...selected, id]); }
	return (
		<div className="mb-4">
			<label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"><BookOpen size={12} /> {t('monitoring.rating.filters.subject')}</label>
			<div className="grid grid-cols-2 gap-2">
				<button onClick={() => onChange([])} className={`col-span-2 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${selected.length === 0 ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}><BookOpen size={14} /> {t('monitoring.rating.filters.all_subjects')}</button>
				{availableSubjects.map((subj: any) => (
					<button key={subj.id} onClick={() => toggle(String(subj.id))} className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all ${selected.includes(String(subj.id)) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>{subj.label}</button>
				))}
			</div>
		</div>
	);
};

const SmartToggleGroup = ({ label, icon: Icon, options, selectedValues, onChange, t }: any) => {
	const toggle = (val: any) => { selectedValues.includes(val) ? onChange(selectedValues.filter((x: any) => x !== val)) : onChange([...selectedValues, val]); }
	if (options.length === 0) return null;
	return (
		<div className="mb-4">
			<label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"><Icon size={12} /> {label}</label>
			<div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-100 flex-wrap gap-1">
				<button onClick={() => onChange([])} className={`flex-1 min-w-[50px] py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all ${selectedValues.length === 0 ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{t('common.all')}</button>
				{options.map((opt: any) => (
					<button key={opt.value} onClick={() => toggle(opt.value)} className={`flex-1 min-w-[50px] py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all ${selectedValues.includes(opt.value) ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{opt.label}</button>
				))}
			</div>
		</div>
	);
}

const Podium = ({ winners, t }: { winners: any[], t: any }) => {
	if (winners.length === 0) return <div className="text-center py-20 text-slate-400 font-bold bg-white/50 rounded-3xl border border-dashed border-slate-200">{t('monitoring.rating.no_data')}</div>;
	const getWinner = (idx: number) => winners[idx] || { name: "-", firstName: "-", lastName: "-", score: 0, avatar: "bg-slate-200" };
	const first = getWinner(0); const second = getWinner(1); const third = getWinner(2);
	const NameBlock = ({ w, size }: any) => (
		<div className="mt-3 text-center leading-tight px-1 flex flex-col items-center">
			<span className={`font-black text-slate-800 uppercase ${size === 'lg' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}`}>{w.lastName}</span>
			<span className={`font-bold text-slate-500 uppercase ${size === 'lg' ? 'text-[10px] sm:text-xs' : 'text-[9px] sm:text-[10px]'}`}>{w.firstName}</span>
		</div>
	);
	return (
		<div className="flex justify-center items-end gap-2 sm:gap-4 mb-8 h-64 sm:h-80 px-2 mt-4 print:hidden">
			<div className="relative flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
				<div className="mb-2 flex flex-col items-center z-10">
					<div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full border-4 border-slate-300 shadow-xl flex items-center justify-center text-white font-bold text-lg sm:text-xl ${second.avatar || 'bg-slate-400'} relative uppercase`}>{second.name.charAt(0)}<div className="absolute -bottom-3 bg-slate-300 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white">2</div></div>
					<NameBlock w={second} size="sm" />
					<p className="text-xs text-slate-400 font-bold mt-1">{second.score} {t('monitoring.rating.stats.points')}</p>
				</div>
				<div className="w-16 sm:w-24 bg-gradient-to-t from-slate-300 to-slate-100 rounded-t-xl h-24 sm:h-36 shadow-lg flex items-end justify-center pb-4 opacity-90 border-t border-white/50"><Medal className="text-slate-400 drop-shadow-sm" size={24} /></div>
			</div>
			<div className="relative flex flex-col items-center z-20 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
				<div className="absolute -top-10 animate-bounce"><Crown size={32} className="text-yellow-400 fill-yellow-400 drop-shadow-lg" /></div>
				<div className="mb-2 flex flex-col items-center">
					<div className={`w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-yellow-400 shadow-2xl flex items-center justify-center text-white font-bold text-2xl sm:text-3xl ${first.avatar || 'bg-yellow-500'} relative uppercase`}>{first.name.charAt(0)}<div className="absolute -bottom-3 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-3 py-0.5 rounded-full border border-white shadow-sm">1</div></div>
					<NameBlock w={first} size="lg" />
					<p className="text-xs text-yellow-600 font-bold bg-yellow-50 px-2 py-0.5 rounded-md mt-1">{first.score} {t('monitoring.rating.stats.points')}</p>
				</div>
				<div className="w-24 sm:w-32 bg-gradient-to-t from-yellow-300 to-yellow-100 rounded-t-xl h-32 sm:h-48 shadow-xl flex items-end justify-center pb-6 opacity-90 border-t border-white/50 relative overflow-hidden"><div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div><Trophy className="text-yellow-600 drop-shadow-md" size={36} /></div>
			</div>
			<div className="relative flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
				<div className="mb-2 flex flex-col items-center z-10">
					<div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full border-4 border-orange-300 shadow-xl flex items-center justify-center text-white font-bold text-lg sm:text-xl ${third.avatar || 'bg-orange-400'} relative uppercase`}>{third.name.charAt(0)}<div className="absolute -bottom-3 bg-orange-300 text-orange-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white">3</div></div>
					<NameBlock w={third} size="sm" />
					<p className="text-xs text-slate-400 font-bold mt-1">{third.score} {t('monitoring.rating.stats.points')}</p>
				</div>
				<div className="w-16 sm:w-24 bg-gradient-to-t from-orange-300 to-orange-100 rounded-t-xl h-20 sm:h-28 shadow-lg flex items-end justify-center pb-4 opacity-90 border-t border-white/50"><Medal className="text-orange-500 drop-shadow-sm" size={24} /></div>
			</div>
		</div>
	);
};

const MiniStat = ({ label, value, icon: Icon, color }: any) => (
	<div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 min-w-[140px]">
		<div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color} shadow-sm`}><Icon size={16} strokeWidth={2.5} /></div>
		<div>
			<div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-none mb-0.5">{label}</div>
			<div className="text-sm font-black text-slate-800 leading-none truncate max-w-[120px]">{value}</div>
		</div>
	</div>
);

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const MonitoringRating = () => {
	// 🔥 1. Подключаем i18n
	const { t, i18n } = useTranslation();
	const [showFilters, setShowFilters] = useState(true);
	const [viewMode, setViewMode] = useState<'global' | 'school'>('global');

	// Данные и состояние
	const [studentsData, setStudentsData] = useState<StudentData[]>([]);
	const [schoolsList, setSchoolsList] = useState<any[]>([]);
	const [meta, setMeta] = useState<MonitoringMeta>({
		availableGrades: [], availableSections: [], availableGats: [], availableSubjects: [], schoolClasses: {}
	});
	const [stats, setStats] = useState({ participants: 0, avgScore: 0 });
	const [leader, setLeader] = useState<LeaderInfo>({
		key: "leader_school", params: {}, value: "-", type: "school"
	});

	// Пагинация и загрузка
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isInitialLoading, setIsInitialLoading] = useState(true);

	const [filters, setFilters] = useState({
		schoolIds: [] as number[],
		grades: [] as number[],
		sections: [] as string[],
		subjects: [] as string[],
		exams: [] as string[],
		days: [] as number[]
	});

	useEffect(() => {
		MonitoringService.getSchools().then(setSchoolsList).catch(console.error);
	}, []);

	const fetchRating = async (isLoadMore = false) => {
		setIsLoading(true);

		const currentPage = isLoadMore ? page + 1 : 1;

		try {
			const data = await MonitoringService.getRating({
				page: currentPage,
				limit: 50,
				schoolIds: filters.schoolIds,
				grades: filters.grades,
				sections: filters.sections,
				exams: filters.exams,
				days: filters.days,
				subjects: filters.subjects,
				lang: i18n.language // 🔥 2. Передаем язык в сервис
			});

			if (isLoadMore) {
				setStudentsData(prev => [...prev, ...(data.data || [])]);
			} else {
				setStudentsData(data.data || []);
			}

			setMeta(prev => ({ ...prev, ...data.meta, schoolClasses: data.meta.schoolClasses || {} }));
			setStats(data.stats || { participants: 0, avgScore: 0 });
			setLeader(data.leader || { key: "leader_school", params: {}, value: "-", type: "school" });

			if (data.meta && data.meta.pagination) {
				setHasMore(data.meta.pagination.has_next);
				setPage(data.meta.pagination.page);
			} else {
				setHasMore(false);
			}

		} catch (e) {
			console.error("Ошибка загрузки рейтинга:", e);
		} finally {
			setIsLoading(false);
			setIsInitialLoading(false);
		}
	};

	// 🔥 3. Обновляем при смене фильтров ИЛИ ЯЗЫКА
	useEffect(() => {
		fetchRating(false);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters, i18n.language]);

	const resetFilters = () => setFilters({ schoolIds: [], grades: [], sections: [], subjects: [], exams: [], days: [] });

	const handleExportExcel = () => {
		if (!studentsData.length) return;
		const ws = XLSX.utils.json_to_sheet(studentsData.map((s, i) => ({
			Rank: i + 1, Name: s.name, School: s.school, Class: `${s.grade}-${s.section}`, Exam: s.exam, Score: s.score
		})));
		const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Rating"); XLSX.writeFile(wb, "gat_rating.xlsx");
	};

	const handleExportPDF = () => {
		try {
			const doc = new jsPDF();
			autoTable(doc, {
				startY: 30,
				head: [['Rank', 'Student', 'School', 'Class', 'Score']],
				body: studentsData.map((s, i) => [i + 1, s.name, s.school, `${s.grade}-${s.section}`, s.score])
			});
			doc.save("gat_rating.pdf");
		} catch (error) { console.error(error); }
	};

	const tableData = studentsData.slice(3);

	const renderContent = () => {
		if (isInitialLoading) {
			return <div className="text-center py-20"><Loader2 className="animate-spin text-indigo-600 mx-auto" size={40} /></div>;
		}

		if (studentsData.length === 0) {
			return <div className="text-center py-20 text-slate-400 font-bold">{t('monitoring.rating.no_data')}</div>;
		}

		if (viewMode === 'global') {
			return (
				<>
					{tableData.map((student, index) => renderStudentRow(student, index + 4))}

					{hasMore && (
						<div className="flex justify-center mt-6 pb-6">
							<button
								onClick={() => fetchRating(true)}
								disabled={isLoading}
								className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
							>
								{isLoading ? <Loader2 className="animate-spin" size={16} /> : <ChevronDown size={16} />}
								{isLoading ? t('common.loading') : t('common.load_more', 'Load More')}
							</button>
						</div>
					)}
				</>
			);
		}

		const grouped: Record<string, StudentData[]> = {};
		tableData.forEach(s => { if (!grouped[s.school]) grouped[s.school] = []; grouped[s.school].push(s); });

		return (
			<>
				{Object.entries(grouped).map(([schoolName, students]) => {
					const schoolId = students[0]?.schoolId || 0;
					const theme = getSchoolTheme(schoolId, undefined, schoolName);
					return (
						<div key={schoolName} className="mb-8">
							<div className="flex items-center gap-3 mb-3 pl-2">
								<div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${theme.icon} shadow-sm`}><School size={16} /></div>
								<h3 className={`font-bold text-lg ${theme.text}`}>{schoolName}</h3>
								<span className={`text-xs font-bold px-2 py-1 rounded-md ${theme.badge} ${theme.text}`}>{students.length}</span>
							</div>
							<div className={`border-l-2 ${theme.border} pl-4 space-y-2`}>
								{students.map((student) => renderStudentRow(student, studentsData.findIndex(s => s.id === student.id) + 1))}
							</div>
						</div>
					);
				})}

				{hasMore && (
					<div className="flex justify-center mt-6 pb-6">
						<button onClick={() => fetchRating(true)} disabled={isLoading} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
							{isLoading ? <Loader2 className="animate-spin" size={16} /> : <ChevronDown size={16} />}
							{t('common.load_more', 'Load More')}
						</button>
					</div>
				)}
			</>
		);
	};

	const renderStudentRow = (student: StudentData, rank: number) => {
		const theme = getSchoolTheme(student.schoolId, undefined, student.school);
		return (
			<div key={student.id} className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/50 border border-white rounded-2xl hover:bg-white hover:shadow-lg hover:scale-[1.005] transition-all duration-200 gap-4 print:border-slate-200 print:shadow-none print:break-inside-avoid mb-2 relative overflow-hidden`}>
				<div className={`absolute left-0 top-0 bottom-0 w-1 ${theme.bg}`}></div>
				<div className="flex items-center gap-4 flex-1 pl-2">
					<span className="font-black text-slate-300 w-8 text-center text-lg group-hover:text-slate-400 transition-colors">{rank}</span>
					<div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${student.avatar || theme.icon}`}>{student.name.charAt(0)}</div>
					<div>
						<h4 className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-indigo-600 transition-colors uppercase">{student.name}</h4>
						<div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
							{viewMode === 'global' && <><span className={`truncate max-w-[150px] font-bold ${theme.text}`}>{student.school}</span><span className="w-1 h-1 rounded-full bg-slate-300"></span></>}
							<span className="font-bold text-slate-600">{student.grade}-{student.section}</span>
							<span className="uppercase ml-2 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{student.exam}</span>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
					<div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 max-w-[200px] sm:max-w-none no-scrollbar">
						{student.badges.map((badge, idx) => (
							<div key={idx} className={`flex flex-col items-center px-2 py-1 rounded-lg border min-w-[45px] ${getBadgeColor(badge.slug)}`}>
								<span className="text-[9px] font-bold uppercase opacity-70">{badge.name}</span>
								<span className="text-sm font-black">{badge.score}</span>
							</div>
						))}
					</div>
					<div className="text-right min-w-[60px] border-l border-slate-200 pl-4"><span className="block font-black text-slate-800 text-xl">{student.score}</span></div>
				</div>
			</div>
		);
	};

	return (
		<div className="w-full relative pb-20 print:p-0 print:pb-0">
			<div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 print:hidden"></div>
			<div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 animate-fade-in-up print:hidden">
				<div><h1 className="text-3xl font-black text-slate-800 flex items-center gap-2"><Crown className="text-yellow-500 fill-yellow-500" />{t('monitoring.rating.title')}</h1></div>
				<div className="flex flex-wrap items-center gap-3">
					<MiniStat label={t('monitoring.rating.stats.participants')} value={stats.participants} icon={Users} color="bg-blue-100 text-blue-600" />
					<MiniStat label={t('monitoring.rating.stats.avg_score')} value={stats.avgScore} icon={BarChart3} color="bg-emerald-100 text-emerald-600" />
					<MiniStat label={t(`monitoring.rating.stats.${leader.key}`, leader.params)} value={leader.value} icon={leader.type === 'school' ? School : Trophy} color="bg-amber-100 text-amber-600" />
					{!showFilters && <button onClick={() => setShowFilters(true)} className="flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all"><SlidersHorizontal size={20} /></button>}
				</div>
			</div>

			<div className="flex flex-col lg:flex-row gap-6 items-start relative">
				<div className={`flex-1 transition-all duration-500 w-full`}>

					{/* ПОДИУМ ПОКАЗЫВАЕМ ВСЕГДА (ПЕРВЫЕ 3) */}
					{!isInitialLoading && studentsData.length > 0 && (
						<Podium winners={studentsData.slice(0, 3)} t={t} />
					)}

					<div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 animate-fade-in-up print:shadow-none print:border-none print:bg-white print:p-0" style={{ animationDelay: '0.4s' }}>
						<div className="flex flex-col sm:flex-row items-center justify-between mb-6 px-2 gap-4 border-b border-dashed border-slate-200 pb-4">
							<div className="flex bg-slate-100 p-1 rounded-xl gap-1">
								<button onClick={() => setViewMode('global')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'global' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><LayoutList size={14} /> {t('monitoring.rating.stats.view_global')}</button>
								<button onClick={() => setViewMode('school')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'school' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={14} /> {t('monitoring.rating.stats.view_school')}</button>
							</div>
							<div className="flex items-center gap-2 print:hidden">
								<button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors"><Sheet size={14} /> Excel</button>
								<button onClick={handleExportPDF} className="flex items-center gap-2 px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-colors"><FileDown size={14} /> PDF</button>
								<button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors"><Printer size={14} /> {t('common.print')}</button>
							</div>
						</div>
						<div className="space-y-2">
							{renderContent()}
						</div>
					</div>
				</div>

				{showFilters && (
					<div className="w-full lg:w-[340px] shrink-0 animate-in slide-in-from-right-10 duration-300 print:hidden">
						<div className="bg-white/80 backdrop-blur-xl border border-white/60 p-5 rounded-[2rem] shadow-xl shadow-slate-200/50 sticky top-24">
							<div className="flex items-center justify-between mb-5 pb-4 border-b border-dashed border-slate-200">
								<h3 className="font-black text-slate-800 text-base flex items-center gap-2"><Filter size={18} className="text-indigo-600" />{t('monitoring.rating.filters.title')}</h3>
								<div className="flex items-center gap-2">
									<button onClick={resetFilters} className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1.5 rounded-lg uppercase">{t('common.reset')}</button>
									<button onClick={() => setShowFilters(false)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
								</div>
							</div>
							<MultiSelectSchool selectedIds={filters.schoolIds} onChange={(ids: number[]) => setFilters({ ...filters, schoolIds: ids })} options={schoolsList} t={t} />
							<ActiveFilters selectedIds={filters.schoolIds} options={schoolsList} onRemove={(id: number | 'all') => id === 'all' ? setFilters({ ...filters, schoolIds: [] }) : setFilters({ ...filters, schoolIds: filters.schoolIds.filter(x => x !== id) })} t={t} />

							<AdvancedClassSelector
								availableGrades={meta.availableGrades}
								availableSections={meta.availableSections}
								selectedGrades={filters.grades}
								selectedSections={filters.sections}
								onGradeChange={(val: any[]) => setFilters({ ...filters, grades: val })}
								onSectionChange={(val: any[]) => setFilters({ ...filters, sections: val })}
								t={t}
								schoolClasses={meta.schoolClasses}
								selectedSchoolIds={filters.schoolIds}
							/>

							<SubjectSelector availableSubjects={meta.availableSubjects} selected={filters.subjects} onChange={(val: string[]) => setFilters({ ...filters, subjects: val })} t={t} />
							<SmartToggleGroup label={t('monitoring.rating.filters.gat')} icon={Zap} selectedValues={filters.exams} onChange={(val: string[]) => setFilters({ ...filters, exams: val })} options={meta.availableGats.map(g => ({ label: g.toUpperCase(), value: g }))} t={t} />
							<SmartToggleGroup label={t('monitoring.rating.filters.day')} icon={Calendar} selectedValues={filters.days} onChange={(val: any[]) => setFilters({ ...filters, days: val })} options={[{ label: t('monitoring.rating.filters.day1', 'День 1'), value: 1 }, { label: t('monitoring.rating.filters.day2', 'День 2'), value: 2 }]} t={t} />
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default MonitoringRating;