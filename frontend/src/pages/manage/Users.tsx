import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
	Users as UsersIcon, Plus, Search, Edit2, Trash2,
	Shield, Building2, BookOpen, Briefcase, LayoutGrid, Loader2,
	AlertTriangle, X, UserCog, Check, ArrowLeft, GraduationCap, Star,
	Crown // <--- ВОТ ЭТО БЫЛО ЗАБЫТО
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import $api from '../../services/api';

// --- ТИПЫ ДАННЫХ ---
type UserRole = 'admin' | 'general_director' | 'director' | 'deputy' | 'teacher' | 'expert';

interface OptionItem {
	id: number;
	name: string;
}

interface User {
	id: number;
	username: string;
	fullName: string;
	email: string;
	role: UserRole;
	assigned_schools: OptionItem[];
	assigned_subjects: OptionItem[];
	assigned_classes: OptionItem[]; // Классное руководство
	status: 'active' | 'blocked';
	lastLogin: string;
}

const Users = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	// --- STATE ---
	const [users, setUsers] = useState<User[]>([]);

	// Справочники
	const [schools, setSchools] = useState<OptionItem[]>([]);
	const [subjects, setSubjects] = useState<OptionItem[]>([]);
	const [classes, setClasses] = useState<OptionItem[]>([]);

	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [roleFilter, setRoleFilter] = useState<string>('all');

	// Модальное окно
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
	const [formData, setFormData] = useState({
		id: 0,
		first_name: '',
		last_name: '',
		username: '',
		email: '',
		password: '',
		role: 'teacher' as UserRole,
		school_ids: [] as number[],
		subject_ids: [] as number[],
		class_ids: [] as number[]
	});

	const [userToDelete, setUserToDelete] = useState<User | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// --- ЗАГРУЗКА ДАННЫХ ---
	useEffect(() => {
		fetchData();
		fetchAuxData();
	}, []);

	const fetchAuxData = async () => {
		try {
			const [schoolsRes, subjectsRes, classesRes] = await Promise.all([
				$api.get('schools/'),
				$api.get('subjects/'),
				$api.get('classes/')
			]);
			setSchools(schoolsRes.data);
			setSubjects(subjectsRes.data);

			// Форматируем классы
			const formattedClasses = classesRes.data.map((c: any) => ({
				id: c.id,
				name: `${c.grade_level}${c.section} (${c.school_name})`
			}));
			setClasses(formattedClasses);

		} catch (error) {
			console.error("Ошибка загрузки справочников", error);
		}
	}

	const fetchData = async () => {
		setLoading(true);
		try {
			const usersRes = await $api.get('users/', { params: { page_size: 100 } });
			const rawUsers = usersRes.data.results || usersRes.data;

			if (Array.isArray(rawUsers)) {
				const mappedUsers = rawUsers.map((u: any) => ({
					id: u.id,
					username: u.username,
					fullName: u.full_name || `${u.last_name} ${u.first_name}`,
					email: u.email,
					role: u.role || 'teacher',
					assigned_schools: u.assigned_schools || [],
					assigned_subjects: u.assigned_subjects || [],
					assigned_classes: u.assigned_classes || [],
					status: u.is_active ? 'active' : 'blocked',
					lastLogin: u.last_login ? new Date(u.last_login).toLocaleDateString() : '-'
				}));
				setUsers(mappedUsers);
			}
		} catch (error) {
			console.error("Error loading users:", error);
		} finally {
			setLoading(false);
		}
	};

	// --- ФИЛЬТРАЦИЯ ---
	const filteredUsers = useMemo(() => {
		return users.filter(user => {
			const matchesSearch = user.fullName.toLowerCase().includes(search.toLowerCase()) ||
				user.username.toLowerCase().includes(search.toLowerCase());
			const matchesRole = roleFilter === 'all' || user.role === roleFilter;
			return matchesSearch && matchesRole;
		});
	}, [users, search, roleFilter]);

	// --- HANDLERS ---
	const handleCreateClick = () => {
		setModalMode('create');
		setFormData({
			id: 0, first_name: '', last_name: '', username: '', email: '', password: '',
			role: 'teacher', school_ids: [], subject_ids: [], class_ids: []
		});
		setIsModalOpen(true);
	};

	const handleEditClick = (user: User) => {
		const [last, ...first] = user.fullName.split(' ');
		setModalMode('edit');
		setFormData({
			id: user.id,
			first_name: first.join(' '),
			last_name: last,
			username: user.username,
			email: user.email,
			password: '',
			role: user.role,
			school_ids: user.assigned_schools.map(s => s.id),
			subject_ids: user.assigned_subjects.map(s => s.id),
			class_ids: user.assigned_classes.map(c => c.id)
		});
		setIsModalOpen(true);
	};

	const confirmDelete = async () => {
		if (!userToDelete) return;
		setIsDeleting(true);
		try {
			await $api.delete(`users/${userToDelete.id}/`);
			setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
			setUserToDelete(null);
		} catch (error: any) {
			const msg = error.response?.data?.detail || "Ошибка при удалении";
			alert(msg);
		} finally {
			setIsDeleting(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		const payload: any = {
			username: formData.username,
			first_name: formData.first_name,
			last_name: formData.last_name,
			email: formData.email,
			role: formData.role,
			school_ids: formData.school_ids,
			subject_ids: formData.subject_ids,
			class_ids: formData.class_ids
		};

		if (formData.password) payload.password = formData.password;

		try {
			if (modalMode === 'create') {
				await $api.post('users/', payload);
			} else {
				await $api.patch(`users/${formData.id}/`, payload);
			}
			fetchData();
			setIsModalOpen(false);
		} catch (error: any) {
			console.error(error);
			const msg = error.response?.data?.email?.[0] || error.response?.data?.detail || error.message;
			alert("Ошибка: " + msg);
		} finally {
			setIsSubmitting(false);
		}
	};

	const toggleSelection = (id: number, field: 'school_ids' | 'subject_ids' | 'class_ids') => {
		setFormData(prev => {
			const current = prev[field];
			const isSelected = current.includes(id);
			return {
				...prev,
				[field]: isSelected
					? current.filter(itemId => itemId !== id)
					: [...current, id]
			};
		});
	};

	// --- RENDER ---
	return (
		<div className="p-6 max-w-[1600px] mx-auto min-h-screen">
			{/* HEADER */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
				<div className="flex items-center gap-4">
					<button onClick={() => navigate(-1)} className="w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:shadow-lg transition-all active:scale-95">
						<ArrowLeft size={24} />
					</button>
					<div>
						<h1 className="text-4xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
							<UsersIcon className="w-10 h-10 text-indigo-600" />
							{t('users.title') || 'Пользователи'}
						</h1>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<button onClick={() => navigate('/admin/access-control')} className="h-12 px-6 bg-white border-2 border-indigo-100 text-indigo-600 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all active:scale-95">
						<Shield size={20} />
						<span className="hidden sm:inline">Доступы</span>
					</button>

					<button onClick={handleCreateClick} className="h-12 bg-slate-900 text-white px-6 rounded-2xl font-bold flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/20 active:scale-95">
						<Plus size={20} strokeWidth={3} />
						<span>{t('users.add_btn') || 'Добавить'}</span>
					</button>
				</div>
			</div>

			{/* ФИЛЬТРЫ */}
			<div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
				<div className="md:col-span-3 relative group">
					<Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
					<input
						type="text"
						placeholder={t('users.search') || 'Поиск...'}
						value={search}
						onChange={e => setSearch(e.target.value)}
						className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-600 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm text-sm"
					/>
				</div>

				<div className="md:col-span-9 flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
					{[
						{ id: 'all', label: 'Все', icon: LayoutGrid },
						{ id: 'admin', label: 'Админ', icon: Shield },
						{ id: 'general_director', label: 'Ген. Дир.', icon: Crown },
						{ id: 'director', label: 'Директор', icon: Building2 },
						{ id: 'deputy', label: 'Зам. дир.', icon: UserCog },
						{ id: 'expert', label: 'Эксперт', icon: Briefcase },
						{ id: 'teacher', label: 'Учитель', icon: BookOpen },
					].map(tab => (
						<button
							key={tab.id}
							onClick={() => setRoleFilter(tab.id)}
							className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold whitespace-nowrap transition-all border-2 text-sm ${roleFilter === tab.id
								? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30'
								: 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:text-slate-700'
								}`}
						>
							<tab.icon size={16} />
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{/* СПИСОК (GRID) */}
			{loading ? (
				<div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
					<AnimatePresence>
						{filteredUsers.map((user) => (
							<motion.div
								layout
								initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
								key={user.id}
								className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-white hover:border-indigo-100 transition-all group relative overflow-hidden"
							>
								<div className="flex justify-between items-start mb-6 relative z-10">
									<div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg text-xl font-black
                                        ${user.role === 'admin' ? 'bg-rose-500 shadow-rose-200' :
											user.role === 'general_director' ? 'bg-amber-500 shadow-amber-200' :
												user.role === 'director' ? 'bg-purple-600 shadow-purple-200' :
													user.role === 'deputy' ? 'bg-orange-500 shadow-orange-200' :
														user.role === 'expert' ? 'bg-pink-500 shadow-pink-200' :
															'bg-indigo-500 shadow-indigo-200'}
                                    `}>
										{user.fullName.charAt(0)}
									</div>
									<div className="flex gap-1">
										<button onClick={() => handleEditClick(user)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"><Edit2 size={18} /></button>
										<button onClick={() => setUserToDelete(user)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
									</div>
								</div>

								<div className="mb-6 relative z-10">
									<h3 className="text-xl font-black text-slate-800 mb-1 line-clamp-1">{user.fullName}</h3>
									<p className="text-sm font-bold text-slate-400 mb-4">{user.email || user.username}</p>

									{/* БЕЙДЖИ */}
									<div className="flex flex-wrap gap-2">
										<span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${user.role === 'admin' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
											}`}>
											{t(`users.roles.${user.role}`) || user.role}
										</span>

										{/* Школы */}
										{user.assigned_schools.length > 0 && (
											<span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold flex items-center gap-1.5">
												<Building2 size={12} />
												{user.assigned_schools[0].name}
												{user.assigned_schools.length > 1 && ` +${user.assigned_schools.length - 1}`}
											</span>
										)}

										{/* Предметы */}
										{user.assigned_subjects.length > 0 && (
											<span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold flex items-center gap-1.5">
												<BookOpen size={12} />
												{user.assigned_subjects[0].name}
												{user.assigned_subjects.length > 1 && ` +${user.assigned_subjects.length - 1}`}
											</span>
										)}

										{/* Классное руководство */}
										{user.assigned_classes.length > 0 && (
											<span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-600 text-xs font-bold flex items-center gap-1.5">
												<Star size={12} fill="currentColor" />
												{user.assigned_classes[0].name}
											</span>
										)}
									</div>
								</div>
							</motion.div>
						))}
					</AnimatePresence>
				</div>
			)}

			{/* МОДАЛЬНОЕ ОКНО */}
			<AnimatePresence>
				{isModalOpen && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
						<div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
						<motion.div initial={{ scale: 0.9, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 50 }} className="relative bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-8">
							<button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><X size={20} /></button>

							<h2 className="text-3xl font-black text-slate-800 mb-6 flex items-center gap-3">
								<div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
									{modalMode === 'create' ? <Plus size={32} /> : <Edit2 size={32} />}
								</div>
								{modalMode === 'create' ? 'Новый сотрудник' : 'Редактировать'}
							</h2>

							<form onSubmit={handleSubmit} className="space-y-6">
								<div className="grid grid-cols-2 gap-6">
									<div>
										<label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Имя</label>
										<input required type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Фамилия</label>
										<input required type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
									</div>
								</div>

								<div>
									<label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Email (необязательно)</label>
									<input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="user@example.com" />
								</div>

								<div className="grid grid-cols-2 gap-6">
									<div>
										<label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Логин</label>
										<input required type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
									</div>
									<div>
										<label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Пароль</label>
										<input type="password" required={modalMode === 'create'} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" placeholder={modalMode === 'edit' ? 'Оставьте пустым...' : "******"} />
									</div>
								</div>

								{/* ВЫБОР РОЛИ */}
								<div>
									<label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Роль</label>
									<div className="grid grid-cols-3 gap-3">
										{[
											{ id: 'teacher', label: 'Учитель' },
											{ id: 'director', label: 'Директор' },
											{ id: 'deputy', label: 'Зам. Дир.' },
											{ id: 'admin', label: 'Админ' },
											{ id: 'expert', label: 'Эксперт' },
											{ id: 'general_director', label: 'Ген. Дир.' },
										].map(r => (
											<button type="button" key={r.id} onClick={() => setFormData({ ...formData, role: r.id as any })} className={`py-3 rounded-xl font-bold capitalize border-2 transition-all text-sm ${formData.role === r.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}>
												{r.label}
											</button>
										))}
									</div>
								</div>

								{/* ДИНАМИЧЕСКИЕ ПОЛЯ ПО РОЛЯМ */}
								{formData.role !== 'admin' && formData.role !== 'general_director' && (
									<div className="space-y-4">

										{/* ШКОЛЫ */}
										<div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
											<label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Привязка к школе</label>
											<div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2">
												{schools.map(s => (
													<button key={s.id} type="button" onClick={() => toggleSelection(s.id, 'school_ids')} className={`px-3 py-3 rounded-lg text-sm font-bold flex items-center justify-between transition-all ${formData.school_ids.includes(s.id) ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}>
														{s.name}
														{formData.school_ids.includes(s.id) && <Check size={16} />}
													</button>
												))}
											</div>
										</div>

										{/* ПРЕДМЕТЫ */}
										{(formData.role === 'teacher' || formData.role === 'expert') && (
											<div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
												<label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Предметы</label>
												<div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
													{subjects.map(s => (
														<button key={s.id} type="button" onClick={() => toggleSelection(s.id, 'subject_ids')} className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between transition-all ${formData.subject_ids.includes(s.id) ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}>
															{s.name}
															{formData.subject_ids.includes(s.id) && <Check size={14} />}
														</button>
													))}
												</div>
											</div>
										)}

										{/* КЛАССНОЕ РУКОВОДСТВО */}
										{formData.role === 'teacher' && (
											<div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
												<label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex items-center gap-2">
													<Star size={16} className="text-amber-500" fill="currentColor" />
													Классное руководство
												</label>
												<div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
													{classes.map(c => (
														<button key={c.id} type="button" onClick={() => {
															const isSelected = formData.class_ids.includes(c.id);
															setFormData({ ...formData, class_ids: isSelected ? [] : [c.id] })
														}} className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between transition-all ${formData.class_ids.includes(c.id) ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}>
															{c.name}
															{formData.class_ids.includes(c.id) && <Check size={14} />}
														</button>
													))}
												</div>
											</div>
										)}
									</div>
								)}

								<button type="submit" disabled={isSubmitting} className="w-full py-4 mt-4 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 active:scale-95 transition-all">
									{isSubmitting ? 'Сохранение...' : 'Сохранить'}
								</button>
							</form>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default Users;