import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
	Layers, Plus, Search,
	Edit3, Trash2, FileText, CheckCircle2, Zap,
	LayoutGrid, List, School, GraduationCap,
	BookOpen, Check, X, ArrowLeft, ArrowRightLeft, Copy, RefreshCw,
	AlertTriangle, Save, ChevronDown, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ИМПОРТ СЕРВИСОВ
import { TopicService } from '../../services/topicService';
import type { Topic } from '../../services/topicService';
import { SchoolService } from '../../services/schoolService';
import { SubjectService } from '../../services/subjectService';

// --- ИНТЕРФЕЙСЫ С ЛОКАЛИЗАЦИЕЙ ---
interface SchoolType {
	id: number;
	name: string;
	name_tj?: string;
	name_en?: string;
}

interface SubjectType {
	id: number;
	name: string;
	name_tj?: string;
	name_en?: string;
}

// --- ФУНКЦИЯ-ПОМОЩНИК ДЛЯ ПЕРЕВОДА ---
const getLocalizedName = (item: any, lang: string) => {
	if (!item) return '';
	if (lang === 'tj') return item.name_tj || item.name;
	if (lang === 'en') return item.name_en || item.name;
	return item.name; // По умолчанию RU
};

// --- КОМПОНЕНТ: МУЛЬТИ-СЕЛЕКТ ---
const MultiSelectDropdown = ({
	options, value, onChange, label, icon: Icon
}: {
	options: any[], value: number[], onChange: (val: number[]) => void, label: string, icon: any
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState('');
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const clickOutside = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
		};
		// Закрытие по ESC
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setIsOpen(false);
		};

		document.addEventListener('mousedown', clickOutside);
		document.addEventListener('keydown', handleEsc);
		return () => {
			document.removeEventListener('mousedown', clickOutside);
			document.removeEventListener('keydown', handleEsc);
		};
	}, []);

	const toggleOption = (id: number) => {
		if (value.includes(id)) onChange(value.filter(v => v !== id));
		else onChange([...value, id]);
	};

	const handleSelectAll = () => {
		if (value.length === options.length) onChange([]);
		else onChange(options.map(o => o.id));
	};

	const filteredOptions = options.filter(opt => opt.name.toLowerCase().includes(search.toLowerCase()));

	return (
		<div className="relative mb-6" ref={ref}>
			<label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{label}</label>
			<div
				className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 cursor-pointer hover:border-indigo-300 transition-all flex items-center justify-between ${isOpen ? 'ring-2 ring-indigo-100 border-indigo-300' : ''}`}
				onClick={() => setIsOpen(!isOpen)}
			>
				<div className="flex items-center gap-3 overflow-hidden">
					<Icon size={18} className="text-indigo-500 shrink-0" />
					{value.length === 0 ? (
						<span className="text-sm font-bold text-slate-400">Все {label.toLowerCase()}</span>
					) : (
						<span className="text-sm font-bold text-slate-700 truncate">
							Выбрано: {value.length}
						</span>
					)}
				</div>
				<ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
			</div>

			<AnimatePresence>
				{isOpen && (
					<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden max-h-80 flex flex-col">
						<div className="p-2 border-b border-slate-50 bg-white sticky top-0">
							<input type="text" placeholder="Поиск..." className="w-full px-3 py-2 bg-slate-50 rounded-lg text-xs font-bold outline-none mb-2" value={search} onChange={e => setSearch(e.target.value)} />
							<div onClick={handleSelectAll} className="px-3 py-2 text-xs font-bold text-indigo-600 cursor-pointer hover:bg-indigo-50 rounded-lg flex items-center justify-between">
								{value.length === options.length ? 'Снять выделение' : 'Выбрать все'}
								<span className="bg-indigo-100 text-indigo-700 px-1.5 rounded text-[10px]">{options.length}</span>
							</div>
						</div>
						<div className="overflow-y-auto custom-scrollbar p-1">
							{filteredOptions.map(opt => (
								<div key={opt.id} onClick={() => toggleOption(opt.id)} className={`px-3 py-2.5 text-xs font-bold rounded-lg cursor-pointer flex items-center justify-between ${value.includes(opt.id) ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}>
									<div className="flex items-center gap-2">
										<div className={`w-4 h-4 rounded border flex items-center justify-center ${value.includes(opt.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}>
											{value.includes(opt.id) && <Check size={10} className="text-white" />}
										</div>
										{opt.name}
									</div>
								</div>
							))}
							{filteredOptions.length === 0 && <div className="p-4 text-center text-xs text-slate-400">Ничего не найдено</div>}
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{value.length > 0 && value.length < 5 && (
				<div className="flex flex-wrap gap-1.5 mt-2">
					{value.map(id => {
						const item = options.find(o => o.id === id);
						return item ? (
							<span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-600 text-[10px] font-bold shadow-sm">
								{item.name}
								<button onClick={() => toggleOption(id)} className="hover:text-red-500"><X size={10} /></button>
							</span>
						) : null;
					})}
				</div>
			)}
		</div>
	);
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const Topics = () => {
	const navigate = useNavigate();
	const { t, i18n } = useTranslation(); // i18n для языка

	// --- ДАННЫЕ ---
	const [topics, setTopics] = useState<Topic[]>([]);
	const [schools, setSchools] = useState<SchoolType[]>([]);
	const [subjects, setSubjects] = useState<SubjectType[]>([]);
	const [loading, setLoading] = useState(true);
	const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [searchTerm, setSearchTerm] = useState('');

	// --- ФИЛЬТРЫ ---
	const [activeSchools, setActiveSchools] = useState<number[]>([]);
	const [activeSubjects, setActiveSubjects] = useState<number[]>([]);
	const [activeGrade, setActiveGrade] = useState<number>(10);
	const [activeQuarters, setActiveQuarters] = useState<number[]>([1]); // Множественный выбор четвертей

	// --- МОДАЛКИ ---
	const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
	const [transferType, setTransferType] = useState<'move' | 'copy'>('copy');
	const [targetSchool, setTargetSchool] = useState<string>('');
	const [targetGrade, setTargetGrade] = useState<number>(10);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
	const [editingTopicId, setEditingTopicId] = useState<number | null>(null);

	const [formState, setFormState] = useState({
		schools: [] as number[],
		grade: 10, quarter: 1, subject: '', title: '', description: ''
	});

	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

	// 🔥 ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ESC
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setIsModalOpen(false);
				setIsDeleteModalOpen(false);
				setIsTransferModalOpen(false);
			}
		};
		window.addEventListener('keydown', handleGlobalKeyDown);
		return () => window.removeEventListener('keydown', handleGlobalKeyDown);
	}, []);

	// --- ЗАГРУЗКА ДАННЫХ ---
	useEffect(() => {
		const fetchData = async () => {
			try {
				const [schoolsData, subjectsData] = await Promise.all([
					SchoolService.getAll(),
					SubjectService.getAll()
				]);
				setSchools(schoolsData);
				setSubjects(subjectsData);
				if (schoolsData.length > 0) {
					setActiveSchools([schoolsData[0].id]);
					setTargetSchool(schoolsData[0].id.toString());
				}
			} catch (error) { console.error(error); }
		};
		fetchData();
	}, []);

	const fetchTopics = async () => {
		if (activeSchools.length === 0) return;
		setLoading(true);
		try {
			const params: any = {
				schools: activeSchools.join(','),
				grade_level: activeGrade,
			};

			// Отправляем массивы через запятую
			if (activeQuarters.length > 0) params.quarter = activeQuarters.join(',');
			if (activeSubjects.length > 0) params.subject = activeSubjects.join(',');
			if (searchTerm) params.search = searchTerm;

			const data = await TopicService.getAll(params);
			setTopics(data);
		} catch (error) { console.error(error); } finally { setLoading(false); }
	};

	useEffect(() => { fetchTopics(); }, [activeSchools, activeGrade, activeQuarters, activeSubjects, searchTerm]);

	// 🔥 ПОДГОТОВКА ЛОКАЛИЗОВАННЫХ СПИСКОВ (Для выпадающих меню)
	const localizedSchools = schools.map(s => ({
		...s,
		name: getLocalizedName(s, i18n.language)
	}));

	const localizedSubjects = subjects.map(s => ({
		...s,
		name: getLocalizedName(s, i18n.language)
	}));

	// Переключение четвертей
	const toggleQuarter = (q: number) => {
		if (activeQuarters.includes(q)) {
			if (activeQuarters.length > 1) setActiveQuarters(prev => prev.filter(item => item !== q));
		} else {
			setActiveQuarters(prev => [...prev, q]);
		}
	};

	// --- ДЕЙСТВИЯ ---
	const handleQuestionsClick = (topicId: number) => {
		navigate(`/admin/manage/questions?topic=${topicId}`);
	};

	const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSelectedIds(e.target.checked ? topics.map(t => t.id) : []);
	};

	const toggleSelect = (id: number) => {
		setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
	};

	const openCreateModal = () => {
		setModalMode('create');
		setFormState({
			schools: activeSchools.length > 0 ? activeSchools : [],
			grade: activeGrade,
			quarter: activeQuarters.length > 0 ? activeQuarters[0] : 1,
			subject: activeSubjects.length > 0 ? activeSubjects[0].toString() : (subjects[0]?.id.toString() || ''),
			title: '', description: ''
		});
		setIsModalOpen(true);
	};

	const openEditModal = (topic: Topic) => {
		setModalMode('edit');
		setEditingTopicId(topic.id);
		setFormState({
			schools: (topic as any).schools || [],
			grade: topic.grade_level, quarter: topic.quarter,
			subject: topic.subject.toString(), title: topic.title, description: topic.description
		});
		setIsModalOpen(true);
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const payload = {
				title: formState.title, description: formState.description,
				schools: formState.schools,
				grade_level: formState.grade,
				subject: Number(formState.subject), quarter: formState.quarter
			};

			if (modalMode === 'create') await TopicService.create(payload);
			else await TopicService.update(editingTopicId!, payload);

			setIsModalOpen(false);
			fetchTopics();
		} catch (error) { alert("Ошибка сохранения"); }
	};

	const handleDeleteClick = (id: number) => {
		setSelectedIds([id]);
		setIsDeleteModalOpen(true);
	};

	const confirmDelete = async () => {
		try {
			await TopicService.bulkDelete(selectedIds);
			setTopics(prev => prev.filter(t => !selectedIds.includes(t.id)));
			setSelectedIds([]);
			setIsDeleteModalOpen(false);
		} catch (error) { alert("Error deleting topics"); }
	};

	const handleTransfer = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await TopicService.transfer({
				topic_ids: selectedIds, target_school_id: targetSchool,
				target_grade: targetGrade, mode: transferType
			});
			setIsTransferModalOpen(false);
			setSelectedIds([]);
			fetchTopics();
		} catch (error) { alert("Transfer error"); }
	};

	const getStatusBadge = (status: string) => {
		const styles = {
			ready: 'bg-emerald-50 text-emerald-600 border-emerald-100',
			progress: 'bg-amber-50 text-amber-600 border-amber-100',
			empty: 'bg-slate-50 text-slate-400 border-slate-100'
		};
		const labels: any = { ready: 'ГОТОВО', progress: 'В ПРОЦЕССЕ', empty: 'ПУСТО' }
		return (
			<span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wide ${(styles as any)[status] || styles.empty}`}>
				{labels[status] || status}
			</span>
		);
	};

	return (
		<div className="w-full mt-2 pb-20">
			{/* KPI */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-fade-in-up">
				<div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
					<div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Layers size={24} /></div>
					<div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('topics.stats.total')}</p><h3 className="text-2xl font-black text-slate-800">{topics.length}</h3></div>
				</div>
				<div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
					<div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={24} /></div>
					<div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('topics.stats.ready')}</p><h3 className="text-2xl font-black text-slate-800">{topics.filter(t => t.status === 'ready').length}</h3></div>
				</div>
				<div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
					<div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Zap size={24} /></div>
					<div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('topics.stats.questions')}</p><h3 className="text-2xl font-black text-slate-800">{topics.reduce((acc, t) => acc + (t.questions_count || 0), 0)}</h3></div>
				</div>
			</div>

			<div className="flex flex-col lg:flex-row gap-6">
				{/* ЛЕВАЯ ЧАСТЬ: СПИСОК */}
				<div className="flex-1 flex flex-col gap-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<button onClick={() => navigate(-1)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all active:scale-95"><ArrowLeft size={20} /></button>
							<div>
								<h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
									{t('topics.title')}
								</h2>
								<div className="flex items-center gap-2 text-xs font-bold text-slate-400 mt-0.5">
									<span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">{activeGrade} {t('topics.filters.class')}</span>
									<span>•</span>
									<span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">
										{activeQuarters.length === 4 ? 'Все четверти' :
											activeQuarters.sort().map(q => q + ' четв.').join(', ')}
									</span>
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2 w-full sm:w-auto">
							<div className="relative flex-1 sm:w-64">
								<Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
								<input type="text" placeholder={t('topics.search_placeholder')} className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:border-indigo-500 outline-none transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
							</div>
							<div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
								<button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}><List size={18} /></button>
								<button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={18} /></button>
							</div>
							<button onClick={openCreateModal} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95">
								<Plus size={18} /> <span className="hidden sm:inline">{t('common.create')}</span>
							</button>
						</div>
					</div>

					<div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px] relative">
						{loading && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center"><RefreshCw className="animate-spin text-indigo-600 mb-2" size={32} /><p className="text-sm font-bold text-slate-500">{t('common.loading')}</p></div>}
						{!loading && topics.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-64 text-center">
								<div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3"><Search size={24} className="text-slate-300" /></div>
								<h3 className="text-slate-600 font-bold">{t('topics.table.empty')}</h3>
							</div>
						) : viewMode === 'list' ? (
							<table className="w-full text-left border-collapse">
								<thead>
									<tr className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase text-slate-400 font-bold tracking-wider">
										<th className="p-4 w-10"><input type="checkbox" onChange={handleSelectAll} checked={topics.length > 0 && selectedIds.length === topics.length} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /></th>
										<th className="p-4">{t('topics.table.name')}</th>
										<th className="p-4">{t('topics.table.questions')}</th>
										<th className="p-4">{t('topics.table.info')}</th>
										<th className="p-4">{t('topics.table.author')}</th>
										<th className="p-4">{t('topics.table.status')}</th>
										<th className="p-4 text-right">{t('topics.table.actions')}</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 text-sm">
									{topics.map((topic) => (
										<tr key={topic.id} className={`hover:bg-slate-50 transition-colors group ${selectedIds.includes(topic.id) ? 'bg-indigo-50/30' : ''}`}>
											<td className="p-4"><input type="checkbox" checked={selectedIds.includes(topic.id)} onChange={() => toggleSelect(topic.id)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" /></td>
											<td className="p-4">
												<div className="font-bold text-slate-700">{topic.title}</div>
												{/* 🔥 ЛОКАЛИЗАЦИЯ ПРЕДМЕТА */}
												<div className="text-xs text-slate-400">
													{getLocalizedName(subjects.find(s => s.id === topic.subject), i18n.language)}
												</div>
											</td>
											<td className="p-4">
												{/* 🔥 КЛИКАБЕЛЬНЫЙ СЧЕТЧИК ВОПРОСОВ */}
												<div
													onClick={() => handleQuestionsClick(topic.id)}
													className="flex items-center gap-2 font-bold text-slate-600 hover:text-indigo-600 cursor-pointer w-fit p-1 rounded hover:bg-indigo-50 transition-all"
													title="Перейти к вопросам"
												>
													<FileText size={14} className="text-slate-400" />
													{topic.questions_count || 0}
												</div>
											</td>
											<td className="p-4">
												<div className="flex flex-col gap-1">
													<span className="text-xs font-medium text-slate-500">{topic.grade_level} {t('topics.filters.class')}</span>
													{/* 🔥 ЛОКАЛИЗАЦИЯ ШКОЛ */}
													{(topic as any).schools && (topic as any).schools.length > 1 ? (
														<span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 rounded-md w-fit">
															{(topic as any).schools.length} {t('topics.table.schools_count', { defaultValue: 'школ' })}
														</span>
													) : (
														<span className="text-[10px] text-slate-400 truncate max-w-[100px]">
															{(topic as any).schools && (topic as any).schools.length > 0
																? getLocalizedName(schools.find(s => s.id === (topic as any).schools[0]), i18n.language)
																: ''}
														</span>
													)}
												</div>
											</td>
											<td className="p-4"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">{(topic.author_name || 'A').charAt(0).toUpperCase()}</div><span className="text-slate-600 truncate max-w-[100px]">{topic.author_name || 'Admin'}</span></div></td>
											<td className="p-4">{getStatusBadge(topic.status)}</td>
											<td className="p-4 text-right"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => openEditModal(topic)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit3 size={16} /></button><button onClick={() => handleDeleteClick(topic.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button></div></td>
										</tr>
									))}
								</tbody>
							</table>
						) : (
							<div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
								{topics.map(topic => (
									<div key={topic.id} className={`p-5 rounded-xl border transition-all hover:shadow-md cursor-pointer ${selectedIds.includes(topic.id) ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-100 bg-white hover:border-indigo-100'}`} onClick={() => toggleSelect(topic.id)}>
										<div className="flex justify-between items-start mb-3">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><BookOpen size={20} /></div>
												<div>
													<h4 className="font-bold text-slate-800 line-clamp-1">{topic.title}</h4>
													<p className="text-xs text-slate-400">
														{getLocalizedName(subjects.find(s => s.id === topic.subject), i18n.language)} • {topic.grade_level} {t('topics.filters.class')}
													</p>
												</div>
											</div>
											<input type="checkbox" checked={selectedIds.includes(topic.id)} readOnly className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* ПРАВАЯ ЧАСТЬ: ФИЛЬТРЫ */}
				<div className="w-full lg:w-80 flex flex-col gap-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
					<div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sticky top-24">
						<div className="flex items-center gap-2 mb-6"><Filter size={20} className="text-indigo-600" /><h3 className="font-bold text-lg text-slate-800">{t('management.title')}</h3></div>

						{/* 🔥 ФИЛЬТРЫ С ЛОКАЛИЗОВАННЫМИ ДАННЫМИ */}
						<MultiSelectDropdown
							label={t('topics.filters.school')}
							options={localizedSchools}
							value={activeSchools}
							onChange={setActiveSchools}
							icon={School}
						/>

						<MultiSelectDropdown
							label={t('topics.filters.subject')}
							options={localizedSubjects}
							value={activeSubjects}
							onChange={setActiveSubjects}
							icon={BookOpen}
						/>

						<div className="mb-6">
							<label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t('topics.filters.class')}</label>
							<div className="grid grid-cols-4 gap-2">
								{[...Array(11)].map((_, i) => (
									<button key={i + 1} onClick={() => setActiveGrade(i + 1)} className={`h-9 rounded-lg text-xs font-bold transition-all border ${activeGrade === i + 1 ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}`}>{i + 1}</button>
								))}
							</div>
						</div>

						{/* 🔥 ЧЕТВЕРТИ (МУЛЬТИ-ВЫБОР) */}
						<div className="mb-6">
							<label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t('topics.filters.quarter')}</label>
							<div className="grid grid-cols-2 gap-2">
								{[1, 2, 3, 4].map(q => {
									const isActive = activeQuarters.includes(q);
									return (
										<button
											key={q}
											onClick={() => toggleQuarter(q)}
											className={`py-2 rounded-lg text-xs font-bold transition-all border 
                                                ${isActive
													? 'bg-purple-600 border-purple-600 text-white shadow-md'
													: 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}`}
										>
											{t('topics.filters.quarter_num', { num: q })}
											{isActive && <Check size={12} className="inline ml-1 mb-0.5" />}
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			</div>

			{selectedIds.length > 0 && (
				<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
					<div className="bg-slate-900 text-white rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-6 border border-slate-700/50">
						<span className="font-bold text-sm whitespace-nowrap">{selectedIds.length}</span>
						<div className="h-4 w-px bg-slate-700"></div>
						<button onClick={() => setIsTransferModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors text-xs font-bold shadow-lg shadow-indigo-900/50"><ArrowRightLeft size={14} /> {t('topics.modals.transfer_title')}</button>
						<div className="h-4 w-px bg-slate-700"></div>
						<button onClick={() => setIsDeleteModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors text-xs font-bold"><Trash2 size={14} /></button>
						<button onClick={() => setSelectedIds([])} className="ml-2 p-1 rounded-full hover:bg-white/20 transition-colors"><X className="w-4 h-4" /></button>
					</div>
				</div>
			)}

			{isModalOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
					<div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-zoom-in">
						<div className="flex justify-between items-center mb-6">
							<h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
								{modalMode === 'create' ? <Plus size={24} className="text-emerald-500" /> : <Edit3 size={24} className="text-indigo-500" />}
								{modalMode === 'create' ? t('topics.modals.create_title') : t('topics.modals.edit_title')}
							</h3>
							<button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100"><X size={20} className="text-slate-400" /></button>
						</div>
						<form onSubmit={handleSave} className="space-y-5">
							<div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
								<div>
									<label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('topics.filters.school')}</label>
									<MultiSelectDropdown
										label="" icon={School}
										options={localizedSchools}
										value={formState.schools}
										onChange={(v) => setFormState({ ...formState, schools: v })}
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('topics.filters.subject')}</label><select value={formState.subject} onChange={(e) => setFormState({ ...formState, subject: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none"><option value="" disabled>...</option>{localizedSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>

									<div className="grid grid-cols-2 gap-2">
										<div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('topics.filters.class')}</label><select value={formState.grade} onChange={(e) => setFormState({ ...formState, grade: Number(e.target.value) })} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none">{[...Array(11)].map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></div>
										<div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('topics.filters.quarter')}</label><select value={formState.quarter} onChange={(e) => setFormState({ ...formState, quarter: Number(e.target.value) })} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 outline-none">{[1, 2, 3, 4].map(q => <option key={q} value={q}>{q}</option>)}</select></div>
									</div>
								</div>
							</div>
							<div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('topics.modals.input_title')}</label><input type="text" autoFocus className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="Например: Квадратные уравнения" value={formState.title} onChange={(e) => setFormState({ ...formState, title: e.target.value })} /></div>
							<div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('topics.modals.input_desc')}</label><textarea rows={3} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none transition-all" placeholder="Описание темы..." value={formState.description} onChange={(e) => setFormState({ ...formState, description: e.target.value })} /></div>
							<button type="submit" disabled={!formState.title || !formState.subject || formState.schools.length === 0} className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${modalMode === 'create' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'} disabled:opacity-50 disabled:cursor-not-allowed`}>{modalMode === 'create' ? <Plus size={18} /> : <Save size={18} />}{modalMode === 'create' ? t('topics.modals.btn_create') : t('topics.modals.btn_save')}</button>
						</form>
					</div>
				</div>
			)}

			{isDeleteModalOpen && (
				<div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)}></div>
					<div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-zoom-in text-center">
						<div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
						<h3 className="text-xl font-bold text-slate-800 mb-2">{t('topics.modals.delete_title')}</h3>
						<p className="text-sm text-slate-500 mb-6">{t('topics.modals.delete_desc', { count: selectedIds.length })}</p>
						<div className="flex gap-3"><button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">{t('common.cancel')}</button><button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-colors">{t('common.delete')}</button></div>
					</div>
				</div>
			)}

			{isTransferModalOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsTransferModalOpen(false)}></div>
					<div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-zoom-in">
						<div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><ArrowRightLeft size={20} className="text-indigo-600" />{t('topics.modals.transfer_title')}</h3><button onClick={() => setIsTransferModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100"><X size={20} className="text-slate-400" /></button></div>
						<form onSubmit={handleTransfer} className="space-y-5">
							<div className="bg-slate-100 p-1 rounded-xl flex"><button type="button" onClick={() => setTransferType('move')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${transferType === 'move' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}><ArrowRightLeft size={16} /> {t('topics.modals.move')}</button><button type="button" onClick={() => setTransferType('copy')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${transferType === 'copy' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}><Copy size={16} /> {t('topics.modals.copy')}</button></div>
							<div className="space-y-4">
								<div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('topics.modals.target_school')}</label><div className="relative"><School size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /><select value={targetSchool} onChange={(e) => setTargetSchool(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-indigo-500 outline-none appearance-none">{localizedSchools.map(school => (<option key={school.id} value={school.id}>{school.name}</option>))}</select></div></div>
								<div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('topics.modals.target_class')}</label><div className="relative"><GraduationCap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" /><select value={targetGrade} onChange={(e) => setTargetGrade(Number(e.target.value))} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-indigo-500 outline-none appearance-none">{[...Array(11)].map((_, i) => (<option key={i} value={i + 1}>{i + 1} {t('topics.filters.class')}</option>))}</select></div></div>
							</div>
							<button type="submit" className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${transferType === 'move' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}>{transferType === 'move' ? t('topics.modals.move') : t('topics.modals.copy')}</button>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default Topics;