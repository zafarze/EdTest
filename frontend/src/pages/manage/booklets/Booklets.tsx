import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
	ArrowLeft, Building2, GraduationCap, FileText,
	ChevronRight, BookOpen, Download, Printer,
	MoreVertical, Search, Filter, Home, Loader2,
	Eye, Edit, Trash2, AlertTriangle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- ТИПЫ УРОВНЕЙ ---
type Level = 'schools' | 'classes' | 'gats' | 'booklets';

const Booklets = () => {
	const navigate = useNavigate();
	const { t } = useTranslation();

	// --- СОСТОЯНИЕ ДАННЫХ ---
	const [items, setItems] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);

	// --- СОСТОЯНИЕ НАВИГАЦИИ ---
	const [currentLevel, setCurrentLevel] = useState<Level>('schools');
	const [selectedSchool, setSelectedSchool] = useState<any>(null);
	const [selectedClass, setSelectedClass] = useState<any>(null);
	const [selectedGat, setSelectedGat] = useState<any>(null);

	// --- СОСТОЯНИЕ УДАЛЕНИЯ ---
	const [deleteId, setDeleteId] = useState<number | null>(null);

	// --- ЗАГРУЗКА ДАННЫХ ---
	const fetchData = async (lvl: Level, params: any = {}) => {
		setLoading(true);
		try {
			const token = localStorage.getItem('token');
			const queryParams = new URLSearchParams({ level: lvl, ...params }).toString();
			const response = await axios.get(`http://127.0.0.1:8000/api/booklets/catalog/?${queryParams}`, {
				headers: { Authorization: `JWT ${token}` }
			});
			setItems(response.data);
		} catch (error) {
			console.error("Ошибка загрузки данных:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData('schools');
	}, []);

	// --- НАВИГАЦИЯ ---
	const goForward = (item: any, nextLevel: Level) => {
		if (currentLevel === 'schools') {
			setSelectedSchool(item);
			fetchData('classes', { schoolId: item.id });
		}
		if (currentLevel === 'classes') {
			setSelectedClass(item);
			fetchData('gats', { classId: item.id });
		}
		if (currentLevel === 'gats') {
			setSelectedGat(item);
			fetchData('booklets', { classId: selectedClass.id, gatNumber: item.number });
		}
		setCurrentLevel(nextLevel);
	};

	const goBackTo = (level: Level) => {
		setCurrentLevel(level);
		if (level === 'schools') {
			fetchData('schools');
			setSelectedSchool(null); setSelectedClass(null); setSelectedGat(null);
		}
		if (level === 'classes') {
			fetchData('classes', { schoolId: selectedSchool.id });
			setSelectedClass(null); setSelectedGat(null);
		}
		if (level === 'gats') {
			fetchData('gats', { classId: selectedClass.id });
			setSelectedGat(null);
		}
	};

	// --- ФУНКЦИИ ДЕЙСТВИЙ ---

	// 1. УДАЛЕНИЕ
	const performDelete = async () => {
		if (!deleteId) return;
		try {
			const token = localStorage.getItem('token');
			await axios.delete(`http://127.0.0.1:8000/api/exams/${deleteId}/`, {
				headers: { Authorization: `JWT ${token}` }
			});
			fetchData('booklets', { classId: selectedClass.id, gatNumber: selectedGat.number });
			setDeleteId(null);
		} catch (error) {
			alert("Ошибка при удалении. Проверьте права доступа.");
			console.error(error);
		}
	};

	// 2. РЕДАКТИРОВАНИЕ
	const handleEdit = (id: number) => {
		alert(`Редактирование буклета ID: ${id} (Функционал в разработке)`);
	};

	// 3. ПРЕВЬЮ (Внутри React)
	const handlePreview = (id: number) => {
		navigate(`/admin/manage/booklets/preview/${id}`);
	};

	// 4. 🔥 СКАЧИВАНИЕ PDF (С АВТОРИЗАЦИЕЙ)
	const handleDownloadPdf = async (id: number, variant: string) => {
		try {
			const token = localStorage.getItem('token');
			// Запрашиваем файл как 'blob' (binary large object)
			const response = await axios.get(`http://127.0.0.1:8000/api/download/pdf/${id}/`, {
				headers: { Authorization: `JWT ${token}` },
				responseType: 'blob'
			});

			// Создаем временную ссылку в браузере для скачивания
			const url = window.URL.createObjectURL(new Blob([response.data]));
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute('download', `GAT_Booklet_Var${variant || id}.pdf`); // Имя файла
			document.body.appendChild(link);
			link.click();

			// Чистим мусор
			link.remove();
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Ошибка скачивания PDF:", error);
			alert("Не удалось скачать PDF. Возможно, у вас нет прав или произошла ошибка на сервере.");
		}
	};


	// --- РЕНДЕР КАРТОЧЕК ---

	// 1. ШКОЛЫ
	const renderSchools = () => (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{items.map((school, idx) => (
				<motion.div
					key={school.id}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: idx * 0.1 }}
					onClick={() => goForward(school, 'classes')}
					className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all cursor-pointer relative overflow-hidden"
				>
					<div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[100%] -mr-10 -mt-10 group-hover:bg-indigo-50 transition-colors"></div>
					<div className="relative z-10">
						<div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
							<Building2 size={28} />
						</div>
						<h3 className="text-xl font-black text-slate-800 mb-1 group-hover:text-indigo-700 transition-colors">{school.name}</h3>
						<p className="text-sm font-bold text-slate-400">
							{school.students_count} учеников • {school.tests_count} тестов
						</p>
					</div>
				</motion.div>
			))}
		</div>
	);

	// 2. КЛАССЫ
	const renderClasses = () => (
		<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
			{items.map((cls, idx) => (
				<motion.div
					key={cls.id}
					initial={{ opacity: 0, scale: 0.9 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: idx * 0.05 }}
					onClick={() => goForward(cls, 'gats')}
					className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-md hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer text-center flex flex-col items-center justify-center min-h-[180px]"
				>
					<div className="w-16 h-16 rounded-full bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center mb-3 transition-all duration-300 shadow-inner group-hover:shadow-indigo-300">
						<GraduationCap size={32} />
					</div>
					<h3 className="text-2xl font-black text-slate-700 group-hover:text-indigo-600">{cls.name}</h3>
					<span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg mt-2 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
						{cls.tests_count} экзаменов
					</span>
				</motion.div>
			))}
			{items.length === 0 && !loading && (
				<div className="col-span-full text-center text-slate-400 py-10 font-bold">Нет данных</div>
			)}
		</div>
	);

	// 3. GAT НОМЕРА
	const renderGats = () => (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
			{items.map((gat, idx) => (
				<motion.div
					key={gat.id}
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: idx * 0.1 }}
					onClick={() => goForward(gat, 'booklets')}
					className="relative group overflow-hidden bg-white rounded-[2rem] shadow-lg border border-slate-100 cursor-pointer hover:ring-4 hover:ring-indigo-50 transition-all"
				>
					<div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
					<div className="relative p-8 flex flex-col items-center z-10">
						<div className="text-[5rem] font-black text-slate-100 group-hover:text-white/20 transition-colors leading-none -mb-4">
							{gat.number}
						</div>
						<h3 className="text-3xl font-black text-slate-800 group-hover:text-white mb-2">GAT-{gat.number}</h3>
						<div className="flex items-center gap-2">
							<span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${gat.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'} group-hover:bg-white/20 group-hover:text-white`}>
								{gat.status === 'completed' ? 'Завершен' : 'Скоро'}
							</span>
							<span className="text-xs font-bold text-slate-400 group-hover:text-white/80">{gat.date}</span>
						</div>
					</div>
				</motion.div>
			))}
			{items.length === 0 && !loading && (
				<div className="col-span-full text-center text-slate-400 py-10 font-bold">Нет тестов</div>
			)}
		</div>
	);

	// 4. БУКЛЕТЫ (ФИНАЛ)
	const renderBooklets = () => (
		<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
			{items.map((booklet, idx) => (
				<motion.div
					key={booklet.id}
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: idx * 0.1 }}
					className="group bg-white rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col h-full"
				>
					{/* ОБЛОЖКА */}
					<div className={`h-48 bg-gradient-to-br ${booklet.color} p-6 flex flex-col justify-between relative`}>
						<div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>

						<div className="relative z-10 flex justify-between items-start">
							<span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-xl text-xs font-bold border border-white/10">
								День {booklet.day}
							</span>

							<div className="flex gap-2">
								<button
									onClick={(e) => { e.stopPropagation(); handleEdit(booklet.id); }}
									className="w-8 h-8 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors text-white"
									title="Редактировать"
								>
									<Edit size={14} />
								</button>
								<button
									onClick={(e) => { e.stopPropagation(); setDeleteId(booklet.id); }}
									className="w-8 h-8 bg-red-500/20 hover:bg-red-500/40 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors text-white"
									title="Удалить"
								>
									<Trash2 size={14} />
								</button>
							</div>
						</div>

						<div className="relative z-10">
							<h2 className="text-4xl font-black text-white mb-1">VAR {booklet.variant}</h2>
							<p className="text-white/80 text-xs font-medium uppercase tracking-wide">
								{selectedClass?.name} • GAT-{selectedGat?.number}
							</p>
						</div>
					</div>

					{/* КОНТЕНТ */}
					<div className="p-6 flex-1 flex flex-col">
						<div className="flex flex-wrap gap-2 mb-6">
							{booklet.subjects.map((subj: string) => (
								<span key={subj} className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-lg border border-slate-200">
									{subj}
								</span>
							))}
						</div>

						<div className="mt-auto grid grid-cols-2 gap-3">
							<button
								onClick={() => handlePreview(booklet.id)}
								className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-50 text-slate-600 font-bold text-xs hover:bg-slate-100 hover:text-indigo-600 transition-colors border border-slate-200"
							>
								<Eye size={16} /> Просмотр
							</button>

							{/* 🔥 ИСПРАВЛЕННАЯ КНОПКА PDF (Вызывает JS-функцию) */}
							<button
								onClick={() => handleDownloadPdf(booklet.id, booklet.variant)}
								className="flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-xs hover:bg-indigo-100 transition-colors border border-indigo-100"
							>
								<Download size={16} /> PDF
							</button>
						</div>
					</div>
				</motion.div>
			))}

			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				whileHover={{ scale: 1.02 }}
				onClick={() => alert("Переход к созданию нового буклета...")}
				className="min-h-[300px] rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group"
			>
				<div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:scale-110 transition-all duration-300 ring-4 ring-slate-100 group-hover:ring-indigo-100">
					<FileText size={32} />
				</div>
				<p className="font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">Сгенерировать вариант</p>
			</motion.div>
		</div>
	);

	return (
		<div className="w-full mt-2 pb-20 max-w-7xl mx-auto">

			{/* HEADER & BREADCRUMBS */}
			<div className="flex flex-col gap-6 mb-10 animate-fade-in-up">
				<div className="flex justify-between items-start">
					<div>
						<button onClick={() => {
							if (currentLevel === 'schools') navigate(-1);
							else goBackTo(
								currentLevel === 'booklets' ? 'gats' :
									currentLevel === 'gats' ? 'classes' :
										'schools'
							);
						}} className="group flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-2">
							<div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform"><ArrowLeft size={16} /></div>
							<span className="text-xs font-bold uppercase tracking-wider">{t('common.back')}</span>
						</button>
						<h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
							<BookOpen className="text-indigo-600" />
							{t('booklets.title')}
						</h1>
					</div>

					{/* ХЛЕБНЫЕ КРОШКИ */}
					<div className="hidden md:flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100 text-sm font-bold text-slate-500">
						<button onClick={() => goBackTo('schools')} className={`hover:text-indigo-600 flex items-center gap-1 ${currentLevel === 'schools' ? 'text-indigo-600' : ''}`}>
							<Home size={14} /> Школы
						</button>
						{selectedSchool && (
							<>
								<ChevronRight size={14} className="text-slate-300" />
								<button onClick={() => goBackTo('classes')} className={`hover:text-indigo-600 ${currentLevel === 'classes' ? 'text-indigo-600' : ''}`}>
									{selectedSchool.name}
								</button>
							</>
						)}
						{selectedClass && (
							<>
								<ChevronRight size={14} className="text-slate-300" />
								<button onClick={() => goBackTo('gats')} className={`hover:text-indigo-600 ${currentLevel === 'gats' ? 'text-indigo-600' : ''}`}>
									{selectedClass.name}
								</button>
							</>
						)}
						{selectedGat && (
							<>
								<ChevronRight size={14} className="text-slate-300" />
								<span className="text-indigo-600">GAT-{selectedGat.number}</span>
							</>
						)}
					</div>
				</div>

				{/* SEARCH BAR (Только для верхнего уровня) */}
				{currentLevel === 'schools' && (
					<div className="relative w-full md:w-96">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
						<input type="text" placeholder="Поиск школы..." className="w-full pl-12 pr-4 py-3 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm font-bold text-slate-600 placeholder:text-slate-300 outline-none transition-all" />
					</div>
				)}
			</div>

			{/* DYNAMIC CONTENT AREA */}
			<div className="min-h-[400px]">
				{loading ? (
					<div className="flex justify-center items-center h-64">
						<Loader2 size={48} className="text-indigo-600 animate-spin" />
					</div>
				) : (
					<AnimatePresence mode='wait'>
						<motion.div
							key={currentLevel}
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.2 }}
						>
							{currentLevel === 'schools' && renderSchools()}
							{currentLevel === 'classes' && renderClasses()}
							{currentLevel === 'gats' && renderGats()}
							{currentLevel === 'booklets' && renderBooklets()}
						</motion.div>
					</AnimatePresence>
				)}
			</div>

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

export default Booklets;