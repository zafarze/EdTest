import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
	Plus, Edit2, Trash2, MapPin, Phone,
	ArrowLeft, X, Upload, Image as ImageIcon, Hash,
	Camera, ShieldCheck, Building2, Users, Loader2,
	CheckCircle, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { SchoolService } from '../../services/schoolService';
import type { School } from '../../services/schoolService';

// --- КОМПОНЕНТ: КРАСИВОЕ УВЕДОМЛЕНИЕ (TOAST) ---
const ToastNotification = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
	return (
		<div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
			<motion.div
				initial={{ y: -50, opacity: 0, scale: 0.9 }}
				animate={{ y: 0, opacity: 1, scale: 1 }}
				exit={{ y: -50, opacity: 0, scale: 0.9 }}
				className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border pointer-events-auto backdrop-blur-md ${type === 'success'
						? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
						: 'bg-red-50/90 border-red-200 text-red-800'
					}`}
			>
				{type === 'success' ? <CheckCircle className="text-emerald-500" /> : <AlertCircle className="text-red-500" />}
				<div>
					<h4 className="font-bold text-sm">{type === 'success' ? 'Успешно' : 'Ошибка'}</h4>
					<p className="text-xs font-medium opacity-80">{message}</p>
				</div>
				<button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
					<X size={16} />
				</button>
			</motion.div>
		</div>
	);
};

// --- КОМПОНЕНТ УДАЛЕНИЯ ---
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, schoolName }: any) => {
	if (!isOpen) return null;
	return (
		<div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
			<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
			<motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm text-center overflow-hidden">
				<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500"><Trash2 size={32} /></div>
				<h3 className="text-xl font-black text-slate-800 mb-2">Удалить школу?</h3>
				<p className="text-sm text-slate-500 font-medium mb-6">Вы уверены, что хотите удалить <b>"{schoolName}"</b>?</p>
				<div className="flex gap-3">
					<button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">Отмена</button>
					<button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200">Удалить</button>
				</div>
			</motion.div>
		</div>
	);
};

const Schools = () => {
	const navigate = useNavigate();
	const { t, i18n } = useTranslation();
	const [schools, setSchools] = useState<School[]>([]);
	const [loading, setLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [deleteModal, setDeleteModal] = useState<{ open: boolean, school: School | null }>({ open: false, school: null });

	const [activeTab, setActiveTab] = useState<'ru' | 'tj' | 'en'>('ru');
	const [editingId, setEditingId] = useState<number | null>(null);

	const [logoPreview, setLogoPreview] = useState<string | null>(null);
	const [bannerPreview, setBannerPreview] = useState<string | null>(null);

	const { register, handleSubmit, reset, setValue } = useForm<School>();
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [bannerFile, setBannerFile] = useState<File | null>(null);

	const showToast = (message: string, type: 'success' | 'error') => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 3000);
	};

	const loadSchools = async () => {
		try {
			setLoading(true);
			const data = await SchoolService.getAll();
			setSchools(data);
		} catch (error) {
			console.error("Failed to load schools", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { loadSchools(); }, []);

	useEffect(() => {
		return () => {
			if (logoPreview && !logoPreview.startsWith('http')) URL.revokeObjectURL(logoPreview);
			if (bannerPreview && !bannerPreview.startsWith('http')) URL.revokeObjectURL(bannerPreview);
		};
	}, [logoPreview, bannerPreview]);

	const handleOpenCreate = () => {
		setEditingId(null);
		reset({});
		setLogoPreview(null); setBannerPreview(null);
		setLogoFile(null); setBannerFile(null);
		setActiveTab('ru');
		setIsModalOpen(true);
	};

	const handleOpenEdit = (school: School) => {
		setEditingId(school.id);
		Object.keys(school).forEach(key => setValue(key as keyof School, (school as any)[key]));
		setLogoPreview(school.logo);
		setBannerPreview(school.banner);
		setLogoFile(null); setBannerFile(null);
		setIsModalOpen(true);
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			const previewUrl = URL.createObjectURL(file);
			if (type === 'logo') {
				setLogoFile(file);
				setLogoPreview(previewUrl);
			} else {
				setBannerFile(file);
				setBannerPreview(previewUrl);
			}
		}
	};

	const onSubmit = async (data: School) => {
		if (isSubmitting) return;
		setIsSubmitting(true);

		const formData = new FormData();
		(Object.keys(data) as Array<keyof School>).forEach(key => {
			if (data[key] !== null && data[key] !== undefined && key !== 'logo' && key !== 'banner' && key !== 'slug') {
				formData.append(key, String(data[key]));
			}
		});

		if (logoFile) formData.append('logo', logoFile);
		if (bannerFile) formData.append('banner', bannerFile);

		try {
			if (editingId) {
				await SchoolService.update(editingId, formData);
				showToast("Школа успешно обновлена!", "success");
			} else {
				await SchoolService.create(formData);
				showToast("Новая школа создана!", "success");
			}
			setIsModalOpen(false);
			loadSchools();
		} catch (error: any) {
			console.error("Submit Error:", error);

			// Если ошибка прав доступа (403)
			if (error.response?.status === 403) {
				showToast("У вас нет прав на создание школ!", "error");
			}
			// Если дубликат ID
			else if (error.response?.data?.custom_id) {
				showToast(`Ошибка: ${error.response.data.custom_id[0]}`, "error");
			} else if (error.message) {
				showToast(error.message, "error");
			} else {
				showToast("Произошла ошибка при сохранении.", "error");
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const confirmDelete = async () => {
		if (!deleteModal.school) return;
		const schoolId = deleteModal.school.id;
		const previousSchools = [...schools];

		setSchools(prev => prev.filter(s => s.id !== schoolId));
		setDeleteModal({ open: false, school: null });

		try {
			await SchoolService.delete(schoolId);
			showToast("Школа удалена", "success");
		} catch (e: any) {
			setSchools(previousSchools);
			if (e.response?.status === 403) {
				showToast("У вас нет прав на удаление школ!", "error");
			} else {
				showToast("Не удалось удалить школу. Ошибка сети.", "error");
			}
		}
	};

	const getLocalized = (obj: School, field: 'name' | 'address') => {
		const lang = i18n.language;
		if (lang === 'tj' && obj[`${field}_tj`]) return obj[`${field}_tj`];
		if (lang === 'en' && obj[`${field}_en`]) return obj[`${field}_en`];
		return obj[field];
	};

	return (
		<div className="w-full mt-2 pb-20 relative">
			<AnimatePresence>
				{toast && (
					<ToastNotification
						message={toast.message}
						type={toast.type}
						onClose={() => setToast(null)}
					/>
				)}
			</AnimatePresence>

			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 animate-fade-in-up">
				<div>
					<button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-4">
						<ArrowLeft size={16} /> <span className="text-xs font-bold uppercase">{t('common.back')}</span>
					</button>
					<h1 className="text-3xl font-black text-slate-800"><span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">{t('schools.title')}</span></h1>
				</div>
				<button onClick={handleOpenCreate} className="px-6 py-3.5 rounded-2xl bg-slate-900 text-white font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-3">
					<Plus size={20} /> <span>{t('schools.add_btn')}</span>
				</button>
			</div>

			{loading ? (
				<div className="flex justify-center h-40 items-center"><div className="animate-spin rounded-full h-10 w-10 border-t-4 border-violet-600"></div></div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
					{schools.map((school, idx) => (
						<motion.div key={school.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
							className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden hover:shadow-2xl hover:shadow-violet-500/10 transition-all group flex flex-col h-full relative">

							<div className="h-32 relative bg-slate-100">
								{school.banner ? <img src={school.banner} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-gradient-to-r from-violet-200 to-fuchsia-100" />}
								<div className="absolute -bottom-8 left-6 w-16 h-16 rounded-2xl bg-white p-1 shadow-lg">
									{school.logo ? <img src={school.logo} className="w-full h-full object-cover rounded-xl" alt="" /> : <Building2 className="w-full h-full p-2 text-violet-300" />}
								</div>
							</div>

							<div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
								<button onClick={() => handleOpenEdit(school)} className="p-2 bg-white/90 rounded-xl hover:text-violet-600 shadow-sm"><Edit2 size={16} /></button>
								<button onClick={() => setDeleteModal({ open: true, school })} className="p-2 bg-white/90 rounded-xl hover:text-red-500 shadow-sm"><Trash2 size={16} /></button>
							</div>

							<div className="p-6 pt-10 flex-grow flex flex-col">
								<div className="mb-4">
									<div className="flex justify-between items-start">
										<span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500"><Hash size={10} className="inline mr-1" />{school.custom_id}</span>
										{school.students_count !== undefined && (
											<span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded flex items-center gap-1">
												<Users size={10} /> {school.students_count}
											</span>
										)}
									</div>
									<h3 className="text-xl font-black text-slate-800 mt-2 line-clamp-2">{getLocalized(school, 'name')}</h3>
									<div className="flex items-center gap-1 text-xs font-bold text-emerald-600 mt-1"><ShieldCheck size={12} /> Active School</div>
								</div>
								<div className="mt-auto space-y-2 border-t pt-4 border-slate-50">
									<div className="flex gap-3 text-sm text-slate-500"><MapPin size={16} className="shrink-0 text-slate-300" /> <span className="truncate">{getLocalized(school, 'address') || '-'}</span></div>
									<div className="flex gap-3 text-sm text-slate-500"><Phone size={16} className="shrink-0 text-slate-300" /> <span>{school.phone || '-'}</span></div>
								</div>
							</div>
						</motion.div>
					))}
				</div>
			)}

			<AnimatePresence>
				{isModalOpen && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
						<motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">

							<div className="h-32 bg-slate-100 relative group cursor-pointer" onClick={() => document.getElementById('bannerInput')?.click()}>
								{bannerPreview ? <img src={bannerPreview} className="w-full h-full object-cover opacity-90" alt="" /> : <div className="w-full h-full bg-gradient-to-r from-violet-600 to-fuchsia-600 animate-[aurora_4s_linear_infinite]" />}
								<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity"><Camera className="text-white" /></div>
								<input type="file" id="bannerInput" hidden accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} />
								<button onClick={(e) => { e.stopPropagation(); setIsModalOpen(false); }} className="absolute top-4 right-4 w-8 h-8 bg-black/20 text-white rounded-full flex items-center justify-center hover:bg-black/40"><X size={16} /></button>
							</div>

							<form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-0 relative">
								<div className="absolute -top-10 left-6">
									<div className="w-20 h-20 bg-white rounded-2xl shadow-lg border-4 border-white cursor-pointer overflow-hidden group relative" onClick={() => document.getElementById('logoInput')?.click()}>
										{logoPreview ? <img src={logoPreview} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="text-slate-300 m-auto mt-6" />}
										<div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Upload className="text-white" size={20} /></div>
									</div>
									<input type="file" id="logoInput" hidden accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
								</div>

								<div className="flex justify-end mt-4 mb-6">
									<div className="bg-slate-100 p-1 rounded-xl flex">
										{(['ru', 'tj', 'en'] as const).map(l => (
											<button type="button" key={l} onClick={() => setActiveTab(l)} className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${activeTab === l ? 'bg-white shadow text-violet-600' : 'text-slate-400'}`}>{l}</button>
										))}
									</div>
								</div>

								<div className="space-y-4">
									<div className="space-y-4">
										<div>
											<label className="text-[10px] font-bold text-slate-400 uppercase">Название ({activeTab})</label>
											<input {...register(activeTab === 'ru' ? 'name' : activeTab === 'tj' ? 'name_tj' : 'name_en', { required: activeTab === 'ru' })}
												className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-violet-500 font-bold text-slate-700" placeholder="Введите название..." />
										</div>
										<div>
											<label className="text-[10px] font-bold text-slate-400 uppercase">Адрес ({activeTab})</label>
											<input {...register(activeTab === 'ru' ? 'address' : activeTab === 'tj' ? 'address_tj' : 'address_en')}
												className="w-full px-4 py-2 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-violet-500 font-bold text-slate-700" placeholder="Введите адрес..." />
										</div>
									</div>

									<div className="grid grid-cols-1 gap-4">
										<div>
											<label className="text-[10px] font-bold text-slate-400 uppercase">Код школы</label>
											<input {...register('custom_id', { required: true })} className="w-full px-4 py-2 bg-slate-50 rounded-xl font-mono text-slate-600" placeholder="SCH-001" />
										</div>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<input {...register('phone')} placeholder="Телефон" className="w-full px-4 py-2 bg-slate-50 rounded-xl" />
										<input {...register('email')} placeholder="Email" className="w-full px-4 py-2 bg-slate-50 rounded-xl" />
									</div>
								</div>

								<button
									type="submit"
									disabled={isSubmitting}
									className="w-full mt-6 py-3 rounded-xl bg-violet-600 text-white font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isSubmitting && <Loader2 className="animate-spin" size={20} />}
									{editingId ? t('common.save') : t('schools.create_btn')}
								</button>
							</form>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			<DeleteConfirmationModal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, school: null })} onConfirm={confirmDelete} schoolName={deleteModal.school?.name} />
		</div>
	);
};

export default Schools;