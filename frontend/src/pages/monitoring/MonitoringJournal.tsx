import React, { useState, useRef, useEffect } from 'react';
import {
	BookOpen, Calendar, Filter, Printer,
	SlidersHorizontal, User, Download,
	LayoutList, LayoutGrid, CheckCircle2, XCircle, Loader2,
	School, Zap, ChevronDown, X, Check, Users, BarChart3
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- ТИПЫ ДАННЫХ ---
interface JournalEntry {
	id: number;
	studentName: string;
	studentId: string;
	className: string;
	examDate: string;
	grades: Record<string, { score: number; grade: 2 | 3 | 4 | 5; status: 'passed' | 'failed' }>;
	schoolName: string;
	schoolId: number;
}

// --- 🎨 UI КОМПОНЕНТЫ (ФИЛЬТРЫ - Единый стиль) ---

const SCHOOL_THEMES = [
	{ name: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'bg-emerald-500' },
	{ name: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'bg-blue-500' },
	{ name: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'bg-amber-500' },
];

const getSchoolTheme = (id: number) => SCHOOL_THEMES[id % SCHOOL_THEMES.length];

const ActiveFilters = ({ selectedIds, options, onRemove, t }: any) => {
	if (selectedIds.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-2 mb-4 animate-fade-in-up">
			{selectedIds.map((id: number) => {
				const school = options.find((o: any) => o.id === id);
				if (!school) return null;
				const theme = getSchoolTheme(id);
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
						return (
							<button key={opt.id} onClick={() => { if (isSelected) onChange(selectedIds.filter((x: number) => x !== opt.id)); else onChange([...selectedIds, opt.id]); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors mb-0.5 ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
								<span className="truncate flex items-center gap-2">{opt.name}</span>{isSelected && <Check size={14} />}
							</button>
						)
					})}
				</div>
			)}
		</div>
	);
};

const AdvancedClassSelector = ({ selectedGrades, selectedSections, onGradeChange, onSectionChange, t }: any) => {
	const classes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
	const sections = ['А', 'Б', 'В', 'Г', 'Д'];

	const getButtonStyle = (itemValue: number | string, type: 'grade' | 'section') => {
		const isSelected = type === 'grade' ? selectedGrades.includes(itemValue) : selectedSections.includes(itemValue);
		if (isSelected) return 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105 transition-all';
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

const SubjectSelector = ({ selected, onChange, t }: any) => {
	const subjects = [
		{ id: 'math', label: t('subjects.short_labels.math', 'Math') },
		{ id: 'eng', label: t('subjects.short_labels.english', 'English') },
		{ id: 'phys', label: t('subjects.short_labels.physics', 'Physics') },
		{ id: 'chem', label: t('subjects.short_labels.chemistry', 'Chem') },
		{ id: 'bio', label: t('subjects.short_labels.biology', 'Bio') }
	];
	const toggle = (id: string) => { if (selected.includes(id)) onChange(selected.filter((x: any) => x !== id)); else onChange([...selected, id]); }
	return (
		<div className="mb-4">
			<label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"><BookOpen size={12} /> {t('monitoring.rating.filters.subject')}</label>
			<div className="grid grid-cols-2 gap-2">
				<button onClick={() => onChange([])} className={`col-span-2 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${selected.length === 0 ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}><BookOpen size={14} /> {t('monitoring.rating.filters.all_subjects')}</button>
				{subjects.map((subj: any) => (
					<button key={subj.id} onClick={() => toggle(subj.id)} className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all ${selected.includes(subj.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>{subj.label}</button>
				))}
			</div>
		</div>
	);
};

const SmartToggleGroup = ({ label, icon: Icon, options, selectedValues, onChange, t }: any) => {
	const toggle = (val: any) => { selectedValues.includes(val) ? onChange(selectedValues.filter((x: any) => x !== val)) : onChange([...selectedValues, val]); }
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
const MonitoringJournal = () => {
	const { t, i18n } = useTranslation();
	const [isLoading, setIsLoading] = useState(false);
	const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
	const [showFilters, setShowFilters] = useState(true);

	const [journalData, setJournalData] = useState<JournalEntry[]>([]);

	// Статистика
	const [stats, setStats] = useState({ total: 0, passed: 0, failed: 0, avgScore: 0 });

	// Фильтры
	const [filters, setFilters] = useState({
		schoolIds: [] as number[],
		grades: [] as number[],
		sections: [] as string[],
		subjects: [] as string[],
		exams: [] as string[],
		days: [] as number[]
	});

	// Mock Schools
	const schools = [
		{ id: 1, name: 'Abdurahmoni Jomi' },
		{ id: 2, name: 'Horizon Dushanbe' },
		{ id: 3, name: 'Oxford School' }
	];

	// --- ГЕНЕРАТОР MOCK ДАННЫХ ---
	const generateData = () => {
		setIsLoading(true);

		// Эмуляция задержки сети
		setTimeout(() => {
			const count = Math.floor(Math.random() * 15) + 10; // 10-25 учеников
			const selectedSubjects = filters.subjects.length > 0 ? filters.subjects : ['math', 'phys', 'chem'];

			const generateGrade = () => {
				const score = Math.floor(Math.random() * 60) + 40; // 40-100
				let grade: 2 | 3 | 4 | 5 = 2;
				if (score >= 85) grade = 5;
				else if (score >= 70) grade = 4;
				else if (score >= 50) grade = 3;
				return { score, grade, status: grade > 2 ? 'passed' : 'failed' };
			};

			const newData: JournalEntry[] = Array.from({ length: count }).map((_, i) => {
				// Генерация имен
				const firstNames = ["Ali", "Faridun", "Madina", "Oisha", "Umar", "Sohib", "Anisa", "Firuz", "Rustam", "Zarina"];
				const lastNames = ["Karimov", "Nazarov", "Sharipov", "Aliev", "Rahmonov", "Saidov", "Odinaev"];
				const name = `${lastNames[Math.floor(Math.random() * lastNames.length)]} ${firstNames[Math.floor(Math.random() * firstNames.length)]}`;

				// Школа
				const school = filters.schoolIds.length > 0
					? schools.find(s => s.id === filters.schoolIds[0]) || schools[0]
					: schools[Math.floor(Math.random() * schools.length)];

				const grades: Record<string, { score: number; grade: 2 | 3 | 4 | 5; status: 'passed' | 'failed' }> = {};
				selectedSubjects.forEach(sub => {
					grades[sub] = generateGrade();
				});

				return {
					id: 202600 + i,
					studentName: name,
					studentId: `ST-${202600 + i}`,
					className: `${filters.grades[0] || 11}-${filters.sections[0] || 'A'}`,
					examDate: '12.01.2026',
					grades,
					schoolName: school.name,
					schoolId: school.id
				};
			});

			// Сортировка по имени
			newData.sort((a, b) => a.studentName.localeCompare(b.studentName));
			setJournalData(newData);

			// Расчет статистики
			let passedStudents = 0;
			let totalStudentScores = 0;
			let totalStudentCounts = 0;
			newData.forEach(student => {
				const studentGrades = Object.values(student.grades);
				const studentAvg = studentGrades.reduce((sum, g) => sum + g.score, 0) / studentGrades.length;
				totalStudentScores += studentAvg;
				totalStudentCounts++;
				const allPassed = studentGrades.every(g => g.status === 'passed');
				if (allPassed) passedStudents++;
			});
			const avg = Math.round(totalStudentScores / totalStudentCounts) || 0;
			setStats({ total: newData.length, passed: passedStudents, failed: newData.length - passedStudents, avgScore: avg });

			setIsLoading(false);
		}, 600);
	};

	// Обновление данных при смене фильтров
	useEffect(() => {
		generateData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filters, i18n.language]);

	const resetFilters = () => setFilters({ schoolIds: [], grades: [], sections: [], subjects: [], exams: [], days: [] });

	// Экспорт Excel
	const handleExportExcel = () => {
		const selectedSubjects = filters.subjects.length > 0 ? filters.subjects : ['math', 'phys', 'chem'];
		const exportData = journalData.map(j => {
			const row: any = {
				ID: j.studentId,
				Student: j.studentName,
				Class: j.className,
				School: j.schoolName,
			};
			selectedSubjects.forEach(sub => {
				const g = j.grades[sub];
				row[t(`subjects.short_labels.${sub}`, sub.toUpperCase())] = g ? g.grade : '-';
			});
			return row;
		});
		const ws = XLSX.utils.json_to_sheet(exportData);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Journal");
		XLSX.writeFile(wb, "Journal_Export.xlsx");
	};

	// --- РЕНДЕР: Карточки ---
	const renderCard = (entry: JournalEntry) => {
		const allPassed = Object.values(entry.grades).every(g => g.status === 'passed');
		const getGradeColor = (grade: number) =>
			grade === 5 ? 'text-emerald-500 bg-emerald-50 border-emerald-200' :
				grade === 4 ? 'text-blue-500 bg-blue-50 border-blue-200' :
					grade === 3 ? 'text-amber-500 bg-amber-50 border-amber-200' :
						'text-rose-500 bg-rose-50 border-rose-200';

		return (
			<div key={entry.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all flex items-center justify-between group animate-fade-in-up">
				<div className="flex items-center gap-4">
					<div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-sm transition-transform group-hover:scale-110 ${allPassed ? 'bg-indigo-500' : 'bg-rose-400'}`}>
						{entry.studentName.charAt(0)}
					</div>
					<div>
						<h4 className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-indigo-600 transition-colors">{entry.studentName}</h4>
						<div className="flex items-center gap-2 text-xs font-medium text-slate-400 mt-0.5">
							<span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase tracking-wider">{entry.studentId}</span>
							<span>{entry.schoolName}</span>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{Object.entries(entry.grades).map(([sub, g]) => (
						<div key={sub} className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl font-black border-2 ${getGradeColor(g.grade)}`}>
							{g.grade}
						</div>
					))}
				</div>
			</div>
		);
	};

	// --- РЕНДЕР: Таблица ---
	const renderTable = () => {
		const selectedSubjects = filters.subjects.length > 0 ? filters.subjects : ['math', 'phys', 'chem'];
		const getGradeColor = (grade: number) =>
			grade === 5 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
				grade === 4 ? 'bg-blue-50 text-blue-600 border-blue-100' :
					grade === 3 ? 'bg-amber-50 text-amber-600 border-amber-100' :
						'bg-rose-50 text-rose-600 border-rose-100';

		return (
			<div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm animate-fade-in-up relative flex flex-col h-full">
				<div className="overflow-auto flex-1 w-full">
					<table className="w-full text-left border-collapse">
						<thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
							<tr>
								<th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-12 bg-slate-50">#</th>
								<th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50">{t('monitoring.journal.student', 'Student')}</th>
								{selectedSubjects.map(sub => (
									<th key={sub} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center bg-slate-50">
										{t(`subjects.short_labels.${sub}`, sub.toUpperCase())}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{journalData.map((entry, idx) => (
								<tr key={entry.id} className="hover:bg-slate-50/80 transition-colors group">
									<td className="px-6 py-4 text-xs font-bold text-slate-400">{idx + 1}</td>
									<td className="px-6 py-4">
										<div className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{entry.studentName}</div>
										<div className="text-[10px] text-slate-400 font-bold mt-0.5">{entry.studentId} • {entry.schoolName}</div>
									</td>
									{selectedSubjects.map(sub => {
										const g = entry.grades[sub];
										return (
											<td key={sub} className="px-6 py-4 text-center">
												<span className={`inline-flex w-8 h-8 items-center justify-center rounded-lg font-black text-sm border ${g ? getGradeColor(g.grade) : ''}`}>
													{g ? g.grade : '-'}
												</span>
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		);
	};

	return (
		<div className="w-full relative pb-20 print:p-0">
			{/* Фон */}
			<div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-40 print:hidden"></div>

			{/* Заголовок */}
			<div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 animate-fade-in-up print:hidden">
				<div>
					<h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
						<span className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"><BookOpen size={20} /></span>
						{t('monitoring.journal.title', 'Electronic Journal')}
					</h1>
					<div className="flex gap-4 mt-2 ml-14">
						<MiniStat label={t('monitoring.journal.stats.avg', 'Avg Score')} value={stats.avgScore} icon={BarChart3} color="bg-indigo-100 text-indigo-600" />
						<MiniStat label={t('monitoring.journal.stats.passed', 'Passed')} value={`${Math.round((stats.passed / stats.total) * 100) || 0}%`} icon={CheckCircle2} color="bg-emerald-100 text-emerald-600" />
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-3 ml-14 xl:ml-0">
					<button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95">
						<Printer size={18} /> <span className="hidden sm:inline">{t('common.print', 'Print')}</span>
					</button>
					<button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 hover:-translate-y-0.5 transition-all active:scale-95 active:translate-y-0">
						<Download size={18} /> <span className="hidden sm:inline">Excel</span>
					</button>
					<button onClick={() => setShowFilters(!showFilters)} className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${showFilters ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white text-slate-400 shadow-sm border border-slate-200 hover:bg-slate-50'}`}>
						{showFilters ? <Filter size={20} /> : <SlidersHorizontal size={20} />}
					</button>
				</div>
			</div>

			<div className="flex flex-col lg:flex-row gap-6 items-start relative">

				{/* Основной контент */}
				<div className="flex-1 w-full min-w-0">
					{/* Тулбар */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white/60 backdrop-blur-md p-2 rounded-2xl border border-white/60 shadow-sm print:hidden animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
						<div className="flex items-center gap-3 px-2">
							<div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><User size={18} /></div>
							<div className="flex flex-col leading-tight">
								<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{t('monitoring.journal.class_list', 'Class List')}</span>
								<span className="text-sm font-black text-slate-800">
									{filters.grades.length > 0 ? filters.grades.join(',') : 'All'} - {filters.sections.length > 0 ? filters.sections.join(',') : 'A'}
									<span className="text-slate-300 mx-1">|</span> {journalData.length} {t('monitoring.rating.found', 'students')}
								</span>
							</div>
						</div>
						<div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
							<button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
								<LayoutList size={16} /> {t('monitoring.journal.view_table', 'Table')}
							</button>
							<button onClick={() => setViewMode('cards')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'cards' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
								<LayoutGrid size={16} /> {t('monitoring.journal.view_cards', 'Cards')}
							</button>
						</div>
					</div>

					{isLoading ? (
						<div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-3xl border border-dashed border-slate-200">
							<Loader2 className="animate-spin text-indigo-600 mb-2" size={40} />
							<span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('common.loading')}</span>
						</div>
					) : (
						viewMode === 'table' ? renderTable() : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{journalData.map(renderCard)}</div>
					)}

					{!isLoading && journalData.length === 0 && (
						<div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold">
							{t('common.no_data')}
						</div>
					)}
				</div>

				{/* Фильтры (Sidebar) */}
				{showFilters && (
					<div className="w-full lg:w-[320px] shrink-0 print:hidden animate-in slide-in-from-right-10 duration-300">
						<div className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 sticky top-24">
							<div className="flex items-center justify-between mb-5 pb-4 border-b border-dashed border-slate-200">
								<h3 className="font-black text-slate-800 text-base flex items-center gap-2"><Filter size={18} className="text-indigo-600" />{t('monitoring.rating.filters.title')}</h3>
								<div className="flex items-center gap-2">
									<button onClick={resetFilters} className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1.5 rounded-lg uppercase">{t('common.reset')}</button>
									<button onClick={() => setShowFilters(false)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
								</div>
							</div>

							<MultiSelectSchool selectedIds={filters.schoolIds} onChange={(ids: number[]) => setFilters({ ...filters, schoolIds: ids })} options={schools} t={t} />
							<ActiveFilters selectedIds={filters.schoolIds} options={schools} onRemove={(id: number | 'all') => id === 'all' ? setFilters({ ...filters, schoolIds: [] }) : setFilters({ ...filters, schoolIds: filters.schoolIds.filter(x => x !== id) })} t={t} />

							<AdvancedClassSelector
								selectedGrades={filters.grades}
								selectedSections={filters.sections}
								onGradeChange={(val: any[]) => setFilters({ ...filters, grades: val })}
								onSectionChange={(val: any[]) => setFilters({ ...filters, sections: val })}
								t={t}
							/>

							<SubjectSelector selected={filters.subjects} onChange={(val: string[]) => setFilters({ ...filters, subjects: val })} t={t} />

							<SmartToggleGroup label={t('monitoring.rating.filters.day')} icon={Calendar} selectedValues={filters.days} onChange={(val: any[]) => setFilters({ ...filters, days: val })} options={[{ label: '12.01 (GAT-1)', value: 1 }, { label: '10.04 (GAT-2)', value: 2 }]} t={t} />

							<div className="mt-6 pt-6 border-t border-dashed border-slate-200 text-center">
								<div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wide animate-pulse">
									<CheckCircle2 size={12} /> {t('common.updated_now', 'Updated Just Now')}
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default MonitoringJournal;