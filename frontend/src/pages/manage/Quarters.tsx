import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
	Plus, Edit2, Trash2, CheckCircle2, X,
	CalendarDays, Hourglass, ArrowLeft, AlertTriangle,
	CalendarRange, FolderOpen, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 🔥 ИМПОРТ СЕРВИСА
import { QuarterService } from '../../services/quarterService';
import type { Quarter } from '../../services/quarterService';

// --- КОМПОНЕНТ УВЕДОМЛЕНИЯ (TOAST) ---
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => {
	useEffect(() => {
		const timer = setTimeout(onClose, 3000);
		return () => clearTimeout(timer);
	}, [onClose]);

	return (
		<motion.div
			initial={{ opacity: 0, y: -50, scale: 0.9 }}
			animate={{ opacity: 1, y: 20, scale: 1 }}
			exit={{ opacity: 0, y: -20, scale: 0.9 }}
			className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[150] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] backdrop-blur-md border border-white/20 min-w-[300px] max-w-md
            ${type === 'success' ? 'bg-emerald-900/90 text-emerald-50' : 'bg-red-900/90 text-red-50'}`}
		>
			<div className={`p-2 rounded-full ${type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
				{type === 'success' ? <CheckCircle2 size={24} className="text-emerald-400" /> : <AlertCircle size={24} className="text-red-400" />}
			</div>
			<div className="flex-1">
				<h4 className="font-bold text-sm">{type === 'success' ? 'Успешно' : 'Ошибка'}</h4>
				<p className="text-xs opacity-90 font-medium">{message}</p>
			</div>
			<button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
				<X size={16} />
			</button>
		</motion.div>
	);
};

// --- КОМПОНЕНТ КАРТОЧКИ ---
const QuarterCard = ({ quarter, onDelete, onEdit, index }: { quarter: Quarter, onDelete: (id: number) => void, onEdit: (q: Quarter) => void, index: number }) => {
	const { t, i18n } = useTranslation();

	// 🔥 ГЛАВНОЕ ИСПРАВЛЕНИЕ:
	// Карточка считается визуально активной, если стоит галочка ИЛИ если статус 'active' (по датам)
	const isVisuallyActive = quarter.is_active || quarter.status === 'active';

	const getLocalizedName = () => {
		if (i18n.language === 'tj' && quarter.name_tj) return quarter.name_tj;
		if (i18n.language === 'en' && quarter.name_en) return quarter.name_en;
		return quarter.name;
	};

	const formatDate = (dateStr: string) => {
		if (!dateStr) return '-';
		const d = new Date(dateStr);
		const locale = i18n.language === 'tj' ? 'tg-TJ' : i18n.language === 'en' ? 'en-US' : 'ru-RU';
		return d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
	};

	return (
		<motion.div
			layout
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			whileHover={{ y: -4 }}
			className={`
                relative p-5 rounded-[1.5rem] border-2 transition-all duration-300 group flex flex-col justify-between h-full min-h-[180px]
                ${isVisuallyActive
					? 'bg-white border-emerald-500 shadow-[0_15px_40px_-10px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500 z-10 scale-[1.02]'
					: 'bg-white border-slate-100 shadow-md hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/10'
				}
            `}
		>
			<div>
				<div className="flex justify-between items-start mb-4">
					<div className="flex gap-3 items-start w-full">
						{/* Иконка с номером */}
						<div className={`
                            shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3
                            ${isVisuallyActive
								? 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-emerald-500/40'
								: 'bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600'
							}
                        `}>
							{index + 1}
						</div>

						<div className="w-full overflow-hidden">
							<h3 className={`text-base font-black mb-1 truncate transition-colors ${isVisuallyActive ? 'text-slate-800' : 'text-slate-700 group-hover:text-emerald-700'}`}>
								{getLocalizedName()}
							</h3>

							<div className="flex flex-wrap gap-1 mb-1.5">
								{quarter.status === 'active' && <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase tracking-wider border border-emerald-100 animate-pulse">{t('quarters.status_active')}</span>}
								{quarter.status === 'completed' && <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wider border border-slate-200">{t('quarters.status_completed')}</span>}
								{quarter.status === 'upcoming' && <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-500 text-[9px] font-bold uppercase tracking-wider border border-blue-100">{t('quarters.status_upcoming')}</span>}
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 -mr-2">
						<button onClick={() => onEdit(quarter)} className="p-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"><Edit2 size={14} /></button>
						<button onClick={() => onDelete(quarter.id)} className="p-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
					</div>
				</div>

				<div className={`flex items-center gap-2 text-xs font-bold mb-4 p-1.5 rounded-lg border transition-colors
                    ${isVisuallyActive
						? 'bg-emerald-50/50 text-emerald-700 border-emerald-100'
						: 'bg-slate-50/50 text-slate-400 border-transparent group-hover:border-emerald-100 group-hover:bg-emerald-50/30'
					}`}>
					<CalendarDays size={14} className={isVisuallyActive ? "text-emerald-600" : "text-slate-300 group-hover:text-emerald-400"} />
					<span>{formatDate(quarter.start_date)} — {formatDate(quarter.end_date)}</span>
				</div>
			</div>

			<div className="mt-auto">
				<div className="flex justify-between text-[9px] font-bold uppercase tracking-wider mb-1.5">
					<span className={isVisuallyActive ? 'text-emerald-600 flex items-center gap-1' : 'text-slate-400 flex items-center gap-1'}>
						<Hourglass size={10} /> {t('quarters.process')}
					</span>
					<span className={isVisuallyActive ? 'text-emerald-600' : 'text-slate-400'}>{quarter.progress}%</span>
				</div>
				{/* ПРОГРЕСС БАР */}
				<div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner ring-1 ring-slate-100/50">
					<motion.div
						initial={{ width: 0 }}
						animate={{ width: `${quarter.progress}%` }}
						transition={{ duration: 1, ease: "easeOut" }}
						className={`h-full rounded-full relative ${isVisuallyActive
							// 🔥 АНИМАЦИЯ AURORA ДЛЯ АКТИВНОЙ КАРТОЧКИ
							? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 bg-[length:200%_auto] animate-[aurora_3s_linear_infinite] shadow-[0_0_15px_rgba(16,185,129,0.5)]'
							: 'bg-slate-300'
							}`}
					>
						{isVisuallyActive && (
							<div className="absolute inset-0 bg-white/30 w-full animate-[shimmer_1.5s_infinite]"></div>
						)}
					</motion.div>
				</div>
			</div>
		</motion.div>
	);
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const Quarters = () => {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const [quarters, setQuarters] = useState<Quarter[]>([]);
	const [loading, setLoading] = useState(true);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<'ru' | 'tj' | 'en'>('ru');
	const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

	const [formData, setFormData] = useState({
		name: '', name_tj: '', name_en: '',
		start_date: '', end_date: '', is_active: false
	});

	const [editingId, setEditingId] = useState<number | null>(null);
	const [deleteId, setDeleteId] = useState<number | null>(null);

	const showToast = (message: string, type: 'success' | 'error' = 'success') => {
		setToast({ message, type });
	};

	const fetchQuarters = async () => {
		try {
			setLoading(true);
			const data = await QuarterService.getAll();
			setQuarters(data);
		} catch (error) { console.error("Ошибка загрузки:", error); } finally { setLoading(false); }
	};

	useEffect(() => { fetchQuarters(); }, []);

	const groupedQuarters = useMemo(() => {
		const groups: Record<string, Quarter[]> = {};
		quarters.forEach(q => {
			const year = q.school_year_name || t('quarters.no_year') || 'Архив';
			if (!groups[year]) groups[year] = [];
			groups[year].push(q);
		});

		Object.keys(groups).forEach(year => groups[year].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()));
		return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
	}, [quarters, t]);

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

	const handleCreateClick = () => {
		setEditingId(null);
		setFormData({ name: '', name_tj: '', name_en: '', start_date: '', end_date: '', is_active: false });
		setActiveTab('ru');
		setIsModalOpen(true);
	};

	const handleEditClick = (quarter: Quarter) => {
		setEditingId(quarter.id);
		setFormData({
			name: quarter.name,
			name_tj: quarter.name_tj || '',
			name_en: quarter.name_en || '',
			start_date: quarter.start_date,
			end_date: quarter.end_date,
			is_active: quarter.is_active
		});
		setIsModalOpen(true);
	};

	const confirmDelete = (id: number) => setDeleteId(id);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (editingId) {
				await QuarterService.update(editingId, formData);
				showToast(t('common.save_changes') + " успешно!", 'success');
			} else {
				await QuarterService.create(formData);
				showToast("Новая четверть создана!", 'success');
			}
			fetchQuarters();
			setIsModalOpen(false);
		} catch (error: any) {
			const errorData = error.response?.data;
			let msg = "Проверьте данные формы";

			if (errorData?.start_date) msg = errorData.start_date[0];
			else if (errorData?.detail) msg = errorData.detail;

			showToast(msg, 'error');
		}
	};

	const performDelete = async () => {
		if (!deleteId) return;

		const idToDelete = deleteId;
		const previousQuarters = [...quarters]; // 1. Бэкап состояния

		// 2. Мгновенно убираем из UI
		setQuarters(prev => prev.filter(q => q.id !== idToDelete));
		setDeleteId(null); // Закрываем модалку сразу

		try {
			// 3. Шлем запрос на сервер
			await QuarterService.delete(idToDelete);
			showToast("Четверть удалена", 'success');
			// fetchQuarters() НЕ НУЖЕН, список уже актуален
		} catch (error) {
			// 4. Если ошибка — возвращаем всё как было
			setQuarters(previousQuarters);
			showToast("Не удалось удалить четверть. Сервер недоступен.", 'error');
		}
	};

	return (
		<div className="w-full mt-2 pb-20 relative">
			<AnimatePresence>
				{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
			</AnimatePresence>

			<style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>

			{/* HEADER */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 animate-fade-in-up">
				<div>
					<button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-4">
						<div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform"><ArrowLeft size={16} /></div>
						<span className="text-xs font-bold uppercase tracking-wider">{t('common.back')}</span>
					</button>
					<h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">{t('quarters.title')}</span>
					</h1>
					<p className="text-slate-500 font-medium mt-1 max-w-lg">{t('quarters.subtitle')}</p>
				</div>
				<button onClick={handleCreateClick} className="group relative px-6 py-3.5 rounded-2xl bg-slate-900 text-white font-bold shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-emerald-500/30 hover:scale-105 transition-all active:scale-95 flex items-center gap-3 overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 bg-[length:200%_auto] animate-[aurora_3s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
					<span className="relative z-10 flex items-center gap-2"><Plus size={20} strokeWidth={3} /> <span className="tracking-wide">{t('quarters.add_btn')}</span></span>
				</button>
			</div>

			{/* CONTENT */}
			{loading ? (
				<div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-emerald-500"></div></div>
			) : (
				<div className="space-y-8 animate-fade-in-up">
					<div className="min-h-[300px]">
						{groupedQuarters.map(([yearName, yearQuarters]) => (
							<div key={yearName} className="mb-10">
								{/* ЗАГОЛОВОК ГОДА */}
								<div className="flex items-center gap-4 mb-6 sticky top-20 z-20 bg-slate-50/90 backdrop-blur-sm py-2 rounded-xl">
									<div className="h-px bg-slate-200 flex-1"></div>
									<span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-white px-4 py-1.5 rounded-full border border-slate-200 flex items-center gap-2 shadow-sm">
										<CalendarRange size={14} className="text-emerald-500" /> {yearName}
									</span>
									<div className="h-px bg-slate-200 flex-1"></div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 px-1">
									{yearQuarters.map((q, index) => (
										<QuarterCard key={q.id} quarter={q} index={index} onDelete={confirmDelete} onEdit={handleEditClick} />
									))}

									{/* GHOST CARD */}
									{yearQuarters.length < 4 && (
										<motion.button
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											onClick={handleCreateClick}
											whileHover={{ scale: 1.02, backgroundColor: "rgba(236, 253, 245, 0.6)" }}
											whileTap={{ scale: 0.98 }}
											className="group relative min-h-[180px] h-full rounded-[1.5rem] border-2 border-dashed border-slate-200 hover:border-emerald-400 bg-slate-50/30 transition-all duration-300 flex flex-col items-center justify-center gap-3"
										>
											<div className="w-12 h-12 rounded-full bg-white shadow-sm group-hover:shadow-emerald-200/50 flex items-center justify-center text-slate-300 group-hover:text-emerald-600 group-hover:scale-110 transition-all duration-300 ring-4 ring-slate-50 group-hover:ring-emerald-50">
												<Plus size={24} />
											</div>
											<span className="text-xs font-bold text-slate-400 group-hover:text-emerald-700">{t('quarters.create_card_title')}</span>
										</motion.button>
									)}
								</div>
							</div>
						))}
					</div>

					{groupedQuarters.length === 0 && (
						<div className="text-center py-20 bg-white rounded-[2rem] border border-slate-200 border-dashed">
							<FolderOpen size={48} className="text-slate-300 mx-auto mb-4" />
							<h3 className="text-lg font-bold text-slate-500">{t('common.no_data')}</h3>
							<button onClick={handleCreateClick} className="text-emerald-600 font-bold mt-2 hover:underline">{t('quarters.create_card_title')}</button>
						</div>
					)}
				</div>
			)}

			{/* МОДАЛКА */}
			<AnimatePresence>
				{isModalOpen && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />

						<motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
							className="relative bg-white rounded-[2.5rem] shadow-2xl w-[95%] sm:w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

							{/* HEADER */}
							<div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 bg-[length:200%_auto] animate-[aurora_4s_linear_infinite] px-6 py-5 shrink-0">
								<div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light"></div>
								<div className="relative z-10 flex justify-between items-start mb-4">
									<div className="text-white">
										<h3 className="text-2xl sm:text-3xl font-black tracking-tight">{editingId ? t('quarters.edit_title') : t('quarters.new_title')}</h3>
										<p className="text-white/80 text-xs sm:text-sm font-medium opacity-80">{editingId ? t('quarters.form_desc_edit') : t('quarters.form_desc_new')}</p>
									</div>
									<button onClick={() => setIsModalOpen(false)} className="w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all"><X size={18} /></button>
								</div>
								<div className="relative z-10 flex bg-black/20 p-1 rounded-xl w-fit backdrop-blur-md">
									{(['ru', 'tj', 'en'] as const).map(lang => (
										<button key={lang} onClick={() => setActiveTab(lang)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === lang ? 'bg-white text-emerald-700 shadow-md' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>{lang}</button>
									))}
								</div>
							</div>

							{/* BODY */}
							<div className="p-6 sm:p-8 overflow-y-auto">
								<form onSubmit={handleSave} className="space-y-5">
									<div className="space-y-2">
										<label className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">
											{t('quarters.name_label')} ({activeTab.toUpperCase()})
										</label>
										<input
											type="text"
											placeholder={t('quarters.name_placeholder')}
											className="w-full px-5 py-3.5 bg-slate-50 border-0 ring-1 ring-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-bold text-slate-700 text-base sm:text-lg outline-none"
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
									<div className="grid grid-cols-2 gap-3 sm:gap-4">
										<div className="space-y-2">
											<label className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('quarters.start_label')}</label>
											<input type="date" className="w-full px-4 py-3.5 bg-slate-50 border-0 ring-1 ring-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-bold text-slate-600 text-sm sm:text-base outline-none cursor-pointer" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} required />
										</div>
										<div className="space-y-2">
											<label className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('quarters.end_label')}</label>
											<input type="date" className="w-full px-4 py-3.5 bg-slate-50 border-0 ring-1 ring-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-bold text-slate-600 text-sm sm:text-base outline-none cursor-pointer" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} required />
										</div>
									</div>

									<div className={`group flex items-center justify-between p-3 sm:p-4 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${formData.is_active ? 'bg-emerald-50 border-emerald-500/30' : 'bg-white border-slate-100 hover:border-slate-200'}`} onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}>
										<div className="flex items-center gap-4">
											<div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${formData.is_active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 rotate-12' : 'bg-slate-100 text-slate-300'}`}><CheckCircle2 size={20} /></div>
											<div><span className={`block text-sm sm:text-base font-bold transition-colors ${formData.is_active ? 'text-emerald-900' : 'text-slate-700'}`}>{t('quarters.make_current')}</span></div>
										</div>
									</div>

									<button type="submit" className="w-full py-4 rounded-2xl font-black text-white text-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-200 hover:shadow-emerald-500/30 transition-all duration-300 transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3">
										<span>{editingId ? t('common.save_changes') : t('common.create')}</span>
									</button>
								</form>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{/* ОКНО УДАЛЕНИЯ */}
			<AnimatePresence>
				{deleteId && (
					<div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setDeleteId(null)} />
						<motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden text-center p-8 border border-white/50">
							<div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6 shadow-inner"><AlertTriangle size={40} className="text-red-500" strokeWidth={2} /></div>
							<h3 className="text-2xl font-black text-slate-800 mb-2">{t('common.delete_question')}</h3>
							<p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">{t('common.irreversible')}</p>
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

export default Quarters;