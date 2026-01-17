import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
	Shield, Search, School, BookOpen,
	ChevronRight, Plus, X,
	CheckCircle2, Users, Crown, GraduationCap, LayoutGrid,
	ArrowLeft, ChevronDown, UserPlus, Filter, Loader2
} from 'lucide-react';
import $api from '../../services/api'; // Убедись, что путь к api правильный

// --- ТИПЫ ---

interface Item {
	id: number;
	name: string;
	type: 'school' | 'subject' | 'class';
	parentId?: number;
}

type RoleType = 'DIRECTOR' | 'EXPERT' | 'TEACHER' | 'HOMEROOM';

interface UserProfile {
	id: number;
	firstName: string;
	lastName: string;
	role: RoleType;
	avatar?: string;
	assignedItems: Item[];
}

const AccessControl = () => {
	const navigate = useNavigate();

	// --- STATE ---
	const [activeTab, setActiveTab] = useState<RoleType>('DIRECTOR');
	const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
	const [searchQuery, setSearchQuery] = useState('');

	// Данные с бэкенда
	const [users, setUsers] = useState<UserProfile[]>([]);
	const [allSchools, setAllSchools] = useState<Item[]>([]);
	const [allSubjects, setAllSubjects] = useState<Item[]>([]);
	const [allClasses, setAllClasses] = useState<Item[]>([]);

	const [isLoadingUsers, setIsLoadingUsers] = useState(false);

	// Состояния для фильтра школ
	const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
	const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState(false);
	const [schoolSearchQuery, setSchoolSearchQuery] = useState('');

	const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);

	// --- ЗАГРУЗКА СПРАВОЧНИКОВ (Школы, Предметы, Классы) ---
	useEffect(() => {
		const fetchAuxData = async () => {
			try {
				const [schoolsRes, subjectsRes, classesRes] = await Promise.all([
					$api.get('schools/'),
					$api.get('subjects/'),
					$api.get('classes/') // Предполагаем, что есть такой эндпоинт
				]);

				// Маппинг школ
				setAllSchools(schoolsRes.data.map((s: any) => ({
					id: s.id, name: s.name, type: 'school'
				})));

				// Маппинг предметов
				setAllSubjects(subjectsRes.data.map((s: any) => ({
					id: s.id, name: s.name, type: 'subject'
				})));

				// Маппинг классов
				// Классы с бэкенда могут приходить как { id, grade_level, section, school_id }
				setAllClasses(classesRes.data.map((c: any) => ({
					id: c.id,
					name: `${c.grade_level}${c.section} (${c.school_name || 'Школа ' + c.school})`,
					type: 'class',
					parentId: c.school // Используем school_id как parentId
				})));

			} catch (error) {
				console.error("Ошибка загрузки справочников:", error);
			}
		};
		fetchAuxData();
	}, []);

	// --- ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ (Фильтр + Поиск) ---
	const fetchUsers = useCallback(async () => {
		setIsLoadingUsers(true);
		try {
			// Формируем параметры запроса
			const params: any = {
				// Преобразуем роль в нижний регистр для бэкенда (DIRECTOR -> director)
				profile__role: activeTab.toLowerCase(),
				page_size: 100 // Грузим побольше для удобства
			};

			// Если выбрана школа в фильтре - добавляем параметр
			if (selectedSchoolId) {
				params.profile__school = selectedSchoolId;
			}

			// Если есть поиск
			if (searchQuery) {
				params.search = searchQuery;
			}

			const response = await $api.get('users/', { params });

			// Если включена пагинация, данные могут быть в response.data.results
			const rawUsers = response.data.results || response.data;

			const mappedUsers: UserProfile[] = rawUsers.map((u: any) => ({
				id: u.id,
				firstName: u.first_name,
				lastName: u.last_name,
				role: (u.role || 'teacher').toUpperCase() as RoleType,
				// Бэкенд теперь возвращает assigned_items благодаря нашему новому сериализатору
				assignedItems: u.assigned_items || []
			}));

			setUsers(mappedUsers);
		} catch (error) {
			console.error("Ошибка загрузки пользователей:", error);
		} finally {
			setIsLoadingUsers(false);
		}
	}, [activeTab, selectedSchoolId, searchQuery]);

	// Debounce для поиска (чтобы не дергать API при каждой букве)
	useEffect(() => {
		const timer = setTimeout(() => {
			fetchUsers();
		}, 300);
		return () => clearTimeout(timer);
	}, [fetchUsers]);


	// --- ЛОГИКА ---

	// Вспомогательная функция уже не нужна для фильтрации списка, 
	// т.к. мы фильтруем на бэкенде, но оставим для проверки UI
	const activeSchool = allSchools.find(s => s.id === selectedSchoolId);
	const selectedUser = users.find(u => u.id === selectedUserId);

	// ФИЛЬТРАЦИЯ СПИСКА ШКОЛ В ДРОПДАУНЕ
	const filteredSchoolsList = allSchools.filter(s =>
		s.name.toLowerCase().includes(schoolSearchQuery.toLowerCase())
	);

	const getAvailableItems = () => {
		switch (activeTab) {
			case 'DIRECTOR': return allSchools;
			case 'EXPERT': return allSubjects;
			case 'TEACHER': return allSchools;
			case 'HOMEROOM':
				// Для классных руководителей показываем классы только выбранной школы (если выбрана)
				if (selectedSchoolId) {
					return allClasses.filter(c => c.parentId === selectedSchoolId);
				}
				return allClasses;
			default: return [];
		}
	};

	const availableItemsToAdd = getAvailableItems();

	// --- ASSIGN ITEM (POST ЗАПРОС) ---
	const handleAssignItem = async (item: Item) => {
		if (!selectedUser) return;

		try {
			// Отправляем запрос на бэкенд
			const response = await $api.post(`users/${selectedUser.id}/assign-permission/`, {
				type: item.type,
				id: item.id,
				action: 'add'
			});

			// Обновляем локальный стейт данными с сервера
			const updatedUserData = response.data;

			setUsers(prev => prev.map(u => {
				if (u.id === selectedUser.id) {
					return {
						...u,
						assignedItems: updatedUserData.assigned_items || []
					};
				}
				return u;
			}));

			setIsAddDropdownOpen(false);
		} catch (error: any) {
			alert(error.response?.data?.error || "Ошибка при добавлении прав");
		}
	};

	// --- REMOVE ITEM (POST ЗАПРОС) ---
	const handleRemoveItem = async (itemId: number) => {
		if (!selectedUser) return;

		// Находим объект, чтобы узнать его тип
		const itemToRemove = selectedUser.assignedItems.find(i => i.id === itemId);
		if (!itemToRemove) return;

		try {
			const response = await $api.post(`users/${selectedUser.id}/assign-permission/`, {
				type: itemToRemove.type,
				id: itemToRemove.id,
				action: 'remove'
			});

			const updatedUserData = response.data;

			setUsers(prev => prev.map(u => {
				if (u.id === selectedUser.id) {
					return {
						...u,
						assignedItems: updatedUserData.assigned_items || []
					};
				}
				return u;
			}));

		} catch (error: any) {
			alert(error.response?.data?.error || "Ошибка при удалении прав");
		}
	};

	const getRoleConfig = (role: RoleType) => {
		switch (role) {
			case 'DIRECTOR':
				return {
					label: 'Директор',
					icon: Crown,
					color: 'text-indigo-600',
					bg: 'bg-indigo-600',
					lightBg: 'bg-indigo-100',
					itemIcon: School,
					itemLabel: 'Прикрепленные школы',
					desc: 'Полный доступ к управлению школой.'
				};
			case 'EXPERT':
				return {
					label: 'Эксперт',
					icon: BookOpen,
					color: 'text-rose-600',
					bg: 'bg-rose-600',
					lightBg: 'bg-rose-100',
					itemIcon: BookOpen,
					itemLabel: 'Прикрепленные предметы',
					desc: 'Курирует контент по предметам.'
				};
			case 'TEACHER':
				return {
					label: 'Учитель',
					icon: GraduationCap,
					color: 'text-cyan-600',
					bg: 'bg-cyan-600',
					lightBg: 'bg-cyan-100',
					itemIcon: School,
					itemLabel: 'Место работы',
					desc: 'Преподает в указанных школах.'
				};
			case 'HOMEROOM':
				return {
					label: 'Кл. рук.',
					icon: Users,
					color: 'text-amber-600',
					bg: 'bg-amber-500',
					lightBg: 'bg-amber-100',
					itemIcon: LayoutGrid,
					itemLabel: 'Руководство классом',
					desc: 'Отвечает за успеваемость класса.'
				};
		}
	};

	const activeConfig = getRoleConfig(activeTab);

	return (
		<div className="w-full min-h-screen bg-slate-50 p-6 pb-20">

			{/* HEADER */}
			<div className="max-w-7xl mx-auto mb-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
				{/* LEFT: Back + Title */}
				<div className="flex items-center gap-4">
					<button
						onClick={() => navigate('/admin/management')}
						className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:border-slate-400 hover:shadow-lg transition-all active:scale-95"
					>
						<ArrowLeft size={24} />
					</button>
					<div>
						<h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
							<Shield className="text-orange-500" fill="currentColor" size={28} /> Командный центр
						</h1>
						<p className="text-slate-500 font-medium">Управление доступом и распределение зон ответственности.</p>
					</div>
				</div>

				{/* RIGHT: School Filter + Add Button */}
				<div className="flex items-center gap-3 w-full xl:w-auto">

					{/* DROPDOWN ФИЛЬТРА ШКОЛ */}
					<div className="relative flex-1 xl:min-w-[300px]">
						<button
							onClick={() => {
								setIsSchoolDropdownOpen(!isSchoolDropdownOpen);
								if (!isSchoolDropdownOpen) setSchoolSearchQuery(''); // Сброс поиска при открытии
							}}
							className={`w-full flex items-center gap-3 p-3 pr-4 rounded-xl border transition-all ${selectedSchoolId ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
						>
							<div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedSchoolId ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
								<Filter size={18} />
							</div>
							<span className="flex-1 text-left font-bold text-sm truncate">
								{activeSchool ? activeSchool.name : "Все школы"}
							</span>
							<ChevronDown size={16} className={`transition-transform ${isSchoolDropdownOpen ? 'rotate-180' : ''}`} />
							{selectedSchoolId && (
								<div onClick={(e) => { e.stopPropagation(); setSelectedSchoolId(null); }} className="p-1 hover:bg-indigo-200 rounded-full cursor-pointer">
									<X size={14} />
								</div>
							)}
						</button>

						<AnimatePresence>
							{isSchoolDropdownOpen && (
								<>
									<div className="fixed inset-0 z-40" onClick={() => setIsSchoolDropdownOpen(false)} />
									<motion.div
										initial={{ opacity: 0, y: 10, scale: 0.95 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										exit={{ opacity: 0, y: 10, scale: 0.95 }}
										className="absolute top-full right-0 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 flex flex-col max-h-[400px]"
									>
										{/* --- ПОИСК ВНУТРИ ДРОПДАУНА --- */}
										<div className="p-3 border-b border-slate-100 bg-white sticky top-0 z-10">
											<div className="relative">
												<Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
												<input
													autoFocus
													type="text"
													placeholder="Найти школу..."
													value={schoolSearchQuery}
													onChange={(e) => setSchoolSearchQuery(e.target.value)}
													className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
												/>
											</div>
										</div>

										{/* СПИСОК ШКОЛ */}
										<div className="overflow-y-auto p-1">
											<button onClick={() => { setSelectedSchoolId(null); setIsSchoolDropdownOpen(false); }} className={`w-full px-4 py-3 rounded-xl text-left font-bold text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${!selectedSchoolId ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600'}`}>
												Все школы
												{!selectedSchoolId && <CheckCircle2 size={16} />}
											</button>

											{filteredSchoolsList.length > 0 ? (
												filteredSchoolsList.map(s => (
													<button key={s.id} onClick={() => { setSelectedSchoolId(s.id); setIsSchoolDropdownOpen(false); }} className={`w-full px-4 py-3 rounded-xl text-left font-bold text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${selectedSchoolId === s.id ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600'}`}>
														{s.name}
														{selectedSchoolId === s.id && <CheckCircle2 size={16} />}
													</button>
												))
											) : (
												<div className="text-center py-4 text-slate-400 text-xs font-bold">
													Школа не найдена
												</div>
											)}
										</div>
									</motion.div>
								</>
							)}
						</AnimatePresence>
					</div>

					{/* ADD BUTTON */}
					<button onClick={() => navigate('/admin/users')} className="flex-shrink-0 h-[50px] px-6 bg-slate-900 text-white rounded-xl font-bold hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2">
						<UserPlus size={20} /> <span className="hidden sm:inline">Сотрудник</span>
					</button>
				</div>
			</div>

			<div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-140px)]">
				{/* ЛЕВАЯ КОЛОНКА */}
				<div className="lg:col-span-4 flex flex-col gap-4 h-full">
					{/* TABS GRID */}
					<div className="bg-white p-1.5 rounded-2xl border border-slate-200 grid grid-cols-2 gap-1 shadow-sm flex-shrink-0">
						{(['DIRECTOR', 'EXPERT', 'TEACHER', 'HOMEROOM'] as RoleType[]).map(role => {
							const config = getRoleConfig(role);
							const Icon = config.icon;
							const isActive = activeTab === role;
							return (
								<button
									key={role}
									onClick={() => { setActiveTab(role); setSelectedUserId(null); }}
									className={`py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${isActive ? `${config.bg} text-white shadow-md` : 'text-slate-500 hover:bg-slate-50'}`}
								>
									<Icon size={16} /> {config.label}
								</button>
							)
						})}
					</div>

					{/* SEARCH */}
					<div className="relative flex-shrink-0">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
						<input
							type="text"
							placeholder={`Поиск ${activeTab === 'DIRECTOR' ? 'директора' : 'сотрудника'}...`}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
						/>
					</div>

					{/* LIST */}
					<div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-hide">
						{isLoadingUsers ? (
							<div className="flex flex-col items-center justify-center py-10 text-slate-400">
								<Loader2 className="w-8 h-8 animate-spin mb-2" />
								<span className="text-xs font-bold">Загрузка...</span>
							</div>
						) : users.length > 0 ? (
							users.map(user => (
								<motion.div
									layoutId={`user-${user.id}`}
									key={user.id}
									onClick={() => setSelectedUserId(user.id)}
									className={`group cursor-pointer p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${selectedUserId === user.id ? 'bg-white border-indigo-500 shadow-xl shadow-indigo-100 ring-1 ring-indigo-500' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-lg'}`}
								>
									<div className="flex items-center gap-4 relative z-10">
										<div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-black ${selectedUserId === user.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'} transition-colors`}>
											{user.firstName[0]}{user.lastName[0]}
										</div>
										<div className="flex-1 min-w-0">
											<h3 className={`font-bold text-lg truncate ${selectedUserId === user.id ? 'text-slate-900' : 'text-slate-700'}`}>
												{user.firstName} {user.lastName}
											</h3>
											<p className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
												{activeConfig.itemLabel}:
												<span className={`ml-1 px-1.5 py-0.5 rounded-md ${user.assignedItems.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
													{user.assignedItems.length}
												</span>
											</p>
										</div>
										{selectedUserId === user.id && (
											<motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-indigo-600">
												<ChevronRight size={20} strokeWidth={3} />
											</motion.div>
										)}
									</div>
								</motion.div>
							))
						) : (
							<div className="text-center py-10 opacity-50">
								<p className="font-bold text-slate-400">Сотрудники не найдены</p>
							</div>
						)}
					</div>
				</div>

				{/* ПРАВАЯ КОЛОНКА */}
				<div className="lg:col-span-8 h-full">
					<AnimatePresence mode="wait">
						{selectedUser ? (
							<motion.div
								key="details"
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 20 }}
								className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 h-full overflow-hidden flex flex-col"
							>
								{/* USER HEADER */}
								<div className="p-8 pb-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
									<div className="flex items-center gap-6">
										<div className="w-20 h-20 rounded-[2rem] bg-white border border-slate-200 shadow-lg flex items-center justify-center text-3xl font-black text-slate-800">
											{selectedUser.firstName[0]}{selectedUser.lastName[0]}
										</div>
										<div>
											<div className="flex items-center gap-3 mb-1">
												<h2 className="text-3xl font-black text-slate-800">{selectedUser.firstName} {selectedUser.lastName}</h2>
												<span className={`px-3 py-1 rounded-full ${activeConfig.lightBg} ${activeConfig.color} text-xs font-black uppercase tracking-wider`}>
													{activeConfig.label}
												</span>
											</div>
											<p className="text-slate-500 font-medium">Настройка зоны ответственности.</p>
										</div>
									</div>
								</div>

								{/* PERMISSIONS BODY */}
								<div className="flex-1 p-8 overflow-y-auto bg-white">
									<div className="flex justify-between items-end mb-6">
										<div>
											<h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
												{React.createElement(activeConfig.itemIcon, { className: activeConfig.color })}
												{activeConfig.itemLabel}
											</h3>
											<p className="text-sm text-slate-400 font-medium mt-1">
												{activeConfig.desc}
											</p>
										</div>

										{/* ADD BUTTON (Inside Card) */}
										<div className="relative">
											<button
												onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
												className="px-5 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95"
											>
												<Plus size={18} /> Добавить
											</button>

											<AnimatePresence>
												{isAddDropdownOpen && (
													<>
														<div className="fixed inset-0 z-30" onClick={() => setIsAddDropdownOpen(false)} />
														<motion.div
															initial={{ opacity: 0, y: 10, scale: 0.95 }}
															animate={{ opacity: 1, y: 0, scale: 1 }}
															exit={{ opacity: 0, y: 10, scale: 0.95 }}
															className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-40 max-h-80 overflow-y-auto p-2"
														>
															{availableItemsToAdd
																.filter(item => !selectedUser.assignedItems.find(i => i.id === item.id))
																.map(item => (
																	<button
																		key={item.id}
																		onClick={() => handleAssignItem(item)}
																		className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 font-bold text-slate-700 text-sm flex items-center justify-between group transition-colors"
																	>
																		{item.name}
																		<Plus size={16} className="text-slate-300 group-hover:text-indigo-500" />
																	</button>
																))}
															{availableItemsToAdd.filter(item => !selectedUser.assignedItems.find(i => i.id === item.id)).length === 0 && (
																<div className="px-4 py-3 text-center text-slate-400 text-xs font-bold">
																	Нет доступных элементов
																</div>
															)}
														</motion.div>
													</>
												)}
											</AnimatePresence>
										</div>
									</div>

									{/* ASSIGNED LIST */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<AnimatePresence>
											{selectedUser.assignedItems.length > 0 ? (
												selectedUser.assignedItems.map(item => (
													<motion.div
														key={item.id}
														layout
														initial={{ opacity: 0, scale: 0.8 }}
														animate={{ opacity: 1, scale: 1 }}
														exit={{ opacity: 0, scale: 0.8 }}
														className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-md transition-all"
													>
														<div className="flex items-center gap-3">
															<div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeConfig.lightBg} ${activeConfig.color}`}>
																{React.createElement(activeConfig.itemIcon, { size: 20 })}
															</div>
															<span className="font-bold text-slate-700 text-sm">{item.name}</span>
														</div>
														<button
															onClick={() => handleRemoveItem(item.id)}
															className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-white hover:text-rose-500 hover:shadow-sm transition-all"
															title="Убрать доступ"
														>
															<X size={18} />
														</button>
													</motion.div>
												))
											) : (
												<div className="col-span-2 py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
													<div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
														<Shield className="text-slate-300" size={32} />
													</div>
													<p className="text-slate-500 font-bold mb-1">Доступ не настроен</p>
													<p className="text-slate-400 text-xs max-w-xs">Добавьте элементы, чтобы пользователь мог начать работу.</p>
												</div>
											)}
										</AnimatePresence>
									</div>
								</div>

								{/* FOOTER */}
								<div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
									<div className="flex items-center gap-2 text-emerald-600 text-sm font-bold bg-emerald-50 px-3 py-1.5 rounded-lg">
										<CheckCircle2 size={16} />
										<span>Сохранено</span>
									</div>
									<div className="text-xs font-bold text-slate-400 uppercase">
										ID: {selectedUser.id}
									</div>
								</div>
							</motion.div>
						) : (
							<motion.div
								key="empty"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50"
							>
								<div className="w-24 h-24 bg-white rounded-full shadow-xl shadow-indigo-100 flex items-center justify-center mb-6">
									<Users className="text-indigo-400" size={48} />
								</div>
								<h2 className="text-2xl font-black text-slate-800 mb-2">Выберите сотрудника</h2>
								<p className="text-slate-500 font-medium max-w-md">
									Выберите роль сверху и сотрудника слева, чтобы настроить права доступа.
								</p>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

			</div>
		</div>
	);
};

export default AccessControl;