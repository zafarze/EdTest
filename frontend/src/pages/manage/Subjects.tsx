import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
	BookOpen, Plus, Search, Edit2, Trash2, Calculator,
	FlaskConical, Globe, Monitor, Palette, Dna,
	Languages, History, X, Tag, Atom, Code, Music, RefreshCw, AlertTriangle,
	ArrowLeft, Check
} from 'lucide-react';

import { SubjectService } from '../../services/subjectService';
import type { Subject } from '../../services/subjectService';

// 🔥 1. ЯВНЫЕ ЦВЕТА ДЛЯ КРУЖОЧКОВ (чтобы не было белых)
const PICKER_COLORS: Record<string, string> = {
	blue: 'bg-blue-500', indigo: 'bg-indigo-500', violet: 'bg-violet-500',
	purple: 'bg-purple-500', fuchsia: 'bg-fuchsia-500', pink: 'bg-pink-500',
	rose: 'bg-rose-500', red: 'bg-red-500', orange: 'bg-orange-500',
	amber: 'bg-amber-500', yellow: 'bg-yellow-400', lime: 'bg-lime-500',
	green: 'bg-green-500', emerald: 'bg-emerald-500', teal: 'bg-teal-500',
	cyan: 'bg-cyan-500', sky: 'bg-sky-500', slate: 'bg-slate-500',
};

// СТИЛИ КАРТОЧЕК
const CARD_STYLES: Record<string, string> = {
	blue: 'from-blue-500 to-blue-600 shadow-blue-500/30 text-blue-600 bg-blue-50 border-blue-200',
	indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/30 text-indigo-600 bg-indigo-50 border-indigo-200',
	violet: 'from-violet-500 to-violet-600 shadow-violet-500/30 text-violet-600 bg-violet-50 border-violet-200',
	purple: 'from-purple-500 to-purple-600 shadow-purple-500/30 text-purple-600 bg-purple-50 border-purple-200',
	fuchsia: 'from-fuchsia-500 to-fuchsia-600 shadow-fuchsia-500/30 text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200',
	pink: 'from-pink-500 to-pink-600 shadow-pink-500/30 text-pink-600 bg-pink-50 border-pink-200',
	rose: 'from-rose-500 to-rose-600 shadow-rose-500/30 text-rose-600 bg-rose-50 border-rose-200',
	red: 'from-red-500 to-red-600 shadow-red-500/30 text-red-600 bg-red-50 border-red-200',
	orange: 'from-orange-500 to-orange-600 shadow-orange-500/30 text-orange-600 bg-orange-50 border-orange-200',
	amber: 'from-amber-400 to-amber-500 shadow-amber-500/30 text-amber-600 bg-amber-50 border-amber-200',
	yellow: 'from-yellow-400 to-yellow-500 shadow-yellow-500/30 text-yellow-600 bg-yellow-50 border-yellow-200',
	lime: 'from-lime-400 to-lime-500 shadow-lime-500/30 text-lime-600 bg-lime-50 border-lime-200',
	green: 'from-green-500 to-green-600 shadow-green-500/30 text-green-600 bg-green-50 border-green-200',
	emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/30 text-emerald-600 bg-emerald-50 border-emerald-200',
	teal: 'from-teal-500 to-teal-600 shadow-teal-500/30 text-teal-600 bg-teal-50 border-teal-200',
	cyan: 'from-cyan-500 to-cyan-600 shadow-cyan-500/30 text-cyan-600 bg-cyan-50 border-cyan-200',
	sky: 'from-sky-500 to-sky-600 shadow-sky-500/30 text-sky-600 bg-sky-50 border-sky-200',
	slate: 'from-slate-500 to-slate-600 shadow-slate-500/30 text-slate-600 bg-slate-50 border-slate-200',
};

const Subjects = () => {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();

	const availableIcons = useMemo(() => [
		{ id: 'math', icon: Calculator, label: t('subjects.short_labels.math') },
		{ id: 'physics', icon: Atom, label: t('subjects.short_labels.physics') },
		{ id: 'chemistry', icon: FlaskConical, label: t('subjects.short_labels.chemistry') },
		{ id: 'biology', icon: Dna, label: t('subjects.short_labels.biology') },
		{ id: 'history', icon: History, label: t('subjects.short_labels.history') },
		{ id: 'geography', icon: Globe, label: t('subjects.short_labels.geography') },
		{ id: 'it', icon: Monitor, label: t('subjects.short_labels.it') },
		{ id: 'code', icon: Code, label: t('subjects.short_labels.code') },
		{ id: 'art', icon: Palette, label: t('subjects.short_labels.art') },
		{ id: 'music', icon: Music, label: t('subjects.short_labels.music') },
		{ id: 'lang', icon: Languages, label: t('subjects.short_labels.lang') },
		{ id: 'default', icon: BookOpen, label: t('subjects.short_labels.default') },
	], [t]);

	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [loading, setLoading] = useState(true);

	const [searchTerm, setSearchTerm] = useState('');
	const [activeCategory, setActiveCategory] = useState('All');

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [subjectToDelete, setSubjectToDelete] = useState<number | null>(null);

	const [activeLangTab, setActiveLangTab] = useState<'ru' | 'tj' | 'en'>('ru');

	const [formData, setFormData] = useState({
		name: '', name_tj: '', name_en: '',
		abbreviation: '', category: 'Точные науки', color: 'blue', isActive: true, iconType: 'math'
	});

	// --- ESC KEY ---
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setIsModalOpen(false);
				setIsDeleteModalOpen(false);
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

	// --- ЗАГРУЗКА ---
	const fetchSubjects = useCallback(async () => {
		setLoading(true);
		try {
			const data = await SubjectService.getAll();
			setSubjects(data);
		} catch (err) { console.error("Error:", err); } finally { setLoading(false); }
	}, []);

	useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

	// --- HELPERS ---
	const getIcon = (type: string, size: number = 24) => {
		const found = availableIcons.find(i => i.id === type);
		const IconComponent = found ? found.icon : BookOpen;
		return <IconComponent size={size} />;
	};

	const getLocalizedName = (sub: Subject) => {
		if (i18n.language === 'tj' && sub.name_tj) return sub.name_tj;
		if (i18n.language === 'en' && sub.name_en) return sub.name_en;
		return sub.name;
	};

	const translateCategory = (cat: string) => {
		if (cat === 'All') return t('subjects.filter_all');
		const map: Record<string, string> = {
			'Точные науки': t('subjects.categories.exact'),
			'Естественные науки': t('subjects.categories.natural'),
			'Гуманитарные': t('subjects.categories.humanities'),
			'Языки': t('subjects.categories.languages'),
			'Искусство': t('subjects.categories.art'),
			'Спорт': t('subjects.categories.sport')
		};
		return map[cat] || cat;
	};

	const getColorClasses = (color: string) => CARD_STYLES[color] || CARD_STYLES['blue'];

	// --- HANDLERS ---
	const openCreateModal = () => {
		setEditingId(null);
		setFormData({ name: '', name_tj: '', name_en: '', abbreviation: '', category: 'Точные науки', color: 'blue', isActive: true, iconType: 'math' });
		setActiveLangTab('ru');
		setIsModalOpen(true);
	};

	const openEditModal = (sub: Subject) => {
		setEditingId(sub.id);
		setFormData({
			name: sub.name, name_tj: sub.name_tj || '', name_en: sub.name_en || '',
			abbreviation: sub.abbreviation, category: sub.category,
			color: sub.color, isActive: sub.isActive, iconType: sub.iconType
		});
		setIsModalOpen(true);
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (editingId) {
				await SubjectService.update(editingId, formData);
			} else {
				await SubjectService.create(formData);
			}
			setIsModalOpen(false);
			fetchSubjects(); // 🔥 ОБНОВЛЕНИЕ СПИСКА (Исправление проблемы 1)
		} catch (err: any) {
			if (err.response?.data?.name) alert(t('subjects.errors.name_exists', { name: formData.name }));
			else if (err.response?.data?.abbreviation) alert(t('subjects.errors.abbr_exists', { abbr: formData.abbreviation }));
			else alert(t('subjects.errors.validation'));
		}
	};

	const confirmDelete = async () => {
		if (subjectToDelete) {
			try {
				await SubjectService.delete(subjectToDelete);
				fetchSubjects(); // ОБНОВЛЕНИЕ СПИСКА
				setIsDeleteModalOpen(false);
				setSubjectToDelete(null);
			} catch (err) { alert(t('subjects.errors.delete')); }
		}
	};

	const filteredSubjects = subjects.filter(sub => {
		const name = getLocalizedName(sub).toLowerCase();
		const matchesSearch = name.includes(searchTerm.toLowerCase()) || sub.abbreviation.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesCategory = activeCategory === 'All' || sub.category === activeCategory;
		return matchesSearch && matchesCategory;
	});

	const uniqueCategories = ['All', ...Array.from(new Set(subjects.map(s => s.category)))];

	return (
		<div className="w-full mt-2 pb-8">
			{/* HEADER */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-fade-in-up">
				<div className="flex items-center gap-4">
					<button onClick={() => navigate(-1)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 hover:shadow-md transition-all active:scale-95">
						<ArrowLeft size={20} />
					</button>
					<div>
						<h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
							<div className="p-2 bg-red-100 rounded-lg text-red-600"><BookOpen size={24} /></div>
							{t('subjects.title')}
						</h1>
						<p className="text-slate-400 text-sm mt-1 ml-14 hidden sm:block">{t('subjects.subtitle')}</p>
					</div>
				</div>
				<button onClick={openCreateModal} className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:-translate-y-0.5 transition-all active:scale-95">
					<Plus size={18} /> {t('subjects.add_btn')}
				</button>
			</div>

			{/* FILTERS */}
			<div className="bg-white rounded-2xl shadow-lg shadow-slate-200 p-4 mb-6 animate-fade-in-up flex flex-col md:flex-row items-center justify-between gap-4">
				<div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto custom-scrollbar">
					{uniqueCategories.map(cat => (
						<button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
							{translateCategory(cat)}
						</button>
					))}
				</div>
				<div className="relative w-full md:w-64">
					<Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
					<input type="text" placeholder={t('subjects.search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-red-500 focus:outline-none text-sm transition-all" />
				</div>
			</div>

			{/* GRID */}
			{loading ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-white rounded-2xl p-5 shadow-lg shadow-slate-100 animate-pulse"><div className="flex justify-between items-start mb-4"><div className="w-14 h-14 bg-slate-200 rounded-2xl"></div><div className="flex gap-2"><div className="w-6 h-6 bg-slate-200 rounded-lg"></div></div></div></div>)}
				</div>
			) : filteredSubjects.length === 0 ? (
				<div className="text-center py-20 animate-fade-in-up">
					<div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 text-slate-300 mb-4"><Search size={40} /></div>
					<h3 className="text-lg font-bold text-slate-600">{t('subjects.no_data')}</h3>
					<button onClick={fetchSubjects} className="mt-4 text-indigo-600 font-bold text-sm flex items-center gap-1 justify-center hover:underline"><RefreshCw size={14} /> {t('common.loading')}</button>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{filteredSubjects.map((sub, index) => {
						const styles = getColorClasses(sub.color);
						return (
							<div key={sub.id} className="group relative bg-white rounded-2xl p-5 shadow-lg shadow-slate-200 border border-transparent hover:border-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
								<div className="flex justify-between items-start mb-4">
									<div className={`w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-md transition-transform group-hover:rotate-6 ${styles.split(' ').slice(0, 2).join(' ')}`}>
										{getIcon(sub.iconType, 28)}
									</div>
									<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<button onClick={() => openEditModal(sub)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
										<button onClick={() => openDeleteModal(sub.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
									</div>
								</div>
								<div>
									<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">{translateCategory(sub.category)}</span>
									<div className="flex items-center gap-2">
										<h3 className="text-lg font-bold text-slate-800 line-clamp-1" title={getLocalizedName(sub)}>{getLocalizedName(sub)}</h3>
										{sub.abbreviation && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">{sub.abbreviation}</span>}
									</div>
								</div>
								<div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
									<div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md"><BookOpen size={12} />{sub.questionsCount} {t('subjects.questions_count')}</div>
									<div className="flex items-center gap-1.5" title={sub.isActive ? t('subjects.active') : t('subjects.archived')}><span className={`w-2 h-2 rounded-full ${sub.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span></div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* --- MODAL (ИСПРАВЛЕНО 2) --- */}
			{isModalOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
					{/* Flex container для корректного скролла */}
					<div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh] animate-fade-in-up">

						{/* HEADER */}
						<div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0">
							<h3 className="text-xl font-bold text-slate-800">{editingId ? t('subjects.modal.edit_title') : t('subjects.modal.new_title')}</h3>
							<button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 transition-colors"><X size={24} className="text-slate-400" /></button>
						</div>

						{/* SCROLLABLE BODY */}
						<div className="p-5 overflow-y-auto custom-scrollbar flex-1">
							<form id="subjectForm" onSubmit={handleSave} className="space-y-4">
								<div className="flex p-1 bg-slate-100 rounded-xl mb-2">
									{['ru', 'tj', 'en'].map(lang => (
										<button key={lang} type="button" onClick={() => setActiveLangTab(lang as any)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${activeLangTab === lang ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{lang}</button>
									))}
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div className="col-span-2 sm:col-span-1">
										<label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('subjects.modal.name_label')} ({activeLangTab.toUpperCase()})</label>
										<input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-red-500 focus:outline-none font-bold text-slate-700 text-sm"
											value={activeLangTab === 'ru' ? formData.name : activeLangTab === 'tj' ? formData.name_tj : formData.name_en}
											onChange={e => { const val = e.target.value; if (activeLangTab === 'ru') setFormData({ ...formData, name: val }); else if (activeLangTab === 'tj') setFormData({ ...formData, name_tj: val }); else setFormData({ ...formData, name_en: val }); }}
											required={activeLangTab === 'ru'} />
									</div>
									<div className="col-span-2 sm:col-span-1">
										<label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Tag size={10} /> {t('subjects.modal.abbr_label')}</label>
										<input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-red-500 focus:outline-none font-bold text-slate-700 text-sm" value={formData.abbreviation} onChange={e => setFormData({ ...formData, abbreviation: e.target.value })} maxLength={10} />
									</div>
								</div>

								<div>
									<label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('subjects.modal.cat_label')}</label>
									<select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-red-500 focus:outline-none text-slate-700 text-sm font-bold" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
										<option value="Точные науки">{t('subjects.categories.exact')}</option>
										<option value="Естественные науки">{t('subjects.categories.natural')}</option>
										<option value="Гуманитарные">{t('subjects.categories.humanities')}</option>
										<option value="Языки">{t('subjects.categories.languages')}</option>
										<option value="Искусство">{t('subjects.categories.art')}</option>
										<option value="Спорт">{t('subjects.categories.sport')}</option>
									</select>
								</div>

								<div>
									<label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">{t('subjects.modal.icon_label')}</label>
									<div className="grid grid-cols-6 gap-2">
										{availableIcons.map((item) => (
											<button key={item.id} type="button" onClick={() => setFormData({ ...formData, iconType: item.id })} className={`flex flex-col items-center justify-center p-1.5 rounded-xl border-2 transition-all aspect-square ${formData.iconType === item.id ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-white'}`}>
												<item.icon size={18} /><span className="text-[8px] font-bold mt-0.5">{item.label}</span>
											</button>
										))}
									</div>
								</div>

								<div>
									<label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">{t('subjects.modal.color_label')}</label>
									<div className="grid grid-cols-9 gap-2">
										{Object.keys(PICKER_COLORS).map(c => (
											<button key={c} type="button" onClick={() => setFormData({ ...formData, color: c })}
												className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${formData.color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'} ${PICKER_COLORS[c]}`}>
												{formData.color === c && <Check size={12} className="text-white" strokeWidth={3} />}
											</button>
										))}
									</div>
								</div>

								<div className="flex items-center gap-2 pt-2">
									<input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500" />
									<label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer">{t('subjects.modal.is_active')}</label>
								</div>
							</form>
						</div>

						{/* FOOTER */}
						<div className="p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl shrink-0 flex gap-3">
							<button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">{t('subjects.modal.cancel')}</button>
							<button type="submit" form="subjectForm" className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:-translate-y-0.5 transition-all">
								{editingId ? t('subjects.modal.update') : t('subjects.modal.save')}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* DELETE MODAL */}
			{isDeleteModalOpen && (
				<div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)}></div>
					<div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-zoom-in text-center">
						<div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 mx-auto"><AlertTriangle size={32} className="text-red-500" /></div>
						<h3 className="text-xl font-black text-slate-800 mb-2">{t('subjects.delete_modal.title')}</h3>
						<p className="text-slate-500 text-sm mb-6">{t('subjects.delete_modal.desc')}</p>
						<div className="flex gap-3">
							<button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">{t('subjects.delete_modal.cancel')}</button>
							<button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30">{t('subjects.delete_modal.confirm')}</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Subjects;