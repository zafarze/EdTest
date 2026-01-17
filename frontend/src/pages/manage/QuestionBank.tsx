import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
	Search, Plus, Trash2, CheckCircle2,
	ChevronRight, Layers, HelpCircle, Image as ImageIcon, X,
	Eye, FileSpreadsheet, Download, UploadCloud, Edit3, AlertTriangle,
	PanelLeftClose, PanelLeftOpen,
	CheckSquare, ToggleLeft, AlignLeft, MoreHorizontal, GitMerge, ArrowDownUp, ChevronDown, Check
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

// СЕРВИСЫ
import { TopicService } from '../../services/topicService';
import { QuestionService } from '../../services/questionService';
import type { Question, Choice } from '../../services/questionService';
import type { Topic } from '../../services/topicService';

// --- 1. ХЕЛПЕР ДЛЯ ПОЛУЧЕНИЯ ТИПОВ (ДИНАМИЧЕСКИЙ ПЕРЕВОД) ---
const getQuestionTypes = (t: any) => [
	{ id: 'single', label: t('questions.types.single'), desc: t('questions.descriptions.single'), icon: CheckCircle2, color: 'text-indigo-600 bg-indigo-50' },
	{ id: 'multiple', label: t('questions.types.multiple'), desc: t('questions.descriptions.multiple'), icon: CheckSquare, color: 'text-purple-600 bg-purple-50' },
	{ id: 'true_false', label: t('questions.types.true_false'), desc: t('questions.descriptions.true_false'), icon: ToggleLeft, color: 'text-emerald-600 bg-emerald-50' },
	{ id: 'essay', label: t('questions.types.essay'), desc: t('questions.descriptions.essay'), icon: AlignLeft, color: 'text-amber-600 bg-amber-50' },
	{ id: 'blanks', label: t('questions.types.blanks'), desc: t('questions.descriptions.blanks'), icon: MoreHorizontal, color: 'text-blue-600 bg-blue-50' },
	{ id: 'matching', label: t('questions.types.matching'), desc: t('questions.descriptions.matching'), icon: GitMerge, color: 'text-rose-600 bg-rose-50' },
	{ id: 'ordering', label: t('questions.types.ordering'), desc: t('questions.descriptions.ordering'), icon: ArrowDownUp, color: 'text-cyan-600 bg-cyan-50' },
];

// --- 2. КОМПОНЕНТ СЕЛЕКТОРА ТИПОВ ---
const QuestionTypeSelector = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
	const { t } = useTranslation();
	const [isOpen, setIsOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	// Получаем переведенный список типов
	const typesList = getQuestionTypes(t);

	useEffect(() => {
		const clickOutside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
		document.addEventListener('mousedown', clickOutside); return () => document.removeEventListener('mousedown', clickOutside);
	}, []);

	const selected = typesList.find(t => t.id === value) || typesList[0];
	const SelectedIcon = selected.icon;

	return (
		<div className="relative" ref={ref}>
			<div onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-all ${isOpen ? 'ring-2 ring-indigo-100 border-indigo-300 bg-white' : ''}`}>
				<div className="flex items-center gap-3">
					<div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selected.color}`}>
						<SelectedIcon size={18} />
					</div>
					<div className="text-left">
						<div className="text-sm font-bold text-slate-700 leading-tight">{selected.label}</div>
						<div className="text-[10px] font-bold text-slate-400">{selected.desc}</div>
					</div>
				</div>
				<ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
			</div>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, y: 10, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 10, scale: 0.95 }}
						className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-80 flex flex-col custom-scrollbar overflow-y-auto"
					>
						<div className="p-1.5 grid grid-cols-1 gap-1">
							{typesList.map(type => (
								<button
									key={type.id}
									type="button"
									onClick={() => { onChange(type.id); setIsOpen(false); }}
									className={`flex items-center gap-3 p-2 rounded-xl transition-all text-left group ${value === type.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}
								>
									<div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${value === type.id ? 'bg-white shadow-sm' : 'bg-slate-100 group-hover:bg-white group-hover:shadow-sm'}`}>
										<type.icon size={16} className={value === type.id ? 'text-indigo-600' : 'text-slate-500'} />
									</div>
									<div className="flex-1">
										<div className={`text-xs font-bold ${value === type.id ? 'text-indigo-700' : 'text-slate-600'}`}>{type.label}</div>
									</div>
									{value === type.id && <Check size={16} className="ml-auto text-indigo-600" />}
								</button>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const QuestionBank = () => {
	const { t } = useTranslation();

	// Получаем типы здесь, чтобы использовать их для меток (label) в списке
	const localizedTypes = getQuestionTypes(t);

	// --- STATE ---
	const [topics, setTopics] = useState<Topic[]>([]);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
	const [loading, setLoading] = useState(false);
	const [searchTopic, setSearchTopic] = useState('');

	// UI STATE
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);

	// Модалки
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isImportModalOpen, setIsImportModalOpen] = useState(false);
	const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

	// Данные для работы
	const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
	const [importFile, setImportFile] = useState<File | null>(null);
	const [deletingId, setDeletingId] = useState<number | null>(null);

	// Форма (Create/Edit)
	const [editMode, setEditMode] = useState(false);
	const [currentQId, setCurrentQId] = useState<number | null>(null);

	const [qText, setQText] = useState('');
	const [qDifficulty, setQDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
	const [qType, setQType] = useState('single');
	const [qImage, setQImage] = useState<File | null>(null);
	const [qImagePreview, setQImagePreview] = useState<string | null>(null);

	const [choices, setChoices] = useState<Choice[]>([
		{ text: '', is_correct: false }, { text: '', is_correct: false },
		{ text: '', is_correct: false }, { text: '', is_correct: false }
	]);

	const fileInputRef = useRef<HTMLInputElement>(null);

	// ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ESC
	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setIsModalOpen(false);
				setIsImportModalOpen(false);
				setIsPreviewModalOpen(false);
				setIsDeleteModalOpen(false);
			}
		};
		window.addEventListener('keydown', handleEsc);
		return () => window.removeEventListener('keydown', handleEsc);
	}, []);

	// --- ЗАГРУЗКА ---
	useEffect(() => { fetchTopics(); }, []);
	useEffect(() => { if (selectedTopicId) fetchQuestions(selectedTopicId); }, [selectedTopicId]);

	const fetchTopics = async () => {
		try {
			const data = await TopicService.getAll({} as any);
			setTopics(data);
			if (data.length > 0 && !selectedTopicId) setSelectedTopicId(data[0].id);
		} catch (e) { console.error(e); }
	};

	const fetchQuestions = async (topicId: number) => {
		setLoading(true);
		try {
			const data = await QuestionService.getByTopic(topicId);
			setQuestions(data);
		} catch (e) { console.error(e); } finally { setLoading(false); }
	};

	// --- ФОРМА ---
	const openCreateModal = () => {
		setEditMode(false);
		setCurrentQId(null);
		resetForm();
		setIsModalOpen(true);
	};

	const openEditModal = (q: Question) => {
		setEditMode(true);
		setCurrentQId(q.id);
		setQText(q.text);
		setQDifficulty(q.difficulty);
		setQType(q.question_type);
		setQImagePreview(q.image || null);
		setQImage(null);

		const filledChoices = [...q.choices];
		while (filledChoices.length < 4) filledChoices.push({ text: '', is_correct: false });

		const formattedChoices = filledChoices.map(c => ({
			...c,
			previewUrl: typeof c.image === 'string' ? c.image : undefined
		}));

		setChoices(formattedChoices);
		setIsModalOpen(true);
	};

	const handleQImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			setQImage(file);
			setQImagePreview(URL.createObjectURL(file));
		}
	};

	const handleChoiceChange = (index: number, field: keyof Choice, value: any) => {
		const updated = [...choices];
		// @ts-ignore
		updated[index][field] = value;
		if (field === 'is_correct' && value === true && qType === 'single') {
			updated.forEach((c, i) => { if (i !== index) c.is_correct = false; });
		}
		setChoices(updated);
	};

	const handleChoiceImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			const updated = [...choices];
			updated[index].image = file;
			updated[index].previewUrl = URL.createObjectURL(file);
			setChoices(updated);
		}
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedTopicId) return;

		const formData = new FormData();
		formData.append('topic', selectedTopicId.toString());
		formData.append('text', qText);
		formData.append('difficulty', qDifficulty);
		// @ts-ignore
		formData.append('question_type', qType);
		if (qImage) formData.append('image', qImage);

		const choicesMeta = choices.map(c => ({
			id: c.id,
			text: c.text,
			is_correct: c.is_correct
		}));
		formData.append('choices_data', JSON.stringify(choicesMeta));

		choices.forEach((c, idx) => {
			if (c.image instanceof File) formData.append(`choice_image_${idx}`, c.image);
		});

		try {
			if (editMode && currentQId) {
				await QuestionService.update(currentQId, formData);
			} else {
				await QuestionService.create(formData);
			}
			setIsModalOpen(false);
			fetchQuestions(selectedTopicId);
			resetForm();
		} catch (error) { alert("Ошибка сохранения"); }
	};

	const resetForm = () => {
		setQText('');
		setQDifficulty('medium');
		setQType('single');
		setQImage(null);
		setQImagePreview(null);
		setChoices([
			{ text: '', is_correct: false }, { text: '', is_correct: false },
			{ text: '', is_correct: false }, { text: '', is_correct: false }
		]);
	};

	const openDeleteModal = (id: number) => {
		setDeletingId(id);
		setIsDeleteModalOpen(true);
	};

	const confirmDelete = async () => {
		if (!deletingId) return;
		try {
			await QuestionService.delete(deletingId);
			setQuestions(questions.filter(q => q.id !== deletingId));
			setIsDeleteModalOpen(false);
		} catch (e) { console.error(e); }
	};

	const handleImport = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!importFile || !selectedTopicId) return;
		const formData = new FormData();
		formData.append('file', importFile);
		formData.append('topic', selectedTopicId.toString());
		try {
			const res = await QuestionService.importExcel(formData);
			alert(`Импортировано: ${res.count}`);
			setIsImportModalOpen(false);
			fetchQuestions(selectedTopicId);
		} catch (error) { alert("Ошибка импорта"); }
	};

	const getDifficultyBadge = (diff: string) => {
		switch (diff) {
			case 'easy': return <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wide border border-emerald-200">Легкий</span>;
			case 'hard': return <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wide border border-rose-200">Сложный</span>;
			default: return <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wide border border-blue-200">Стандарт</span>;
		}
	};

	// 🔥 ИСПРАВЛЕННАЯ ФУНКЦИЯ: берет данные из динамического списка localizedTypes
	const getQuestionTypeLabel = (type: string) => {
		const found = localizedTypes.find(qt => qt.id === type);
		return found ? found.label : type;
	};

	return (
		<div className="flex h-[calc(100vh-100px)] gap-6 pb-6 font-sans relative">

			{/* === ЛЕВАЯ КОЛОНКА (ТЕМЫ) === */}
			<div className={`transition-all duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'w-80' : 'w-0 opacity-0 overflow-hidden'}`}>
				<div className="w-80 h-full bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden">
					<div className="p-5 bg-gradient-to-b from-white to-slate-50 border-b border-slate-100 flex justify-between items-center">
						<h3 className="font-black text-slate-800 flex items-center gap-2 text-lg">
							<Layers size={22} className="text-indigo-600" /> Темы
						</h3>
						<button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 rounded-full hover:bg-slate-200"><X size={18} /></button>
					</div>

					{/* Поиск */}
					<div className="px-5 pb-3 bg-slate-50 border-b border-slate-100">
						<div className="relative group">
							<Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
							<input
								type="text"
								placeholder="Поиск темы..."
								className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
								value={searchTopic}
								onChange={(e) => setSearchTopic(e.target.value)}
							/>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar bg-slate-50/50">
						{topics.filter(t => t.title.toLowerCase().includes(searchTopic.toLowerCase())).map(t => (
							<button
								key={t.id}
								onClick={() => setSelectedTopicId(t.id)}
								className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group relative overflow-hidden ${selectedTopicId === t.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'hover:bg-white hover:shadow-md text-slate-600'}`}
							>
								<span className="font-bold text-sm truncate relative z-10">{t.title}</span>
								<ChevronRight size={18} className={`relative z-10 transition-transform ${selectedTopicId === t.id ? 'text-indigo-200' : 'text-slate-300 group-hover:translate-x-1'}`} />
							</button>
						))}
					</div>
				</div>
			</div>

			{/* === ПРАВАЯ КОЛОНКА (ВОПРОСЫ) === */}
			<div className="flex-1 flex flex-col gap-6 h-full overflow-hidden relative">

				{/* Хедер */}
				<div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 flex justify-between items-center animate-fade-in-down transition-all">
					<div className="flex items-center gap-4">
						<button
							onClick={() => setIsSidebarOpen(!isSidebarOpen)}
							className="p-2.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-slate-500"
							title={isSidebarOpen ? "Свернуть меню" : "Развернуть меню"}
						>
							{isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
						</button>

						<div>
							<h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
								{topics.find(t => t.id === selectedTopicId)?.title || "Выберите тему"}
							</h2>
							{selectedTopicId && (
								<div className="flex items-center gap-2 mt-1">
									<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
									<p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{questions.length} ВОПРОСОВ</p>
								</div>
							)}
						</div>
					</div>

					<div className="flex gap-3">
						<button onClick={() => setIsImportModalOpen(true)} disabled={!selectedTopicId} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 hover:shadow-md active:scale-95">
							<FileSpreadsheet size={20} /> <span className="hidden sm:inline">Импорт</span>
						</button>
						<button onClick={openCreateModal} disabled={!selectedTopicId} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50">
							<Plus size={20} /> <span className="hidden sm:inline">Создать</span>
						</button>
					</div>
				</div>

				{/* Список вопросов */}
				<div className="flex-1 overflow-y-auto pr-2 pb-20 custom-scrollbar">
					{loading ? <div className="text-center py-20 text-slate-400 font-bold animate-pulse">Загрузка базы знаний...</div> : questions.length === 0 ?
						<div className="flex flex-col items-center justify-center h-full text-slate-300">
							<div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100"><HelpCircle size={48} /></div>
							<p className="font-bold text-lg">В этой теме пока пусто</p>
							{!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="mt-4 text-indigo-500 font-bold text-sm hover:underline">Открыть список тем</button>}
						</div>
						: (
							<div className={`grid gap-6 ${isSidebarOpen ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
								{questions.map((q, i) => (
									<div key={q.id} className="group bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 relative overflow-hidden">
										<div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

										<div className="flex gap-6">
											{/* Номер */}
											<div className="flex flex-col gap-3 shrink-0">
												<div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center font-black text-sm border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
													{i + 1}
												</div>
												{q.image && (
													<div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-100 shadow-inner relative group/img cursor-pointer" onClick={() => { setPreviewQuestion(q); setIsPreviewModalOpen(true); }}>
														<img src={q.image} alt="Q" className="w-full h-full object-cover" />
														<div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white"><Eye size={16} /></div>
													</div>
												)}
											</div>

											{/* Контент */}
											<div className="flex-1">
												<div className="flex justify-between items-start mb-3">
													<div className="flex gap-2 mb-2">
														{getDifficultyBadge(q.difficulty)}
														<span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wide border border-slate-200">
															{/* 🔥 Используем исправленную функцию для перевода */}
															{getQuestionTypeLabel(q.question_type)}
														</span>
													</div>

													<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
														<button onClick={() => openEditModal(q)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Редактировать"><Edit3 size={18} /></button>
														<button onClick={() => { setPreviewQuestion(q); setIsPreviewModalOpen(true); }} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Предпросмотр"><Eye size={18} /></button>
														<div className="w-px h-6 bg-slate-200 mx-1 my-auto"></div>
														<button onClick={() => openDeleteModal(q.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Удалить"><Trash2 size={18} /></button>
													</div>
												</div>

												<h4 className="font-bold text-slate-800 text-lg leading-relaxed mb-4 pr-10 line-clamp-3">{q.text}</h4>

												{/* Варианты ответов */}
												<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
													{q.choices.map((c, idx) => (
														<div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${c.is_correct ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-50 group-hover:border-slate-100'}`}>
															<div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] border ${c.is_correct ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
																{String.fromCharCode(65 + idx)}
															</div>
															<span className={`text-xs font-bold ${c.is_correct ? 'text-emerald-800' : 'text-slate-600'} truncate`}>{c.text}</span>
															{c.is_correct && <CheckCircle2 size={14} className="ml-auto text-emerald-500 shrink-0" />}
														</div>
													))}
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
				</div>
			</div>

			{/* === МОДАЛКИ С ИСПОЛЬЗОВАНИЕМ ПОРТАЛОВ (FIX Z-INDEX) === */}

			{/* Create/Edit Modal */}
			{isModalOpen && createPortal(
				<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
					<div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-zoom-in border border-white/20">

						{/* Header */}
						<div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
							<div>
								<h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
									{editMode ? <Edit3 size={28} className="text-indigo-500" /> : <Plus size={28} className="text-emerald-500" />}
									{editMode ? 'Редактирование вопроса' : 'Новый вопрос'}
								</h3>
								<p className="text-sm font-bold text-slate-400 ml-10">
									{topics.find(t => t.id === selectedTopicId)?.title}
								</p>
							</div>
							<button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"><X size={28} /></button>
						</div>

						<form onSubmit={handleSave} className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
							<div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 custom-scrollbar">

								{/* ЛЕВАЯ ЧАСТЬ: Настройки вопроса (5 колонок) */}
								<div className="lg:col-span-5 space-y-6">
									<div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
										<div>
											<label className="block text-xs font-black text-indigo-400 uppercase mb-2 ml-1">Текст вопроса</label>
											<textarea required rows={4} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none shadow-inner text-lg leading-relaxed transition-all" placeholder="Напишите вопрос..." value={qText} onChange={e => setQText(e.target.value)} />
										</div>

										<div className="grid grid-cols-2 gap-4">
											<div>
												<label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Сложность</label>
												<div className="relative">
													<select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-indigo-500 outline-none appearance-none cursor-pointer hover:bg-white transition-colors" value={qDifficulty} onChange={(e: any) => setQDifficulty(e.target.value)}>
														<option value="easy">🟢 Легкий (x1)</option>
														<option value="medium">🔵 Стандарт (x2)</option>
														<option value="hard">🔴 Сложный (x3)</option>
													</select>
												</div>
											</div>
											<div>
												<label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Тип ответа</label>
												<QuestionTypeSelector value={qType} onChange={setQType} />
											</div>
										</div>

										{/* Загрузка фото */}
										<div>
											<label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Изображение вопроса</label>
											<div onClick={() => fileInputRef.current?.click()} className="cursor-pointer border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-2xl h-48 flex flex-col items-center justify-center transition-all group relative overflow-hidden bg-slate-50">
												{qImagePreview ? (
													<img src={qImagePreview} className="w-full h-full object-contain p-2" />
												) : (
													<>
														<div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-indigo-400 group-hover:scale-110 transition-transform"><ImageIcon size={24} /></div>
														<span className="text-sm font-bold text-slate-400 group-hover:text-indigo-500">Загрузить фото</span>
													</>
												)}
												{qImagePreview && <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-white font-bold bg-black/50 px-4 py-2 rounded-xl backdrop-blur-sm">Изменить</span></div>}
											</div>
											<input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleQImageChange} />
										</div>
									</div>
								</div>

								{/* ПРАВАЯ ЧАСТЬ: Варианты ответов */}
								<div className="lg:col-span-7 flex flex-col h-full">
									<div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex-1 flex flex-col">
										<div className="flex justify-between items-center mb-6">
											<label className="block text-xs font-black text-slate-400 uppercase ml-1">Варианты ответов</label>
											<span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg">Отметьте верные галочкой</span>
										</div>

										<div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
											{choices.map((c, idx) => (
												<div key={idx} className={`flex items-start gap-4 p-2 rounded-2xl transition-all ${c.is_correct ? 'bg-emerald-50/50 ring-1 ring-emerald-100' : 'hover:bg-slate-50'}`}>
													<button type="button" onClick={() => handleChoiceChange(idx, 'is_correct', !c.is_correct)} className={`mt-2 w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 shadow-sm ${c.is_correct ? 'bg-emerald-500 text-white shadow-emerald-200 scale-105' : 'bg-white border border-slate-200 text-slate-300 hover:border-slate-300'}`}>
														<CheckCircle2 size={20} />
													</button>

													<div className="flex-1 space-y-2">
														<div className="flex gap-2">
															<div className="w-8 flex items-center justify-center font-black text-slate-300 text-sm select-none">{String.fromCharCode(65 + idx)}</div>
															<input type="text" placeholder={`Вариант ответа...`} className={`w-full px-4 py-3 rounded-xl border-2 outline-none font-bold transition-all text-sm ${c.is_correct ? 'border-emerald-500 bg-white' : 'border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-400'}`} value={c.text} onChange={e => handleChoiceChange(idx, 'text', e.target.value)} />
														</div>

														<label className="flex items-center gap-2 cursor-pointer w-fit ml-10 group/mini">
															<div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${c.previewUrl ? 'bg-white border-slate-200' : 'bg-slate-50 border-transparent hover:bg-indigo-50 hover:text-indigo-500'}`}>
																{c.previewUrl ? <img src={c.previewUrl} className="w-full h-full object-cover rounded-lg" /> : <ImageIcon size={14} className="text-slate-400" />}
															</div>
															<span className="text-[10px] font-bold text-slate-400 group-hover/mini:text-indigo-500 transition-colors">
																{c.previewUrl ? 'Изменить фото' : 'Добавить фото'}
															</span>
															<input type="file" accept="image/*" className="hidden" onChange={(e) => handleChoiceImageChange(idx, e)} />
														</label>
													</div>
												</div>
											))}
										</div>
									</div>
								</div>

							</div>

							{/* Footer */}
							<div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-4 shrink-0">
								<button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Отмена</button>
								<button type="submit" className="px-10 py-4 rounded-2xl font-black text-white text-lg shadow-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] transition-all flex items-center gap-3">
									<CheckCircle2 size={24} /> {editMode ? 'Сохранить изменения' : 'Создать вопрос'}
								</button>
							</div>
						</form>
					</div>
				</div>,
				document.body
			)}

			{/* Delete Modal */}
			{isDeleteModalOpen && createPortal(
				<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)}></div>
					<div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-zoom-in">
						<div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
							<AlertTriangle size={40} />
						</div>
						<h3 className="text-2xl font-black text-slate-800 mb-2">Удалить вопрос?</h3>
						<p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">
							Это действие нельзя отменить. <br />Вопрос исчезнет из банка навсегда.
						</p>
						<div className="flex gap-3">
							<button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
								Отмена
							</button>
							<button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-colors">
								Да, удалить
							</button>
						</div>
					</div>
				</div>,
				document.body
			)}

			{/* Preview Modal */}
			{isPreviewModalOpen && previewQuestion && createPortal(
				<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsPreviewModalOpen(false)}></div>
					<div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-zoom-in">
						<div className="bg-indigo-600 px-8 py-5 flex justify-between items-center">
							<h3 className="text-white font-bold flex items-center gap-2 text-lg"><Eye size={24} /> Предпросмотр вопроса</h3>
							<button onClick={() => setIsPreviewModalOpen(false)} className="text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full"><X size={20} /></button>
						</div>
						<div className="p-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
							{previewQuestion.image && (
								<div className="rounded-2xl overflow-hidden shadow-lg border border-slate-100 mb-8 max-w-lg mx-auto">
									<img src={previewQuestion.image} className="w-full h-auto" />
								</div>
							)}
							<h2 className="text-2xl font-black text-slate-800 mb-8 leading-snug text-center">{previewQuestion.text}</h2>
							<div className="space-y-4">
								{previewQuestion.choices.map((c, idx) => (
									<div key={idx} className={`p-5 rounded-2xl border-2 flex items-center gap-5 transition-all ${c.is_correct ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
										<div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg border-2 ${c.is_correct ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
											{String.fromCharCode(65 + idx)}
										</div>
										{/* @ts-ignore */}
										{c.image && <img src={c.image} className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm" />}
										<span className={`text-lg font-bold flex-1 ${c.is_correct ? 'text-emerald-900' : 'text-slate-700'}`}>{c.text}</span>
										{c.is_correct && <CheckCircle2 className="text-emerald-500" size={24} />}
									</div>
								))}
							</div>
						</div>
					</div>
				</div>,
				document.body
			)}

			{/* Import Modal */}
			{isImportModalOpen && createPortal(
				<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)}></div>
					<div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-zoom-in">
						<div className="flex justify-between items-center mb-6">
							<h3 className="text-xl font-black text-slate-800">Импорт Excel</h3>
							<button onClick={() => setIsImportModalOpen(false)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100"><X size={20} className="text-slate-400" /></button>
						</div>

						<div className="mb-6 p-5 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
							<p className="text-xs font-bold text-indigo-400 mb-3 uppercase tracking-wider">ШАГ 1. Скачайте шаблон</p>
							<button onClick={() => QuestionService.downloadTemplate()} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-indigo-100 text-indigo-600 py-3 rounded-xl text-sm font-bold hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm">
								<Download size={18} /> Скачать шаблон (.xlsx)
							</button>
						</div>

						<form onSubmit={handleImport}>
							<p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider text-center">ШАГ 2. Загрузите файл</p>
							<label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-white hover:border-indigo-400 transition-all mb-6 group">
								<div className="flex flex-col items-center justify-center pt-5 pb-6">
									<UploadCloud size={40} className="text-slate-300 group-hover:text-indigo-500 transition-colors mb-3" />
									<p className="text-sm text-slate-500 font-bold group-hover:text-slate-700">{importFile ? importFile.name : "Нажмите для выбора"}</p>
								</div>
								<input type="file" accept=".xlsx" className="hidden" onChange={(e) => e.target.files && setImportFile(e.target.files[0])} />
							</label>

							<button type="submit" disabled={!importFile} className="w-full py-4 rounded-2xl font-black text-white shadow-xl bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none">
								Загрузить вопросы
							</button>
						</form>
					</div>
				</div>,
				document.body
			)}
		</div>
	);
};

export default QuestionBank;