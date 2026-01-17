import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
	Plus, ArrowLeft, School as SchoolIcon, ChevronDown, X,
	Settings2, Edit2, Check, Globe, GraduationCap, Search, ArrowRight, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ИМПОРТЫ
import { ClassService } from '../../services/classService';
import type { StudentClass } from '../../services/classService';
import { SchoolService } from '../../services/schoolService';
import type { School } from '../../services/schoolService';

// --- КОМПОНЕНТ: ВЫПАДАЮЩИЙ СПИСОК ---
interface Option { value: string | number; label: string; }
interface CustomSelectProps {
	value: string | number | null;
	onChange: (value: any) => void;
	options: Option[];
	placeholder?: string;
	icon?: React.ElementType;
	className?: string;
	isSearchable?: boolean;
	highlightSelected?: boolean;
	searchPlaceholder?: string;
	notFoundText?: string;
}

const CustomSelect = ({
	value, onChange, options, placeholder, icon: Icon, className,
	isSearchable = false, highlightSelected = false,
	searchPlaceholder = "...", notFoundText = "..."
}: CustomSelectProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const ref = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	useEffect(() => {
		if (isOpen && isSearchable && searchInputRef.current) searchInputRef.current.focus();
		if (!isOpen) setSearchTerm('');
	}, [isOpen, isSearchable]);

	const selectedLabel = options.find(o => o.value === value)?.label || placeholder;
	const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

	const textColorClass = highlightSelected && value
		? 'text-orange-500 font-black'
		: (value ? 'text-slate-700' : 'text-slate-400');

	return (
		<div className={`relative ${className}`} ref={ref}>
			<div onClick={() => setIsOpen(!isOpen)} className={`w-full pl-12 pr-10 py-3.5 bg-slate-50 border-2 rounded-2xl cursor-pointer flex items-center transition-all duration-200 ${isOpen ? 'border-orange-400 bg-white shadow-lg ring-4 ring-orange-500/10' : 'border-transparent hover:bg-slate-100 hover:border-slate-200'}`}>
				{Icon && <Icon className={`absolute left-4 ${isOpen || (highlightSelected && value) ? 'text-orange-500' : 'text-slate-400'} transition-colors`} size={20} />}
				<span className={`font-bold truncate ${textColorClass}`}>{selectedLabel}</span>
				<ChevronDown className={`absolute right-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-orange-500' : ''}`} size={18} />
			</div>
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, y: 10, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 10, scale: 0.95 }}
						className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
					>
						{isSearchable && (
							<div className="p-2 sticky top-0 bg-white border-b border-slate-100 z-10">
								<div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input ref={searchInputRef} type="text" placeholder={searchPlaceholder} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-orange-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} /></div>
							</div>
						)}
						{filteredOptions.length > 0 ? filteredOptions.map((opt) => (
							<div key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`px-4 py-3 text-sm font-bold cursor-pointer transition-colors flex items-center justify-between ${value === opt.value ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
								{opt.label}{value === opt.value && <Check size={16} className="text-orange-500" />}
							</div>
						)) : <div className="px-4 py-8 text-center text-slate-400 text-xs font-bold">{notFoundText}</div>}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

// --- ОСНОВНОЙ КОМПОНЕНТ ---
const Classes = () => {
	const navigate = useNavigate();
	// 🔥 1. Достаем i18n для проверки языка
	const { t, i18n } = useTranslation();

	const [schools, setSchools] = useState<School[]>([]);
	const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
	const [classes, setClasses] = useState<StudentClass[]>([]);
	const [loading, setLoading] = useState(true);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [formData, setFormData] = useState({ grade_level: 1, section: '', language: 'Русский' });
	const [editingClass, setEditingClass] = useState<StudentClass | null>(null);

	// Состояния для удаления
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const [bulkDeleteGrade, setBulkDeleteGrade] = useState<number | null>(null);

	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [minGrade, setMinGrade] = useState<number>(1);
	const [maxGrade, setMaxGrade] = useState<number>(11);

	// 🔥 2. Хелпер для получения переведенного имени школы
	const getSchoolName = (school: School | undefined) => {
		if (!school) return '';
		const lang = i18n.language;
		if (lang === 'tj' && school.name_tj) return school.name_tj;
		if (lang === 'en' && school.name_en) return school.name_en;
		return school.name; // Fallback на русский/дефолтный
	};

	// --- ЗАГРУЗКА ---
	const fetchSchools = async () => {
		try {
			const data = await SchoolService.getAll();
			setSchools(data);
			if (!selectedSchoolId && data.length > 0) setSelectedSchoolId(data[0].id);
		} catch (error) { console.error(error); }
	};
	useEffect(() => { fetchSchools(); }, []);

	const fetchClasses = async () => {
		if (!selectedSchoolId) { if (schools.length === 0) return; setSelectedSchoolId(schools[0].id); return; }
		setLoading(true);
		const currentSchool = schools.find(s => s.id === selectedSchoolId);
		if (currentSchool) {
			setMinGrade(Number(currentSchool.min_grade_level) || 1);
			setMaxGrade(Number(currentSchool.max_grade_level) || 11);
		}
		try {
			const data = await ClassService.getAll(selectedSchoolId);
			setClasses(data);
		} catch (error) { console.error(error); } finally { setLoading(false); }
	};
	useEffect(() => { fetchClasses(); }, [selectedSchoolId, schools]);

	// 🔥 ОБРАБОТЧИК ESCAPE 🔥
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				if (isModalOpen) setIsModalOpen(false);
				if (isSettingsOpen) setIsSettingsOpen(false);
				if (deleteId) setDeleteId(null);
				if (bulkDeleteGrade) setBulkDeleteGrade(null);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isModalOpen, isSettingsOpen, deleteId, bulkDeleteGrade]);


	// --- HANDLERS ---
	const handleUpdateSchoolSettings = async () => {
		if (!selectedSchoolId) return;
		try {
			await ClassService.updateSchoolSettings(selectedSchoolId, minGrade, maxGrade);
			setIsSettingsOpen(false);
			setSchools(prev => prev.map(s => s.id === selectedSchoolId ? { ...s, min_grade_level: minGrade, max_grade_level: maxGrade } : s));
		} catch (error) { alert(t('classes.messages.error_settings')); }
	};

	const handleSaveClass = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedSchoolId) return;
		try {
			const payload = { ...formData, school: selectedSchoolId };
			if (editingClass) await ClassService.update(editingClass.id, payload);
			else await ClassService.create(payload);
			fetchClasses();
			setIsModalOpen(false);
		} catch (error: any) { alert(error.response?.data?.detail || t('classes.messages.error_save')); }
	};

	const handleDeleteClass = async () => {
		if (!deleteId) return;
		try {
			await ClassService.delete(deleteId);
			fetchClasses();
			setDeleteId(null);
		} catch (error) { alert(t('classes.messages.error_delete')); }
	};

	const handleBulkDelete = async () => {
		if (!bulkDeleteGrade || !selectedSchoolId) return;
		try {
			await ClassService.deleteGrade(selectedSchoolId, bulkDeleteGrade);
			fetchClasses();
			setBulkDeleteGrade(null);
		} catch (error) { alert(t('classes.messages.error_bulk')); }
	};

	const openCreateModal = (grade?: number) => {
		setEditingClass(null);
		setFormData({ grade_level: grade || minGrade, section: '', language: 'Русский' });
		setIsModalOpen(true);
	};

	// --- ГРУППИРОВКА ---
	const groups: { [key: number]: StudentClass[] } = {};
	for (let i = minGrade; i <= maxGrade; i++) groups[i] = [];
	classes.forEach(cls => { if (!groups[cls.grade_level]) groups[cls.grade_level] = []; groups[cls.grade_level].push(cls); });

	const gradeOptions = Array.from({ length: maxGrade - minGrade + 1 }, (_, i) => {
		const val = minGrade + i;
		return { value: val, label: `${val}${t('classes.grade_single')}` };
	});

	// 🔥 3. ИСПОЛЬЗУЕМ ХЕЛПЕР ДЛЯ ОПЦИЙ (Здесь была ошибка)
	const schoolOptions = schools.map(s => ({
		value: s.id,
		label: getSchoolName(s) // <--- Было s.name, стало getSchoolName(s)
	}));

	const languageOptions = [
		{ value: 'Русский', label: 'Русский' },
		{ value: 'Таджикский', label: 'Тоҷикӣ' },
		{ value: 'Английский', label: 'English' }
	];
	const activeSchool = schools.find(s => s.id === selectedSchoolId);

	return (
		<div className="w-full mt-2 pb-20">
			{/* HEADER */}
			<div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 animate-fade-in-up">
				<div>
					<button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-4">
						<div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform"><ArrowLeft size={16} /></div>
						<span className="text-xs font-bold uppercase tracking-wider">{t('common.back')}</span>
					</button>
					<h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">{t('classes.title')}</span>
					</h1>
					<p className="text-slate-500 font-medium mt-1">
						{t('classes.subtitle')} <span className="font-bold text-orange-500">{t('classes.grades_range', { min: minGrade, max: maxGrade })}</span>
					</p>
				</div>
				<div className="flex flex-col gap-2 min-w-[320px]">
					<div className="flex justify-between items-center">
						<label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('classes.current_school')}</label>
						<button onClick={() => setIsSettingsOpen(true)} className="text-[10px] font-bold text-orange-500 hover:text-orange-600 uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-orange-50 px-2 py-1 rounded-md hover:bg-orange-100 transition-colors">
							<Settings2 size={12} /> {t('classes.configure_btn')}
						</button>
					</div>
					<CustomSelect
						value={selectedSchoolId}
						onChange={setSelectedSchoolId}
						options={schoolOptions} // Теперь здесь локализованные имена
						icon={SchoolIcon}
						placeholder={t('classes.select_school')}
						isSearchable={true}
						highlightSelected={true}
						searchPlaceholder={t('classes.messages.search')}
						notFoundText={t('classes.messages.not_found')}
					/>
				</div>
			</div>

			{/* GRID */}
			{loading && classes.length === 0 ? (
				<div className="flex justify-center h-40 items-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent"></div></div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
					<button onClick={() => openCreateModal()} className="group relative min-h-[180px] rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-orange-400 bg-orange-50/10 hover:bg-orange-50/50 transition-all flex flex-col items-center justify-center gap-3">
						<div className="w-14 h-14 rounded-full bg-white shadow-md group-hover:shadow-orange-200 flex items-center justify-center text-slate-300 group-hover:text-orange-500 group-hover:scale-110 transition-all"><Plus size={28} /></div>
						<span className="font-bold text-slate-400 group-hover:text-orange-600">{t('classes.add_card_title')}</span>
					</button>

					{Object.entries(groups).map(([gradeStr, classList]) => {
						const grade = Number(gradeStr);
						return (
							<motion.div
								key={grade}
								layout
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								onClick={() => openCreateModal(grade)}
								className={`
									rounded-[2rem] p-6 border transition-all duration-300 flex flex-col h-full cursor-pointer relative group/card
									${classList.length > 0 ? 'bg-white border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-orange-500/10 hover:border-orange-200' : 'bg-slate-50/50 border-slate-100 opacity-70 hover:opacity-100 hover:bg-white'}
								`}
							>
								<div className="flex justify-between items-start mb-4">
									<div className="flex items-center gap-3">
										<div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-md transition-transform group-hover/card:scale-110 ${classList.length > 0 ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white' : 'bg-white text-slate-300'}`}>{grade}</div>
										<div><h3 className="font-bold text-slate-700 text-lg group-hover/card:text-orange-600 transition-colors">{grade}{t('classes.grade_label')}</h3><span className="text-xs font-bold text-slate-400">{classList.length} {t('classes.classes_count')}</span></div>
									</div>

									<div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
										<button
											onClick={(e) => { e.stopPropagation(); openCreateModal(grade); }}
											className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-orange-50 hover:text-orange-500 transition-colors"
											title={t('classes.tooltips.add')}
										>
											<Plus size={16} />
										</button>

										<button
											onClick={(e) => { e.stopPropagation(); openCreateModal(grade); }}
											className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
											title={t('classes.tooltips.manage')}
										>
											<Edit2 size={16} />
										</button>

										{classList.length > 0 && (
											<button
												onClick={(e) => { e.stopPropagation(); setBulkDeleteGrade(grade); }}
												className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
												title={t('classes.tooltips.delete_grade')}
											>
												<Trash2 size={16} />
											</button>
										)}
									</div>
								</div>

								<div className="flex flex-wrap gap-2 content-start flex-grow">
									{classList.length === 0 ? (
										<div className="flex flex-col items-center justify-center w-full h-full min-h-[60px] text-slate-300">
											<Plus size={24} className="mb-1 opacity-50" />
											<p className="text-xs font-bold">{t('classes.click_to_create')}</p>
										</div>
									) : classList.map(cls => (
										<div key={cls.id} className="group/chip relative cursor-pointer" onClick={(e) => e.stopPropagation()}>
											<div onClick={() => { setEditingClass(cls); setFormData({ grade_level: cls.grade_level, section: cls.section, language: cls.language }); setIsModalOpen(true); }} className="px-4 py-2 rounded-xl bg-orange-50 text-orange-700 font-bold border border-orange-100 flex items-center gap-2 hover:bg-orange-100 hover:border-orange-200 transition-colors">
												<span>{cls.grade_level}<span className="text-lg">{cls.section}</span></span>
											</div>
											<button onClick={(e) => { e.stopPropagation(); setDeleteId(cls.id); }} className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-red-100 text-red-500 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover/chip:opacity-100 transition-all hover:bg-red-500 hover:text-white hover:scale-110 z-10"><X size={12} strokeWidth={3} /></button>
										</div>
									))}
								</div>
							</motion.div>
						);
					})}
				</div>
			)}

			{/* МОДАЛКА: СОЗДАНИЕ/РЕДАКТИРОВАНИЕ */}
			<AnimatePresence>
				{isModalOpen && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
						<motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm z-10">
							<div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white text-center rounded-t-[2rem]">
								<h3 className="text-2xl font-black">{editingClass ? t('classes.modal.edit_title') : t('classes.modal.new_title')}</h3>
								{/* 🔥 4. ИСПОЛЬЗУЕМ ХЕЛПЕР ДЛЯ ИМЕНИ В МОДАЛКЕ */}
								<p className="opacity-90 text-sm font-medium">{getSchoolName(activeSchool)}</p>
							</div>

							<form onSubmit={handleSaveClass} className="p-6 space-y-5">
								<div>
									<label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">{t('classes.modal.grade_label')}</label>
									<CustomSelect
										value={formData.grade_level}
										onChange={(val) => setFormData({ ...formData, grade_level: val })}
										options={gradeOptions}
										icon={GraduationCap}
										searchPlaceholder={t('classes.messages.search')}
										notFoundText={t('classes.messages.not_found')}
									/>
								</div>
								<div>
									<label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">{t('classes.modal.section_label')}</label>
									<div className="relative group"><Edit2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20} /><input type="text" maxLength={3} placeholder={t('classes.modal.section_placeholder')} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-orange-400 focus:shadow-lg focus:ring-4 focus:ring-orange-500/10 transition-all uppercase" value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value.toUpperCase() })} required /></div>
								</div>
								<div>
									<label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">{t('classes.modal.language_label')}</label>
									<CustomSelect
										value={formData.language}
										onChange={(val) => setFormData({ ...formData, language: val })}
										options={languageOptions}
										icon={Globe}
										searchPlaceholder={t('classes.messages.search')}
										notFoundText={t('classes.messages.not_found')}
									/>
								</div>

								<div className="pt-2 flex gap-3">
									<button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100">{t('classes.modal.cancel')}</button>
									<button type="submit" className="flex-1 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-xl shadow-orange-500/30 transition-all active:scale-95">{editingClass ? t('classes.modal.save') : t('classes.modal.create')}</button>
								</div>
							</form>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{/* МОДАЛКА НАСТРОЕК (Мин/Макс классы) */}
			<AnimatePresence>
				{isSettingsOpen && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsSettingsOpen(false)} />
						<motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden z-10 p-6 text-center">
							<div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500"><Settings2 size={32} /></div>
							<h3 className="text-xl font-black text-slate-800">{t('classes.settings.title')}</h3>
							<p className="text-sm text-slate-500 mb-6">{t('classes.settings.subtitle')}</p>
							<div className="flex items-center justify-between gap-4 mb-8">
								<div className="flex flex-col items-center gap-2">
									<span className="text-[10px] font-bold text-slate-400 uppercase">{t('classes.settings.min_label')}</span>
									<div className="flex items-center gap-2">
										<button onClick={() => setMinGrade(m => Math.max(1, m - 1))} className="w-10 h-10 rounded-xl bg-slate-100 font-bold hover:bg-slate-200 transition-colors">-</button>
										<span className="text-3xl font-black text-slate-800 w-10">{minGrade}</span>
										<button onClick={() => setMinGrade(m => Math.min(maxGrade - 1, m + 1))} className="w-10 h-10 rounded-xl bg-slate-100 font-bold hover:bg-slate-200 transition-colors">+</button>
									</div>
								</div>
								<ArrowRight className="text-slate-300 mt-5" />
								<div className="flex flex-col items-center gap-2">
									<span className="text-[10px] font-bold text-slate-400 uppercase">{t('classes.settings.max_label')}</span>
									<div className="flex items-center gap-2">
										<button onClick={() => setMaxGrade(m => Math.max(minGrade + 1, m - 1))} className="w-10 h-10 rounded-xl bg-slate-100 font-bold hover:bg-slate-200 transition-colors">-</button>
										<span className="text-3xl font-black text-slate-800 w-10">{maxGrade}</span>
										<button onClick={() => setMaxGrade(m => Math.min(13, m + 1))} className="w-10 h-10 rounded-xl bg-slate-100 font-bold hover:bg-slate-200 transition-colors">+</button>
									</div>
								</div>
							</div>
							<button onClick={handleUpdateSchoolSettings} className="w-full py-3.5 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-900 shadow-xl transition-transform active:scale-95">{t('classes.settings.apply')}</button>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{/* МОДАЛКА: УДАЛЕНИЕ ОДНОГО КЛАССА */}
			{deleteId && (
				<div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
					<div className="relative bg-white rounded-[2rem] p-8 shadow-2xl max-w-xs w-full text-center z-10">
						<h3 className="font-bold text-2xl text-slate-800 mb-2">{t('classes.delete.single_title')}</h3>
						<div className="flex gap-3 mt-6">
							<button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200">{t('classes.delete.no')}</button>
							<button onClick={handleDeleteClass} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600">{t('classes.delete.yes')}</button>
						</div>
					</div>
				</div>
			)}

			{/* 🔥 МОДАЛКА: МАССОВОЕ УДАЛЕНИЕ */}
			{bulkDeleteGrade && (
				<div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setBulkDeleteGrade(null)} />
					<div className="relative bg-white rounded-[2rem] p-8 shadow-2xl max-w-sm w-full text-center z-10 border-4 border-red-50">
						<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 animate-pulse"><Trash2 size={32} /></div>
						<h3 className="font-black text-2xl text-slate-800 mb-2">{t('classes.delete.bulk_title', { grade: bulkDeleteGrade })}</h3>
						<p className="text-slate-500 font-medium">{t('classes.delete.bulk_desc')}</p>
						<div className="flex gap-3 mt-6">
							<button onClick={() => setBulkDeleteGrade(null)} className="flex-1 py-3.5 rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200">{t('classes.delete.cancel')}</button>
							<button onClick={handleBulkDelete} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 shadow-lg shadow-red-500/30 text-white font-bold hover:from-red-600 hover:to-rose-700">{t('classes.delete.delete_all')}</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Classes;