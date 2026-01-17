import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
	Plus, Edit2, Trash2, CheckCircle2, X,
	Calendar as CalendarIcon, Clock, User, Layers, AlertTriangle, ArrowLeft,
	Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 🔥 ИМПОРТИРУЕМ НАШ СЕРВИС И ТИП
import { YearService } from '../../services/yearService';
import type { SchoolYear } from '../../services/yearService';

// --- ХЕЛПЕРЫ ---
const formatDate = (dateStr: string, locale: string) => {
	if (!dateStr) return '';
	const d = new Date(dateStr);
	return d.toLocaleDateString(locale === 'tj' ? 'tg-TJ' : locale === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

const getYearStatus = (year: SchoolYear) => {
	if (year.isActive) return 'active';
	const now = new Date();
	const start = new Date(year.start);
	if (start > now) return 'upcoming';
	return 'archive';
};

// --- КОМПОНЕНТ: КАРТОЧКА ГОДА ---
const YearCard = ({ year, onDelete, onEdit, index }: { year: SchoolYear, onDelete: (id: number) => void, onEdit: (year: SchoolYear) => void, index: number }) => {
	const { t, i18n } = useTranslation();
	const status = getYearStatus(year);

	const getLocalizedName = () => {
		if (i18n.language === 'tj' && year.name_tj) return year.name_tj;
		if (i18n.language === 'en' && year.name_en) return year.name_en;
		return year.name;
	};

	const getProgress = () => {
		const start = new Date(year.start).getTime();
		const end = new Date(year.end).getTime();
		const now = new Date().getTime();
		const total = end - start;
		const passed = now - start;
		if (total <= 0) return 100;
		if (start > now) return 0;
		return Math.min(100, Math.max(0, Math.round((passed / total) * 100)));
	};
	const progress = getProgress();

	const statusStyles = {
		active: {
			badge: 'bg-indigo-50 text-indigo-600 border-indigo-100',
			dot: 'bg-indigo-500 animate-ping',
			text: t('years.status_active'),
			card: 'bg-white border-indigo-500 ring-1 ring-indigo-500 shadow-xl shadow-indigo-500/10 scale-[1.02] z-10'
		},
		upcoming: {
			badge: 'bg-amber-50 text-amber-600 border-amber-100',
			dot: 'bg-amber-500',
			text: t('years.status_upcoming'),
			card: 'bg-white border-slate-100 shadow-md hover:shadow-lg hover:border-amber-200'
		},
		archive: {
			badge: 'bg-slate-50 text-slate-400 border-slate-100',
			dot: 'bg-slate-300',
			text: t('years.archive'),
			card: 'bg-slate-50/50 grayscale-[0.8] border-slate-100 shadow-sm opacity-80 hover:opacity-100'
		}
	};

	const currentStyle = statusStyles[status];

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 30 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.1 }}
			className={`relative h-full overflow-hidden rounded-[2rem] flex flex-col border transition-all duration-300 group ${currentStyle.card}`}
		>
			<div className="relative z-10 px-6 pt-6 pb-2">
				<div className="flex justify-between items-start mb-4">
					<div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${currentStyle.badge}`}>
						<div className="relative w-2 h-2">
							<div className={`w-2 h-2 rounded-full absolute ${currentStyle.dot}`}></div>
							<div className={`w-2 h-2 rounded-full absolute bg-current opacity-70`}></div>
						</div>
						<span>{currentStyle.text}</span>
					</div>

					<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
						<button onClick={() => onEdit(year)} className="p-2 rounded-xl bg-white border border-slate-100 hover:border-indigo-200 text-slate-400 hover:text-indigo-600 transition-colors shadow-sm">
							<Edit2 size={14} />
						</button>
						<button onClick={() => onDelete(year.id)} className="p-2 rounded-xl bg-white border border-slate-100 hover:border-red-200 text-slate-400 hover:text-red-500 transition-colors shadow-sm">
							<Trash2 size={14} />
						</button>
					</div>
				</div>

				<div>
					<h3 className="text-2xl font-black tracking-tight leading-none mb-2 text-slate-800">
						{getLocalizedName()}
					</h3>
					<div className="flex items-center gap-2 text-xs font-bold text-slate-400">
						<div className="bg-slate-100 p-1.5 rounded-lg"><CalendarIcon size={14} className="text-slate-500" /></div>
						{formatDate(year.start, i18n.language)} — {formatDate(year.end, i18n.language)}
					</div>
				</div>
			</div>

			<div className="relative z-10 px-6 py-4">
				<div className="flex justify-between text-[10px] font-bold mb-2 text-slate-400 uppercase tracking-wider">
					<span>{t('years.process')}</span>
					<span className={status === 'active' ? 'text-indigo-600' : ''}>{progress}%</span>
				</div>

				<div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
					<motion.div
						initial={{ width: 0 }}
						animate={{ width: `${progress}%` }}
						transition={{ duration: 1.5, ease: "circOut" }}
						className={`h-full rounded-full relative overflow-hidden
                            ${status === 'active'
								? 'bg-gradient-to-r from-indigo-500 to-violet-500'
								: status === 'upcoming' ? 'bg-amber-400' : 'bg-slate-300'
							}
                        `}
					>
						{status === 'active' && <div className="absolute inset-0 w-full h-full bg-white/20 animate-[progress-stripes_1s_linear_infinite]"></div>}
					</motion.div>
				</div>
			</div>

			<div className="relative z-10 p-4 mt-auto">
				<div className="grid grid-cols-2 gap-2">
					<div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col justify-between h-16">
						<span className="text-[9px] font-bold text-slate-400 uppercase">{t('years.students')}</span>
						<div className="flex justify-between items-end">
							<span className="text-sm font-black text-slate-700">{year.studentsCount.toLocaleString()}</span>
							<User size={16} className="text-purple-400 mb-0.5" />
						</div>
					</div>
					<div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col justify-between h-16">
						<span className="text-[9px] font-bold text-slate-400 uppercase">{t('years.remaining')}</span>
						<div className="flex justify-between items-end">
							<span className="text-sm font-black text-slate-700">{year.daysLeft > 0 ? year.daysLeft : '-'}</span>
							<Clock size={16} className="text-indigo-400 mb-0.5" />
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	);
};

// --- ОСНОВНОЙ КОМПОНЕНТ ---
const SchoolYears = () => {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const [years, setYears] = useState<SchoolYear[]>([]);
	const [loading, setLoading] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);

	// --- ЯЗЫКОВЫЕ ТАБЫ ---
	const [activeTab, setActiveTab] = useState<'ru' | 'tj' | 'en'>('ru');

	// --- ФОРМА ---
	const [formData, setFormData] = useState<Partial<SchoolYear>>({
		name: '', name_tj: '', name_en: '',
		start: '', end: '', isActive: false
	});

	const [editingId, setEditingId] = useState<number | null>(null);
	const [deleteId, setDeleteId] = useState<number | null>(null);

	const fetchYears = async () => {
		try {
			setLoading(true);
			const data = await YearService.getAll();
			setYears(data);
		} catch (error) {
			console.error("Error loading years:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchYears(); }, []);

	// ESC handling
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				if (isModalOpen) setIsModalOpen(false);
				if (deleteId) setDeleteId(null);
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isModalOpen, deleteId]);

	const handleEditClick = (year: SchoolYear) => {
		setEditingId(year.id);
		setFormData({
			name: year.name,
			name_tj: year.name_tj || '',
			name_en: year.name_en || '',
			start: year.start,
			end: year.end,
			isActive: year.isActive
		});
		setIsModalOpen(true);
	};

	const handleCreateClick = () => {
		setEditingId(null);
		setFormData({ name: '', name_tj: '', name_en: '', start: '', end: '', isActive: false });
		setActiveTab('ru');
		setIsModalOpen(true);
	};

	const confirmDelete = (id: number) => setDeleteId(id);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (editingId) {
				await YearService.update(editingId, formData);
			} else {
				await YearService.create(formData);
			}
			fetchYears();
			setIsModalOpen(false);
		} catch (error: any) {
			alert("Ошибка сохранения");
			console.error(error);
		}
	};

	const performDelete = async () => {
		if (!deleteId) return;

		const idToDelete = deleteId;
		const previousYears = [...years]; // 1. Бэкап

		// 2. Мгновенно убираем из UI
		setYears(prev => prev.filter(y => y.id !== idToDelete));
		setDeleteId(null);

		try {
			// 3. Шлем запрос
			await YearService.delete(idToDelete);
			// fetchYears() НЕ НУЖЕН, список уже актуален
		} catch (error) {
			// 4. Ошибка? Возвращаем обратно
			setYears(previousYears);
			alert("Ошибка при удалении. Сервер недоступен.");
		}
	};

	return (
		<div className="w-full mt-2 pb-20 relative">
			<style>{`@keyframes progress-stripes { 0% { background-position: 20px 0; } 100% { background-position: 0 0; } }`}</style>

			{/* HEADER */}
			<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10 animate-fade-in-up">
				<div>
					<button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-4">
						<div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform"><ArrowLeft size={16} /></div>
						<span className="text-xs font-bold uppercase tracking-wider">{t('common.back')}</span>
					</button>
					<h1 className="text-4xl font-black text-slate-800 tracking-tight">{t('years.title')}</h1>
					<p className="text-slate-500 font-medium mt-2 max-w-lg">{t('years.subtitle')}</p>
				</div>

				<button onClick={handleCreateClick} className="group relative px-6 py-3.5 rounded-2xl bg-slate-900 text-white font-bold shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-indigo-500/30 hover:scale-105 transition-all active:scale-95 flex items-center gap-3 overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] animate-[aurora_3s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
					<span className="relative z-10 flex items-center gap-2"><Plus size={20} strokeWidth={3} /> <span className="tracking-wide">{t('years.new_period')}</span></span>
				</button>
			</div>

			{/* GRID */}
			{loading ? (
				<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600"></div></div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 px-1">
					<AnimatePresence mode='popLayout'>
						{years.map((year, index) => (
							<div key={year.id} className="h-full">
								<YearCard year={year} onDelete={confirmDelete} onEdit={handleEditClick} index={index} />
							</div>
						))}
					</AnimatePresence>

					{/* GHOST CARD */}
					<motion.button
						layout
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: years.length * 0.1 }}
						onClick={handleCreateClick}
						whileHover={{ scale: 1.02, backgroundColor: "rgba(248, 250, 252, 0.8)" }}
						whileTap={{ scale: 0.98 }}
						className="group min-h-[320px] h-full relative rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 transition-all duration-300 flex flex-col items-center justify-center gap-4"
					>
						<div className="w-16 h-16 rounded-full bg-white shadow-lg group-hover:shadow-indigo-200/50 flex items-center justify-center text-slate-300 group-hover:text-indigo-600 group-hover:scale-110 transition-all duration-300 ring-4 ring-slate-50 group-hover:ring-indigo-50">
							<Plus size={32} />
						</div>
						<div className="text-center">
							<h3 className="font-bold text-lg text-slate-400 group-hover:text-indigo-700 transition-colors">{t('years.create_card_title')}</h3>
							<p className="text-xs font-semibold text-slate-300 mt-1">{t('years.create_card_desc')}</p>
						</div>
					</motion.button>
				</div>
			)}

			{/* MODAL */}
			<AnimatePresence>
				{isModalOpen && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />

						{/* 🔥 ОБНОВЛЕННЫЙ КОНТЕЙНЕР МОДАЛКИ:
                            1. w-[95%] sm:w-full -> Чуть уже на мобилке, чтобы были края
                            2. max-h-[90vh] -> Ограничивает высоту, чтобы влезало в экран
                            3. flex flex-col -> Чтобы скролл работал корректно внутри
                        */}
						<motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
							className="relative bg-white rounded-[2rem] shadow-2xl w-[95%] sm:w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

							{/* HEADER */}
							<div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] animate-[aurora_4s_linear_infinite] px-6 py-5 sm:px-8 sm:py-6 shrink-0">
								<div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light"></div>

								<div className="relative z-10 flex justify-between items-start mb-4">
									<div className="text-white">
										<h3 className="text-2xl sm:text-3xl font-black tracking-tight">{editingId ? t('years.edit_title') : t('years.new_title')}</h3>
										<p className="text-white/80 text-xs sm:text-sm font-medium opacity-80">{editingId ? t('years.form_desc_edit') : t('years.form_desc_new')}</p>
									</div>
									<button onClick={() => setIsModalOpen(false)} className="w-8 h-8 sm:w-9 sm:h-9 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all"><X size={18} /></button>
								</div>

								<div className="relative z-10 flex bg-black/20 p-1 rounded-xl w-fit backdrop-blur-md">
									{(['ru', 'tj', 'en'] as const).map(lang => (
										<button
											key={lang}
											onClick={() => setActiveTab(lang)}
											className={`px-3 sm:px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-all ${activeTab === lang ? 'bg-white text-indigo-700 shadow-md' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
										>
											{lang}
										</button>
									))}
								</div>
							</div>

							{/* BODY (Scrollable) */}
							<div className="p-5 sm:p-8 overflow-y-auto">
								<form onSubmit={handleSave} className="space-y-4 sm:space-y-5">
									<div className="space-y-1.5 sm:space-y-2">
										<label className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">
											{t('years.name_label')} ({activeTab.toUpperCase()})
										</label>
										<div className="relative group">
											<Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
											<input
												type="text"
												// Уменьшил padding (py-3) для компактности
												className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-slate-50 border-0 ring-1 ring-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-slate-700 text-base sm:text-lg outline-none placeholder:text-slate-300"
												placeholder="2025-2026"
												value={activeTab === 'ru' ? formData.name : activeTab === 'tj' ? formData.name_tj : formData.name_en}
												onChange={e => {
													const val = e.target.value;
													if (activeTab === 'ru') setFormData({ ...formData, name: val });
													else if (activeTab === 'tj') setFormData({ ...formData, name_tj: val });
													else setFormData({ ...formData, name_en: val });
												}}
												required={activeTab === 'ru'}
											/>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-3 sm:gap-4">
										<div className="space-y-1.5 sm:space-y-2">
											<label className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('years.start_label')}</label>
											<div className="relative group">
												<CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
												<input type="date" className="w-full pl-11 pr-3 py-3 sm:py-3.5 bg-slate-50 border-0 ring-1 ring-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-slate-600 text-sm sm:text-base outline-none cursor-pointer" value={formData.start} onChange={e => setFormData({ ...formData, start: e.target.value })} required />
											</div>
										</div>
										<div className="space-y-1.5 sm:space-y-2">
											<label className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('years.end_label')}</label>
											<div className="relative group">
												<CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
												<input type="date" className="w-full pl-11 pr-3 py-3 sm:py-3.5 bg-slate-50 border-0 ring-1 ring-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-slate-600 text-sm sm:text-base outline-none cursor-pointer" value={formData.end} onChange={e => setFormData({ ...formData, end: e.target.value })} required />
											</div>
										</div>
									</div>

									<div onClick={() => setFormData({ ...formData, isActive: !formData.isActive })} className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${formData.isActive ? 'bg-indigo-50 border-indigo-500/30' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
										<div className="flex items-center gap-3 sm:gap-4">
											<div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${formData.isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
												{formData.isActive ? <Sparkles size={16} /> : <CheckCircle2 size={16} />}
											</div>
											<span className={`font-bold text-xs sm:text-sm ${formData.isActive ? 'text-indigo-900' : 'text-slate-600'}`}>{t('years.make_current')}</span>
										</div>
										<div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center ${formData.isActive ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
											{formData.isActive && <CheckCircle2 size={12} className="text-white" />}
										</div>
									</div>

									<button type="submit" className="w-full py-3.5 sm:py-4 rounded-2xl font-black text-white text-base sm:text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-200 hover:shadow-indigo-500/30 transition-all duration-300 transform hover:-translate-y-1 active:scale-95">
										{editingId ? t('common.save_changes') : t('common.create')}
									</button>
								</form>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{/* DELETE MODAL */}
			<AnimatePresence>
				{deleteId && (
					<div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setDeleteId(null)} />
						<motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden text-center p-8 border border-white/50">
							<div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6 shadow-inner"><AlertTriangle size={40} className="text-red-500" strokeWidth={2} /></div>
							<h3 className="text-2xl font-black text-slate-800 mb-2">{t('years.delete_title')}</h3>
							<p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">{t('years.delete_warning')}</p>
							<div className="flex gap-3">
								<button onClick={() => setDeleteId(null)} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">{t('common.cancel')}</button>
								<button onClick={performDelete} className="flex-1 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/30 transition-transform active:scale-95">{t('common.delete')}</button>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default SchoolYears;