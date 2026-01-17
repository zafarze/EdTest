import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
	Plus, Calendar, Monitor, BrainCircuit, FileSpreadsheet,
	X, ArrowRight, Loader2, ArrowLeft, Trash2, Settings,
	CheckCircle2, Lock, School as SchoolIcon, Layers, Check, Search, MapPin, Hash, ChevronDown, Scale, Sparkles, BookOpen,
	Copy // 👈 1. ИМПОРТ ИКОНКИ COPY
} from 'lucide-react';

// --- ИМПОРТ СЕРВИСОВ ---
import { ExamService, type TestPayload, type ExamSettings, type Test, type ExamType, type ExamStatus } from '../../services/examService';
import { SubjectService, type Subject } from '../../services/subjectService';
import { SchoolService, type School } from '../../services/schoolService';
import { QuarterService, type Quarter } from '../../services/quarterService';
import { ClassService, type StudentClass } from '../../services/classService';

// Интерфейсы для селектов
interface SchoolOption { id: number; name: string; }
interface QuarterOption { id: number; name: string; }
interface ClassOption { id: number; name: string; school: number; grade_level: number; }

// Заглушка учителей
const AVAILABLE_TEACHERS = [
	{ id: 2, name: 'Алина Петрова', avatar: 'bg-pink-100 text-pink-600' },
	{ id: 3, name: 'Дмитрий Иванов', avatar: 'bg-blue-100 text-blue-600' },
	{ id: 4, name: 'Зафар Зокиршоев', avatar: 'bg-indigo-100 text-indigo-600' },
];

// --- КОМПОНЕНТ SEARCHABLE SELECT ---
const SearchableSelect = ({
	options, value, onChange, placeholder, icon: Icon
}: {
	options: { id: number, name: string }[],
	value: number | undefined,
	onChange: (id: number) => void,
	placeholder: string,
	icon: any
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState('');
	const wrapperRef = useRef<HTMLDivElement>(null);
	const { t } = useTranslation();

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const filteredOptions = options.filter(opt => opt.name.toLowerCase().includes(search.toLowerCase()));
	const selectedOption = options.find(o => o.id === value);

	return (
		<div className="relative" ref={wrapperRef}>
			<div
				onClick={() => setIsOpen(!isOpen)}
				className={`w-full px-4 py-3.5 bg-white border-2 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${isOpen ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300'}`}
			>
				<div className="text-slate-400"><Icon size={20} /></div>
				<span className={`flex-1 font-bold text-sm ${selectedOption ? 'text-slate-800' : 'text-slate-400'}`}>
					{selectedOption ? selectedOption.name : placeholder}
				</span>
				<ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
			</div>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
						className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl overflow-hidden"
					>
						<div className="p-2 border-b border-slate-50">
							<div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
								<Search size={14} className="text-slate-400" />
								<input
									autoFocus type="text"
									className="bg-transparent outline-none text-xs font-bold text-slate-700 w-full placeholder:text-slate-400"
									placeholder={t('header.search_placeholder')}
									value={search} onChange={(e) => setSearch(e.target.value)}
								/>
							</div>
						</div>
						<div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
							{filteredOptions.length > 0 ? filteredOptions.map(opt => (
								<div
									key={opt.id}
									onClick={() => { onChange(opt.id); setIsOpen(false); setSearch(''); }}
									className={`px-3 py-2.5 rounded-lg text-sm font-bold cursor-pointer flex items-center justify-between transition-colors ${value === opt.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
								>
									{opt.name}
									{value === opt.id && <Check size={16} />}
								</div>
							)) : (
								<div className="p-4 text-center text-xs font-bold text-slate-400">{t('classes.messages.not_found')}</div>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

// --- ОСНОВНОЙ КОМПОНЕНТ ---
const Tests = () => {
	const navigate = useNavigate();
	const { t, i18n } = useTranslation(); // 👈 2. DOSTAEM i18n

	// --- КОНФИГУРАЦИЯ ---
	const TYPE_CONFIG = useMemo(() => ({
		online: { label: "Online Exam", icon: Monitor, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", gradient: "from-indigo-500 to-violet-600", desc: "Lockdown Browser + AI." },
		offline: { label: "Offline (Paper)", icon: FileSpreadsheet, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-100", gradient: "from-cyan-500 to-blue-500", desc: "OMR Scanning." },
		cambridge_ai: { label: "Cambridge AI", icon: BrainCircuit, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", gradient: "from-rose-500 to-amber-500", desc: "Vision AI." }
	}), []);

	const STATUS_CONFIG = useMemo(() => ({
		planned: { label: t('years.status_upcoming'), color: "text-slate-500", bg: "bg-slate-100" },
		active: { label: t('years.status_active'), color: "text-emerald-600", bg: "bg-emerald-100" },
		grading: { label: "Grading", color: "text-amber-600", bg: "bg-amber-100" },
		finished: { label: t('years.status_closed'), color: "text-blue-600", bg: "bg-blue-100" },
	}), [t]);

	// --- STATE ---
	const [tests, setTests] = useState<Test[]>([]);
	const [loading, setLoading] = useState(true);
	const [filterType, setFilterType] = useState<ExamType | 'all'>('all');

	// Справочники
	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [schools, setSchools] = useState<SchoolOption[]>([]);
	const [quarters, setQuarters] = useState<QuarterOption[]>([]);
	const [classes, setClasses] = useState<ClassOption[]>([]);

	// Модалки
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [deleteId, setDeleteId] = useState<number | null>(null);

	// Форма
	const [step, setStep] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);

	const [newExamData, setNewExamData] = useState<Partial<Test>>({
		type: 'online',
		gat_round: 1,
		gat_day: 1,
		class_ids: [],
		subject_ids: [],
		settings: { isAdaptive: false, lockdownMode: false, emotionalCheck: false, smartSeating: false, aiAuditPassed: false, allowAppeals: true, collaborators: [] }
	});

	// --- ЗАГРУЗКА ДАННЫХ ---
	// 👈 3. ИСПРАВЛЕНИЕ: Добавили i18n.language в зависимости
	useEffect(() => {
		fetchData();
	}, [i18n.language]);

	const fetchData = async () => {
		setLoading(true); // Включаем лоадер при смене языка
		try {
			const [examsData, subjectsData, schoolsData, quartersData, classesData] = await Promise.all([
				ExamService.getAll(),
				SubjectService.getAll(),
				SchoolService.getAll(),
				QuarterService.getAll(),
				ClassService.getAll()
			]);

			setTests(examsData as unknown as Test[]);
			setSubjects(subjectsData);
			setSchools(schoolsData);
			setQuarters(quartersData);

			const formattedClasses = (Array.isArray(classesData) ? classesData : classesData.results || []).map((c: any) => ({
				id: c.id,
				name: `${c.grade_level}${c.section}`,
				grade_level: c.grade_level,
				school: c.school
			}));
			setClasses(formattedClasses);

		} catch (error) {
			console.error("Failed to load data", error);
		} finally {
			setLoading(false);
		}
	};

	// --- ЛОГИКА ---
	const handleGatChange = (round: number) => {
		const targetQuarter = quarters[round - 1];
		setNewExamData(prev => ({
			...prev,
			gat_round: round,
			quarter: targetQuarter ? targetQuarter.id : prev.quarter
		}));
	};

	const handleEdit = (test: Test) => {
		setEditingId(test.id);
		const subjectIds = test.subject_ids?.length > 0
			? test.subject_ids
			: (test.subjects_data ? test.subjects_data.map((s: any) => s.id) : []);

		setNewExamData({ ...test, subject_ids: subjectIds });
		setStep(2);
		setIsCreateModalOpen(true);
	};

	// 👈 4. НОВАЯ ФУНКЦИЯ DUPLICATE
	const handleDuplicate = (test: Test) => {
		const subjectIds = test.subject_ids?.length > 0
			? test.subject_ids
			: (test.subjects_data ? test.subjects_data.map((s: any) => s.id) : []);

		setNewExamData({
			...test,
			title: `${test.title} (Copy)`, // Добавляем пометку
			subject_ids: subjectIds,
			status: 'planned', // Сбрасываем статус
			// Не передаем id, чтобы создался новый
		});

		setEditingId(null); // Это не редактирование, а создание
		setStep(2); // Сразу переходим к деталям
		setIsCreateModalOpen(true);
	};

	const handleSubmitExam = async () => {
		if (!newExamData.title || !newExamData.date || !newExamData.school || newExamData.subject_ids?.length === 0) {
			alert(t('subjects.errors.validation'));
			return;
		}

		setIsSubmitting(true);
		try {
			const payload: Partial<TestPayload> = {
				title: newExamData.title,
				type: newExamData.type,
				subject_ids: newExamData.subject_ids,
				school: newExamData.school,
				quarter: newExamData.quarter,
				gat_round: newExamData.gat_round,
				gat_day: newExamData.gat_day,
				class_ids: newExamData.class_ids,
				status: 'planned',
				date: newExamData.date,
				duration: newExamData.duration,
				settings: newExamData.settings as ExamSettings
			};

			if (editingId) {
				await ExamService.update(editingId, payload);
			} else {
				await ExamService.create(payload);
			}

			setIsCreateModalOpen(false);
			setStep(1);
			setEditingId(null);
			setNewExamData({ type: 'online', gat_round: 1, gat_day: 1, class_ids: [], subject_ids: [], settings: { isAdaptive: false, lockdownMode: false, emotionalCheck: false, smartSeating: false, aiAuditPassed: false, allowAppeals: true, collaborators: [] } });
			fetchData();
		} catch (error) {
			console.error(error);
			alert(t('schools.save_error'));
		} finally { setIsSubmitting(false); }
	};

	const toggleClass = (classId: number) => {
		setNewExamData(prev => {
			const current = prev.class_ids || [];
			return current.includes(classId)
				? { ...prev, class_ids: current.filter(id => id !== classId) }
				: { ...prev, class_ids: [...current, classId] };
		});
	};

	const toggleGradeLevel = (grade: number) => {
		if (!newExamData.school) return;
		const targetClasses = classes.filter(c => c.school === newExamData.school && c.grade_level === grade);
		const targetIds = targetClasses.map(c => c.id);

		setNewExamData(prev => {
			const current = prev.class_ids || [];
			const allSelected = targetIds.every(id => current.includes(id));
			return {
				...prev,
				class_ids: allSelected
					? current.filter(id => !targetIds.includes(id))
					: [...Array.from(new Set([...current, ...targetIds]))]
			};
		});
	};

	const toggleSubject = (subjId: number) => {
		setNewExamData(prev => {
			const current = prev.subject_ids || [];
			return current.includes(subjId)
				? { ...prev, subject_ids: current.filter(id => id !== subjId) }
				: { ...prev, subject_ids: [...current, subjId] };
		});
	};

	const handleDelete = async () => {
		if (!deleteId) return;
		try {
			await ExamService.delete(deleteId);
			setDeleteId(null);
			fetchData();
		} catch (error) { alert(t('subjects.errors.delete')); }
	};

	// --- RENDER CARD ---
	const ExamCard = ({ test }: { test: Test }) => {
		const TypeConf = TYPE_CONFIG[test.type] || TYPE_CONFIG['online'];
		// @ts-ignore
		const StatusConf = STATUS_CONFIG[test.status] || STATUS_CONFIG['planned'];

		const firstSubject = test.subjects_data?.[0];
		const subjectColor = firstSubject?.color || 'blue';
		const subjectName = firstSubject?.name || t('subjects.no_data');
		const moreSubjects = (test.subjects_data?.length || 0) > 1 ? (test.subjects_data!.length - 1) : 0;

		return (
			<motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -5 }} className="group relative bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-white/60 overflow-hidden flex flex-col">
				<div className={`absolute inset-0 border-2 ${TypeConf.border} rounded-[2rem] pointer-events-none group-hover:border-transparent transition-all`} />
				<div className={`absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br ${TypeConf.gradient} transition-opacity duration-500`} />

				<div className="relative z-10 flex flex-col h-full">
					<div className="flex justify-between items-start mb-4">
						<div className="flex items-center gap-3">
							<div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${TypeConf.bg} ${TypeConf.color} shadow-sm`}>
								<TypeConf.icon size={22} />
							</div>
							<div>
								<span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">GAT-{test.gat_round}</span>
								<span className="text-sm font-bold text-slate-800">{t('years.days')} {test.gat_day}</span>
							</div>
						</div>
						<div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${StatusConf.bg} ${StatusConf.color}`}>
							{StatusConf.label}
						</div>
					</div>

					<div className="mb-4">
						{test.school_name && (
							<div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
								<SchoolIcon size={12} /> {test.school_name}
							</div>
						)}
						<h3 className="text-lg font-bold text-slate-800 leading-tight mb-3 line-clamp-2 group-hover:text-indigo-700 transition-colors">
							{test.title}
						</h3>

						{test.classes_names && test.classes_names.length > 0 && (
							<div className="flex flex-wrap gap-1 mb-4">
								{test.classes_names.slice(0, 4).map((c, i) => (
									<span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold">{c}</span>
								))}
								{test.classes_names.length > 4 && <span className="text-[10px] text-slate-400 font-bold px-1">+{test.classes_names.length - 4}</span>}
							</div>
						)}

						<div className="flex items-center gap-2">
							<div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-${subjectColor}-50 text-${subjectColor}-600 border border-${subjectColor}-100 flex items-center gap-1`}>
								{subjectName}
								{moreSubjects > 0 && <span className="bg-white px-1 rounded-full text-[9px] shadow-sm">+{moreSubjects}</span>}
							</div>
							<div className="w-px h-4 bg-slate-200"></div>
							<div className="flex items-center gap-1 text-xs font-bold text-slate-500">
								<Calendar size={12} className="text-slate-400" /> {new Date(test.date).toLocaleDateString()}
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2 mt-auto border-t border-slate-100 pt-3">
						{test.settings?.lockdownMode && <div title="Lockdown" className="p-1.5 rounded-lg bg-rose-50 text-rose-600"><Lock size={14} /></div>}
						<div className="ml-auto flex gap-2">
							{/* 👈 5. ДОБАВЛЕНА КНОПКА ДУБЛИКАТА */}
							<button
								onClick={() => handleDuplicate(test)}
								title={t('common.duplicate') || "Duplicate"}
								className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
							>
								<Copy size={16} />
							</button>

							<button onClick={() => handleEdit(test)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"><Settings size={16} /></button>
							<button onClick={() => setDeleteId(test.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
						</div>
					</div>
				</div>
			</motion.div>
		);
	};

	return (
		<div className="min-h-screen p-6 md:p-10 pb-20 space-y-8">
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
				<div>
					<button onClick={() => navigate('/admin/management')} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-sm mb-2 transition-colors">
						<ArrowLeft size={16} /> {t('common.back')}
					</button>
					<h1 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
						{t('management.cards.exams.title')} <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs rounded-full font-bold uppercase tracking-wider">Premium</span>
					</h1>
				</div>
				<button onClick={() => { setEditingId(null); setStep(1); setIsCreateModalOpen(true); }} className="group px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-300/50 hover:bg-slate-800 transition-all flex items-center gap-3">
					<Plus size={20} strokeWidth={3} /> <span>{t('dashboard.actions.create_test')}</span>
				</button>
			</div>

			{/* Filters */}
			<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
				<button onClick={() => setFilterType('all')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${filterType === 'all' ? 'bg-white shadow-md text-slate-800' : 'text-slate-500 hover:bg-white/50'}`}>
					{t('subjects.filter_all')}
				</button>
				{(['online', 'offline', 'cambridge_ai'] as const).map(type => (
					<button key={type} onClick={() => setFilterType(type)} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${filterType === type ? 'bg-white shadow-md text-slate-800' : 'text-slate-500 hover:bg-white/50'}`}>
						{TYPE_CONFIG[type].label}
					</button>
				))}
			</div>

			{/* Grid */}
			{loading ? (<div className="flex items-center justify-center h-64"><Loader2 size={40} className="text-indigo-600 animate-spin" /></div>) : (
				<motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
					<AnimatePresence>
						{tests.filter(t => filterType === 'all' || t.type === filterType).map(test => (<ExamCard key={test.id} test={test} />))}
					</AnimatePresence>
				</motion.div>
			)}

			{/* --- WIZARD MODAL (CREATE/EDIT) --- */}
			<AnimatePresence>
				{isCreateModalOpen && (
					<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)} />

						<motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] flex flex-col">
							<div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
								<div>
									<h2 className="text-3xl font-black text-slate-800">
										{editingId ? t('classes.modal.edit_title') : t('common.create')}
									</h2>
									<div className="flex items-center gap-2 mt-2">
										{[1, 2, 3, 4].map(i => (<div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${step >= i ? 'bg-indigo-600' : 'bg-slate-200'}`} />))}
										<span className="text-xs font-bold text-slate-400 ml-2">Шаг {step} из 4</span>
									</div>
								</div>
								<button onClick={() => setIsCreateModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-rose-500 transition-colors"><X size={28} /></button>
							</div>

							<div className="flex-1 overflow-y-auto custom-scrollbar p-10">
								{/* ШАГ 1 */}
								{step === 1 && (
									<div className="space-y-8 animate-fade-in">
										<div className="text-center max-w-2xl mx-auto"><h3 className="text-2xl font-bold text-slate-800 mb-2">{t('exams.wizard.select_methodology')}</h3></div>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
											{(['online', 'offline', 'cambridge_ai'] as const).map(type => {
												const Conf = TYPE_CONFIG[type];
												return (
													<button key={type} onClick={() => { setNewExamData({ ...newExamData, type }); setStep(2); }} className={`group relative p-8 rounded-[2rem] border-2 text-left transition-all hover:shadow-2xl hover:scale-[1.02] overflow-hidden ${newExamData.type === type ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 bg-slate-50/50 hover:bg-white'}`}>
														<div className={`w-16 h-16 rounded-2xl ${Conf.bg} ${Conf.color} flex items-center justify-center mb-6 shadow-sm`}><Conf.icon size={32} /></div>
														<h4 className="text-xl font-bold text-slate-800 mb-3">{Conf.label}</h4>
													</button>
												)
											})}
										</div>
									</div>
								)}

								{/* ШАГ 2 */}
								{step === 2 && (
									<div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
										<div className="relative">
											<div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400"><Hash size={20} /></div>
											<input
												type="text"
												placeholder={t('topics.modal.input_title')}
												value={newExamData.title || ''}
												onChange={e => setNewExamData({ ...newExamData, title: e.target.value })}
												className="w-full pl-12 pr-6 py-5 bg-white border-2 border-slate-200 rounded-[1.5rem] font-black text-xl text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-slate-300 shadow-sm"
											/>
										</div>

										<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
											<div className="space-y-6">
												<div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
													<h4 className="text-xs font-black text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2"><MapPin size={14} /> {t('schools.address_label')}</h4>
													<div className="space-y-4">
														<div>
															<label className="block text-xs font-bold text-slate-600 mb-2 ml-1">{t('topics.filters.school')}</label>
															<SearchableSelect
																icon={SchoolIcon}
																placeholder={t('students.table.select_school_msg')}
																options={schools} value={newExamData.school}
																onChange={(id) => setNewExamData({ ...newExamData, school: id, class_ids: [] })}
															/>
														</div>
														<div>
															<div className="flex justify-between items-end mb-2 ml-1">
																<label className="block text-xs font-bold text-slate-600">{t('management.cards.classes.title')}</label>
																{newExamData.school && (
																	<div className="flex gap-1">
																		{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => (
																			<button key={g} onClick={() => toggleGradeLevel(g)} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors">{g}</button>
																		))}
																	</div>
																)}
															</div>
															<div className="bg-white border-2 border-slate-200 rounded-xl p-3 min-h-[52px]">
																{newExamData.school ? (
																	<div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
																		{classes.filter(c => c.school === newExamData.school).map(cls => (
																			<button
																				key={cls.id} onClick={() => toggleClass(cls.id)}
																				className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${newExamData.class_ids?.includes(cls.id) ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
																			>
																				{cls.name} {newExamData.class_ids?.includes(cls.id) && <Check size={12} strokeWidth={3} />}
																			</button>
																		))}
																		{classes.filter(c => c.school === newExamData.school).length === 0 && <span className="text-xs text-slate-400">{t('classes.messages.not_found')}</span>}
																	</div>
																) : (
																	<span className="text-xs text-slate-300 font-bold p-1">{t('students.messages.select_school_first')}</span>
																)}
															</div>
														</div>
													</div>
												</div>

												<div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
													<h4 className="text-xs font-black text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2"><BookOpen size={14} /> {t('management.cards.subjects.title')}</h4>
													<div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
														{subjects.map(subj => {
															const isSelected = newExamData.subject_ids?.includes(subj.id);
															return (
																<button
																	key={subj.id} onClick={() => toggleSubject(subj.id)}
																	className={`p-3 rounded-xl border-2 text-xs font-bold text-left transition-all flex items-center justify-between ${isSelected ? `bg-${subj.color}-50 border-${subj.color}-500 text-${subj.color}-700` : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
																>
																	{subj.name} {isSelected && <Check size={14} />}
																</button>
															)
														})}
													</div>
												</div>
											</div>

											<div className="space-y-6">
												<div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 h-full">
													<h4 className="text-xs font-black text-slate-400 uppercase tracking-wide mb-4 flex items-center gap-2"><Calendar size={14} /> {t('dashboard.before_exam')}</h4>
													<div className="space-y-6">
														<div>
															<label className="block text-xs font-bold text-slate-600 mb-2 ml-1">Stage</label>
															<div className="flex gap-2 p-1 bg-white border-2 border-slate-200 rounded-xl">
																{[1, 2, 3, 4].map(round => (
																	<button
																		key={round} onClick={() => handleGatChange(round)}
																		className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all ${newExamData.gat_round === round ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
																	>
																		GAT-{round}
																	</button>
																))}
															</div>
															<div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-slate-400 px-1">
																<Layers size={10} /> Auto: <span className="text-indigo-600">{quarters.find(q => q.id === newExamData.quarter)?.name || "N/A"}</span>
															</div>
														</div>
														<div className="grid grid-cols-2 gap-4">
															<div>
																<label className="block text-xs font-bold text-slate-600 mb-2 ml-1">{t('years.start_label')}</label>
																<input type="date" value={newExamData.date || ''} onChange={e => setNewExamData({ ...newExamData, date: e.target.value })} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors text-sm" />
															</div>
															<div>
																<label className="block text-xs font-bold text-slate-600 mb-2 ml-1">{t('dashboard.min')}</label>
																<input type="number" placeholder="60" value={newExamData.duration || 60} onChange={e => setNewExamData({ ...newExamData, duration: Number(e.target.value) })} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors text-sm" />
															</div>
														</div>
													</div>
												</div>
											</div>
										</div>

										<div className="pt-6 flex gap-4">
											<button onClick={() => setStep(1)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100">{t('common.back')}</button>
											<button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl font-bold text-white bg-slate-900 shadow-lg flex items-center justify-center gap-2">{t('common.actions')} <ArrowRight size={18} /></button>
										</div>
									</div>
								)}

								{/* ШАГ 3 */}
								{step === 3 && (
									<div className="max-w-3xl mx-auto animate-fade-in">
										<div className="text-center mb-8"><h3 className="text-2xl font-black text-slate-800">{t('exams.wizard.team_title')}</h3></div>
										<div className="grid grid-cols-1 gap-3">
											{AVAILABLE_TEACHERS.map(teacher => {
												const isSelected = newExamData.settings?.collaborators?.includes(teacher.id);
												return (
													<div key={teacher.id} onClick={() => {
														const current = newExamData.settings?.collaborators || [];
														const updated = isSelected ? current.filter(id => id !== teacher.id) : [...current, teacher.id];
														setNewExamData(prev => ({ ...prev, settings: { ...prev.settings!, collaborators: updated } }));
													}} className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center gap-4 transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
														<div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${teacher.avatar}`}>{teacher.name[0]}</div>
														<div className="flex-1"><h5 className="font-bold text-slate-800">{teacher.name}</h5></div>
														<div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>{isSelected && <CheckCircle2 size={14} className="text-white" />}</div>
													</div>
												)
											})}
										</div>
										<div className="pt-6 flex gap-4"><button onClick={() => setStep(2)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100">{t('common.back')}</button><button onClick={() => setStep(4)} className="flex-1 py-3 rounded-xl font-bold text-white bg-slate-900 shadow-lg flex items-center justify-center gap-2">{t('common.actions')} <ArrowRight size={18} /></button></div>
									</div>
								)}

								{/* ШАГ 4 */}
								{step === 4 && (
									<div className="max-w-4xl mx-auto animate-fade-in">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
											<div className="space-y-4">
												<h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">AI Intelligence</h4>
												<div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${newExamData.settings?.isAdaptive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white hover:border-slate-200'}`} onClick={() => setNewExamData(prev => ({ ...prev, settings: { ...prev.settings!, isAdaptive: !prev.settings!.isAdaptive } }))}>
													<div className="p-2 rounded-lg bg-indigo-500 text-white"><BrainCircuit size={24} /></div>
													<div><h5 className="font-bold text-slate-800">{t('exams.wizard.adaptive_test')}</h5></div>
													<div className={`ml-auto w-6 h-6 rounded-full border-2 flex items-center justify-center ${newExamData.settings?.isAdaptive ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>{newExamData.settings?.isAdaptive && <CheckCircle2 size={14} className="text-white" />}</div>
												</div>
											</div>
											<div className="space-y-4">
												<h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('settings_page.security.title')}</h4>
												{newExamData.type === 'online' && (
													<div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${newExamData.settings?.lockdownMode ? 'border-rose-500 bg-rose-50' : 'border-slate-100 bg-white hover:border-slate-200'}`} onClick={() => setNewExamData(prev => ({ ...prev, settings: { ...prev.settings!, lockdownMode: !prev.settings!.lockdownMode } }))}>
														<div className="p-2 rounded-lg bg-rose-500 text-white"><Lock size={24} /></div>
														<div><h5 className="font-bold text-slate-800">Lockdown Mode</h5></div>
														<div className={`ml-auto w-6 h-6 rounded-full border-2 flex items-center justify-center ${newExamData.settings?.lockdownMode ? 'border-rose-500 bg-rose-500' : 'border-slate-300'}`}>{newExamData.settings?.lockdownMode && <CheckCircle2 size={14} className="text-white" />}</div>
													</div>
												)}
											</div>
										</div>
										<div className="pt-6 border-t border-slate-100 flex gap-4">
											<button onClick={() => setStep(3)} className="px-6 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100">{t('common.back')}</button>
											<button onClick={handleSubmitExam} disabled={isSubmitting} className="flex-1 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-3">
												{isSubmitting ? <Loader2 className="animate-spin" /> : <><Sparkles size={20} fill="currentColor" /> {editingId ? t('common.save') : t('common.create')}</>}
											</button>
										</div>
									</div>
								)}
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{/* --- МОДАЛКА УДАЛЕНИЯ --- */}
			<AnimatePresence>
				{deleteId && (
					<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
						<motion.div
							initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
							className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
							onClick={() => setDeleteId(null)}
						/>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
							className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center"
						>
							<div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
								<Trash2 size={32} />
							</div>
							<h3 className="text-xl font-black text-slate-800 mb-2">{t('common.delete_question')}</h3>
							<p className="text-sm font-bold text-slate-500 mb-6">{t('common.irreversible')}</p>

							<div className="flex gap-3">
								<button
									onClick={() => setDeleteId(null)}
									className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
								>
									{t('common.cancel')}
								</button>
								<button
									onClick={handleDelete}
									className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-colors"
								>
									{t('common.delete')}
								</button>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default Tests;