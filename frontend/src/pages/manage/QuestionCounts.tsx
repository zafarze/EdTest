import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Добавил useNavigate для перехода по ссылкам
import { useNavigate } from 'react-router-dom';
import {
	School, ChevronDown, Plus, Trash2, Copy,
	Save, Calculator, ArrowLeft, Edit2, X,
	CheckCircle2, AlertTriangle, AlertCircle,
	Minus, Maximize2, Minimize2, Search // Добавил иконку Search
} from 'lucide-react';

// --- ТИПЫ ДАННЫХ ---
interface SubjectRule {
	id: string;
	subjectName: string;
	count: number;
	color?: string;
}

interface GradeRules {
	grade: number;
	subjects: SubjectRule[];
}

interface SchoolConfig {
	id: number;
	name: string;
	grades: GradeRules[];
}

interface QuestionCountsProps {
	onBack?: () => void;
}

interface ToastMsg {
	id: number;
	type: 'success' | 'error' | 'info';
	message: string;
}

// --- MOCK DATA ---
const INITIAL_DATA: SchoolConfig[] = [
	{
		id: 1,
		name: "Школа им. Абдураҳмони Ҷомӣ",
		grades: [
			{
				grade: 2,
				subjects: [
					{ id: 's1', subjectName: 'Математика', count: 20, color: 'text-indigo-600 bg-indigo-50' },
					{ id: 's2', subjectName: 'Русский язык', count: 10, color: 'text-rose-600 bg-rose-50' },
					{ id: 's3', subjectName: 'Табиатшиносӣ', count: 10, color: 'text-emerald-600 bg-emerald-50' },
					{ id: 's4', subjectName: 'Забони Тоҷикӣ', count: 15, color: 'text-cyan-600 bg-cyan-50' },
					{ id: 's5', subjectName: 'Английский язык (углубленное изучение)', count: 15, color: 'text-violet-600 bg-violet-50' },
				]
			},
			{
				grade: 3,
				subjects: [
					{ id: 's6', subjectName: 'Математика', count: 25, color: 'text-indigo-600 bg-indigo-50' },
				]
			}
		]
	},
	{
		id: 2,
		name: "Лицей для одаренных",
		grades: []
	},
	{
		id: 3,
		name: "Гимназия №1",
		grades: []
	}
];

const QuestionCounts: React.FC<QuestionCountsProps> = () => { // Убрал onBack из пропсов, так как используем navigate
	const navigate = useNavigate(); // Хук для навигации
	const [schools, setSchools] = useState<SchoolConfig[]>(INITIAL_DATA);
	const [selectedSchoolId, setSelectedSchoolId] = useState<number>(1);
	const [expandedGrade, setExpandedGrade] = useState<number | null>(2);
	const [isWideMode, setIsWideMode] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	// Новое состояние для поиска школы
	const [searchTerm, setSearchTerm] = useState('');

	const [toasts, setToasts] = useState<ToastMsg[]>([]);
	const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
	const [cloneSourceId, setCloneSourceId] = useState<number | null>(null);

	const [subjectModal, setSubjectModal] = useState<{
		isOpen: boolean;
		type: 'add' | 'edit';
		gradeIdx: number;
		subjectId: string | null;
		nameValue: string;
	}>({ isOpen: false, type: 'add', gradeIdx: -1, subjectId: null, nameValue: '' });

	const [deleteModal, setDeleteModal] = useState<{
		isOpen: boolean;
		gradeIdx: number;
		subjectId: string | null;
		subjectName: string;
	}>({ isOpen: false, gradeIdx: -1, subjectId: null, subjectName: '' });

	const activeSchool = schools.find(s => s.id === selectedSchoolId);

	// Фильтрация школ для поиска
	const filteredSchools = schools.filter(s =>
		s.name.toLowerCase().includes(searchTerm.toLowerCase())
	);

	const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
		const id = Date.now();
		setToasts(prev => [...prev, { id, message, type }]);
		setTimeout(() => {
			setToasts(prev => prev.filter(t => t.id !== id));
		}, 3000);
	};

	const handleCountChange = (gradeIdx: number, subjectId: string, delta: number) => {
		setSchools(prev => prev.map(school => {
			if (school.id !== selectedSchoolId) return school;
			const newGrades = [...school.grades];
			const grade = newGrades[gradeIdx];
			const subjIdx = grade.subjects.findIndex(s => s.id === subjectId);
			if (subjIdx > -1) {
				const newCount = Math.max(0, grade.subjects[subjIdx].count + delta);
				grade.subjects[subjIdx] = { ...grade.subjects[subjIdx], count: newCount };
			}
			return { ...school, grades: newGrades };
		}));
	};

	const handleManualCountInput = (gradeIdx: number, subjectId: string, valueStr: string) => {
		const value = parseInt(valueStr);
		if (isNaN(value)) return;
		setSchools(prev => prev.map(school => {
			if (school.id !== selectedSchoolId) return school;
			const newGrades = [...school.grades];
			const subjIdx = newGrades[gradeIdx].subjects.findIndex(s => s.id === subjectId);
			if (subjIdx > -1) {
				newGrades[gradeIdx].subjects[subjIdx] = {
					...newGrades[gradeIdx].subjects[subjIdx],
					count: Math.max(0, value)
				};
			}
			return { ...school, grades: newGrades };
		}));
	};

	const handleClone = () => {
		if (!cloneSourceId || !activeSchool) return;
		const sourceSchool = schools.find(s => s.id === cloneSourceId);
		if (!sourceSchool) return;
		setSchools(prev => prev.map(s => {
			if (s.id === selectedSchoolId) {
				return { ...s, grades: JSON.parse(JSON.stringify(sourceSchool.grades)) };
			}
			return s;
		}));
		setIsCloneModalOpen(false);
		showToast(`Настройки скопированы из "${sourceSchool.name}"`, 'success');
	};

	const addGrade = (gradeNum: number) => {
		setSchools(prev => prev.map(school => {
			if (school.id !== selectedSchoolId) return school;
			if (school.grades.find(g => g.grade === gradeNum)) return school;
			return {
				...school,
				grades: [...school.grades, { grade: gradeNum, subjects: [] }].sort((a, b) => a.grade - b.grade)
			};
		}));
		setExpandedGrade(gradeNum);
		showToast(`${gradeNum} класс добавлен`, 'success');
	};

	const openAddSubjectModal = (gradeIdx: number) => {
		setSubjectModal({ isOpen: true, type: 'add', gradeIdx, subjectId: null, nameValue: '' });
	};

	const openEditSubjectModal = (gradeIdx: number, subject: SubjectRule) => {
		setSubjectModal({ isOpen: true, type: 'edit', gradeIdx, subjectId: subject.id, nameValue: subject.subjectName });
	};

	const openDeleteModal = (gradeIdx: number, subject: SubjectRule) => {
		setDeleteModal({ isOpen: true, gradeIdx, subjectId: subject.id, subjectName: subject.subjectName });
	}

	const handleSaveSubject = () => {
		if (!subjectModal.nameValue.trim()) return;
		setSchools(prev => prev.map(school => {
			if (school.id !== selectedSchoolId) return school;
			const newGrades = [...school.grades];
			if (subjectModal.type === 'edit' && subjectModal.subjectId) {
				const subjIdx = newGrades[subjectModal.gradeIdx].subjects.findIndex(s => s.id === subjectModal.subjectId);
				if (subjIdx > -1) {
					newGrades[subjectModal.gradeIdx].subjects[subjIdx].subjectName = subjectModal.nameValue;
				}
			} else {
				newGrades[subjectModal.gradeIdx].subjects.push({
					id: Date.now().toString(),
					subjectName: subjectModal.nameValue,
					count: 10,
					color: 'text-slate-600 bg-slate-100'
				});
			}
			return { ...school, grades: newGrades };
		}));
		setSubjectModal(prev => ({ ...prev, isOpen: false }));
		showToast(subjectModal.type === 'add' ? 'Предмет успешно добавлен' : 'Предмет обновлен', 'success');
	};

	const confirmDeleteSubject = () => {
		if (deleteModal.gradeIdx === -1 || !deleteModal.subjectId) return;
		setSchools(prev => prev.map(school => {
			if (school.id !== selectedSchoolId) return school;
			const newGrades = [...school.grades];
			newGrades[deleteModal.gradeIdx].subjects = newGrades[deleteModal.gradeIdx].subjects.filter(s => s.id !== deleteModal.subjectId);
			return { ...school, grades: newGrades };
		}));
		setDeleteModal(prev => ({ ...prev, isOpen: false }));
		showToast('Предмет удален', 'error');
	};

	return (
		<div className="w-full pb-20 relative">
			{/* TOASTS */}
			<div className="fixed bottom-6 right-6 z-[150] flex flex-col gap-2 pointer-events-none">
				<AnimatePresence>
					{toasts.map(toast => (
						<motion.div
							key={toast.id}
							initial={{ opacity: 0, x: 50, scale: 0.9 }}
							animate={{ opacity: 1, x: 0, scale: 1 }}
							exit={{ opacity: 0, x: 20, scale: 0.9 }}
							className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border ${toast.type === 'success' ? 'bg-white border-emerald-100 text-slate-800' : ''} ${toast.type === 'error' ? 'bg-white border-rose-100 text-slate-800' : ''} ${toast.type === 'info' ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
						>
							{toast.type === 'success' && <CheckCircle2 className="text-emerald-500" size={20} />}
							{toast.type === 'error' && <Trash2 className="text-rose-500" size={20} />}
							{toast.type === 'info' && <AlertCircle className="text-indigo-400" size={20} />}
							<span className="font-bold text-sm">{toast.message}</span>
						</motion.div>
					))}
				</AnimatePresence>
			</div>

			{/* HEADER */}
			<div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8 relative z-50">
				<div className="flex items-center gap-4">
					{/* КНОПКА НАЗАД: Теперь использует navigate */}
					<button
						onClick={() => navigate('/admin/management')}
						className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:border-slate-400 hover:shadow-lg transition-all active:scale-95"
					>
						<ArrowLeft size={24} />
					</button>
					<div>
						<h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
							<Calculator className="text-indigo-500" /> Распределение вопросов
						</h1>
						<p className="text-slate-500 font-medium mt-1">Настройте количество вопросов для каждого класса.</p>
					</div>
				</div>

				{/* DROPDOWN С ПОИСКОМ */}
				<div className="relative min-w-[300px]">
					<button onClick={() => { setIsDropdownOpen(!isDropdownOpen); if (!isDropdownOpen) setSearchTerm(''); }} className="w-full flex items-center gap-3 bg-white p-2 pr-4 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 hover:border-indigo-200 transition-colors">
						<div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
							<School size={20} />
						</div>
						<span className="flex-1 text-left font-bold text-slate-700 truncate">{activeSchool?.name}</span>
						<ChevronDown size={18} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
					</button>
					{isDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />}
					<AnimatePresence>
						{isDropdownOpen && (
							<motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute top-full right-0 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">

								{/* ПОЛЕ ПОИСКА */}
								<div className="p-2 border-b border-slate-100 bg-white sticky top-0 z-10">
									<div className="relative">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
										<input
											autoFocus
											type="text"
											placeholder="Найти школу..."
											value={searchTerm}
											onChange={(e) => setSearchTerm(e.target.value)}
											className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
										/>
									</div>
								</div>

								{/* СПИСОК ШКОЛ (с прокруткой) */}
								<div className="max-h-[300px] overflow-y-auto py-2">
									{filteredSchools.length > 0 ? (
										filteredSchools.map(s => (
											<button key={s.id} onClick={() => { setSelectedSchoolId(s.id); setIsDropdownOpen(false); }} className={`w-full px-4 py-3 text-left font-bold text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${selectedSchoolId === s.id ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600'}`}>
												{s.name}
												{selectedSchoolId === s.id && <CheckCircle2 size={16} />}
											</button>
										))
									) : (
										<div className="px-4 py-6 text-center text-slate-400 text-sm font-medium">
											Школа не найдена
										</div>
									)}
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</div>

			{/* MAIN CONTENT */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 transition-all duration-500 ease-in-out">

				{/* LEFT COLUMN */}
				<div className={`space-y-4 transition-all duration-500 ${isWideMode ? 'col-span-12' : 'lg:col-span-8 col-span-12'}`}>

					{/* TABS */}
					<div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
						{[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(grade => {
							const exists = activeSchool?.grades.find(g => g.grade === grade);
							return (
								<button key={grade} onClick={() => exists ? setExpandedGrade(grade) : addGrade(grade)} className={`flex-shrink-0 w-12 h-12 rounded-xl font-black text-sm transition-all ${exists ? (expandedGrade === grade ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300 scale-110' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-400') : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}>
									{grade}
								</button>
							);
						})}
					</div>

					<AnimatePresence mode='wait'>
						{activeSchool?.grades.map((gradeData, gIdx) => (
							expandedGrade === gradeData.grade && (
								<motion.div
									key={gradeData.grade}
									layout
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -20 }}
									transition={{ duration: 0.3 }}
									className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden"
								>
									<div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full blur-3xl -z-10 translate-x-20 -translate-y-20"></div>

									<div className="flex justify-between items-center mb-8">
										<div>
											<h2 className="text-4xl font-black text-slate-800">{gradeData.grade} Класс</h2>
											<p className="text-slate-400 font-bold uppercase text-xs tracking-wider mt-1">Конфигурация предметов</p>
										</div>
										<div className="flex gap-3">
											<button onClick={() => setIsWideMode(!isWideMode)} className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${isWideMode ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`} title={isWideMode ? "Свернуть" : "Развернуть на весь экран"}>
												{isWideMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
											</button>
											<button onClick={() => openAddSubjectModal(gIdx)} className="px-5 py-3 rounded-xl bg-slate-900 text-white font-bold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2">
												<Plus size={18} /> <span className="hidden sm:inline">Добавить предмет</span>
											</button>
										</div>
									</div>

									{/* СЕТКА ПРЕДМЕТОВ (Вертикальный дизайн) */}
									<div className={`grid grid-cols-1 gap-4 transition-all duration-500 ${isWideMode ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2'}`}>
										{gradeData.subjects.length === 0 ? (
											<div className={`text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl ${isWideMode ? 'col-span-3' : 'col-span-2'}`}>
												<p className="text-slate-400 font-medium">Нет предметов. Добавьте первый!</p>
											</div>
										) : (
											gradeData.subjects.map((subj) => (
												<div
													key={subj.id}
													className="group relative flex flex-col justify-between p-4 rounded-2xl bg-slate-50 hover:bg-white border border-transparent hover:border-indigo-100 hover:shadow-lg transition-all duration-300 h-full"
												>

													{/* ВЕРХНЯЯ ЧАСТЬ: Иконка и Название */}
													<div className="flex items-start gap-3 mb-4">
														{/* Иконка */}
														<div className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center font-bold text-lg ${subj.color || 'bg-slate-200'}`}>
															{subj.subjectName.charAt(0)}
														</div>

														{/* Название предмета */}
														<div className="min-w-0 pt-0.5">
															<h4 className="font-bold text-slate-700 text-sm sm:text-base leading-tight break-words line-clamp-2" title={subj.subjectName}>
																{subj.subjectName}
															</h4>
															<span className="text-[10px] uppercase font-bold text-slate-400 mt-1 block">
																Вопросов: {subj.count}
															</span>
														</div>
													</div>

													{/* НИЖНЯЯ ЧАСТЬ: Панель управления */}
													<div className="flex items-center justify-between pt-3 border-t border-slate-200/60 mt-auto">

														{/* Счетчик */}
														<div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 shadow-sm">
															<button onClick={() => handleCountChange(gIdx, subj.id, -5)} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors">
																<Minus size={16} strokeWidth={3} />
															</button>
															<input
																type="number"
																value={subj.count}
																onChange={(e) => handleManualCountInput(gIdx, subj.id, e.target.value)}
																className="w-9 text-center font-black text-slate-800 outline-none text-sm bg-transparent appearance-none [&::-webkit-inner-spin-button]:appearance-none"
															/>
															<button onClick={() => handleCountChange(gIdx, subj.id, 5)} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-emerald-50 text-slate-400 hover:text-emerald-500 transition-colors">
																<Plus size={16} strokeWidth={3} />
															</button>
														</div>

														{/* Кнопки действий */}
														<div className="flex gap-1">
															<button onClick={() => openEditSubjectModal(gIdx, subj)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all" title="Редактировать">
																<Edit2 size={16} />
															</button>
															<button onClick={() => openDeleteModal(gIdx, subj)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all" title="Удалить">
																<Trash2 size={16} />
															</button>
														</div>

													</div>
												</div>
											))
										)}
									</div>
									<div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center text-slate-500 font-medium text-sm">
										<span>Всего вопросов для ученика: <span className="text-slate-900 font-black text-lg ml-1">{gradeData.subjects.reduce((sum, s) => sum + s.count, 0)}</span></span>
									</div>
								</motion.div>
							)
						))}
					</AnimatePresence>
				</div>

				{/* RIGHT COLUMN */}
				{!isWideMode && (
					<motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="lg:col-span-4 space-y-6">
						<div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
							<div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl translate-x-10 -translate-y-10"></div>
							<h3 className="text-2xl font-black mb-2 flex items-center gap-2"><Copy size={24} /> Импорт</h3>
							<p className="text-indigo-100 text-sm font-medium mb-6">Настроили одну школу? Скопируйте структуру в текущую школу.</p>
							<button onClick={() => setIsCloneModalOpen(true)} className="w-full py-3 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl font-bold hover:bg-white hover:text-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-2">
								<Copy size={18} /> Скопировать из...
							</button>
						</div>
						<div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
							<h3 className="font-black text-slate-800 mb-4">Статистика школы</h3>
							<div className="space-y-3">
								<div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
									<span className="text-sm font-bold text-slate-500">Настроено классов</span>
									<span className="font-black text-slate-800">{activeSchool?.grades.length || 0} / 11</span>
								</div>
								<div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
									<span className="text-sm font-bold text-slate-500">Всего предметов</span>
									<span className="font-black text-slate-800">{activeSchool?.grades.reduce((acc, g) => acc + g.subjects.length, 0)}</span>
								</div>
							</div>
						</div>
					</motion.div>
				)}
			</div>

			{/* MODALS */}
			<AnimatePresence>
				{/* Clone */}
				{isCloneModalOpen && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCloneModalOpen(false)} />
						<motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
							<h3 className="text-2xl font-black text-slate-800 mb-2">Откуда копировать?</h3>
							<p className="text-slate-500 mb-6 text-sm">Выберите школу для переноса настроек</p>
							<div className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-6">
								{schools.filter(s => s.id !== selectedSchoolId).map(s => (
									<button key={s.id} onClick={() => setCloneSourceId(s.id)} className={`w-full p-4 rounded-xl text-left font-bold border transition-all flex items-center gap-3 ${cloneSourceId === s.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-600 hover:bg-slate-50'}`}>
										{s.name}
									</button>
								))}
							</div>
							<button onClick={handleClone} disabled={!cloneSourceId} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all">Применить</button>
						</motion.div>
					</div>
				)}

				{/* Delete Modal */}
				{deleteModal.isOpen && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))} />
						<motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl overflow-hidden text-center">
							<div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
								<AlertTriangle size={32} />
							</div>
							<h3 className="text-2xl font-black text-slate-800 mb-2">Удалить предмет?</h3>
							<p className="text-slate-500 mb-8 text-sm">Вы уверены, что хотите удалить <b>"{deleteModal.subjectName}"</b>? Это действие нельзя отменить.</p>
							<div className="flex gap-3">
								<button onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors">Отмена</button>
								<button onClick={confirmDeleteSubject} className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-lg shadow-rose-200 transition-all">Удалить</button>
							</div>
						</motion.div>
					</div>
				)}

				{/* Add/Edit Modal */}
				{subjectModal.isOpen && (
					<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setSubjectModal(prev => ({ ...prev, isOpen: false }))} />
						<motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl overflow-hidden">
							<div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
							<div className="flex justify-between items-center mb-6">
								<h3 className="text-2xl font-black text-slate-800">{subjectModal.type === 'add' ? 'Новый предмет' : 'Редактирование'}</h3>
								<button onClick={() => setSubjectModal(prev => ({ ...prev, isOpen: false }))} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"><X size={20} /></button>
							</div>
							<div className="space-y-4">
								<div>
									<label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Название предмета</label>
									<input type="text" autoFocus placeholder="Например: Геометрия" value={subjectModal.nameValue} onChange={(e) => setSubjectModal(prev => ({ ...prev, nameValue: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-300" onKeyDown={(e) => e.key === 'Enter' && handleSaveSubject()} />
								</div>
								<button onClick={handleSaveSubject} className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold text-lg hover:shadow-lg hover:shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4">
									{subjectModal.type === 'add' ? <Plus size={20} /> : <Save size={20} />} {subjectModal.type === 'add' ? 'Добавить' : 'Сохранить'}
								</button>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default QuestionCounts;