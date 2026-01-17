import React, { useState, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // <--- ВАЖНО: Импорт хука перевода
import {
	CalendarRange, Clock, Building2, LayoutGrid, BookOpen, Hash,
	Layers, Database, FileCheck, Book, GraduationCap, Users,
	ShieldCheck, Trash2, ArrowUpRight, Sparkles, Zap
} from 'lucide-react';

const Management = () => {
	const navigate = useNavigate();
	const { t } = useTranslation(); // <--- ВАЖНО: Инициализация

	const cards = [
		// --- 1. ФУНДАМЕНТ ---
		{ title: t('management.cards.schools.title'), desc: t('management.cards.schools.desc'), icon: Building2, from: "from-violet-500", to: "to-purple-400", path: "/admin/manage/schools" },
		{ title: t('management.cards.years.title'), desc: t('management.cards.years.desc'), icon: CalendarRange, from: "from-blue-500", to: "to-cyan-400", path: "/admin/manage/years" },
		{ title: t('management.cards.quarters.title'), desc: t('management.cards.quarters.desc'), icon: Clock, from: "from-emerald-500", to: "to-teal-400", path: "/admin/manage/quarters" },
		{ title: t('management.cards.classes.title'), desc: t('management.cards.classes.desc'), icon: LayoutGrid, from: "from-orange-500", to: "to-amber-400", path: "/admin/manage/classes" },

		// --- 2. ЛЮДИ И КОНТЕНТ ---
		{ title: t('management.cards.students.title'), desc: t('management.cards.students.desc'), icon: GraduationCap, from: "from-slate-600", to: "to-slate-400", path: "/admin/manage/students" },
		{ title: t('management.cards.subjects.title'), desc: t('management.cards.subjects.desc'), icon: BookOpen, from: "from-pink-500", to: "to-rose-400", path: "/admin/manage/subjects" },
		{ title: t('management.cards.topics.title'), desc: t('management.cards.topics.desc'), icon: Layers, from: "from-indigo-500", to: "to-blue-500", path: "/admin/manage/topics" },
		{ title: t('management.cards.questions.title'), desc: t('management.cards.questions.desc'), icon: Database, from: "from-amber-500", to: "to-orange-400", path: "/admin/manage/questions" },

		// --- 3. ЭКЗАМЕНЫ ---
		{ title: t('management.cards.exams.title'), desc: t('management.cards.exams.desc'), icon: FileCheck, from: "from-rose-500", to: "to-red-400", path: "/admin/manage/tests" },
		{ title: t('management.cards.booklets.title'), desc: t('management.cards.booklets.desc'), icon: Book, from: "from-teal-500", to: "to-emerald-400", path: "/admin/manage/booklets" },
		{ title: t('management.cards.limits.title'), desc: t('management.cards.limits.desc'), icon: Hash, from: "from-cyan-500", to: "to-blue-400", path: "/admin/manage/question-counts" },
		{ title: t('management.cards.permissions.title'), desc: t('management.cards.permissions.desc'), icon: ShieldCheck, from: "from-red-600", to: "to-orange-500", path: "/admin/manage/permissions" },

		// --- 4. ПРОЧЕЕ ---
		{ title: t('management.cards.users.title'), desc: t('management.cards.users.desc'), icon: Users, from: "from-purple-600", to: "to-indigo-500", path: "/admin/manage/users" },
		{ title: t('management.cards.cleanup.title'), desc: t('management.cards.cleanup.desc'), icon: Trash2, from: "from-gray-700", to: "to-gray-900", path: "/admin/manage/cleanup", isDark: true },
	];

	return (
		<div className="w-full min-h-screen relative pb-20 overflow-hidden">
			{/* ФОН */}
			<div className="absolute inset-0 pointer-events-none">
				<div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40"></div>
				<div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-300/30 rounded-full blur-[100px] animate-blob"></div>
				<div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-300/30 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
			</div>

			{/* ЗАГОЛОВОК */}
			<div className="relative z-10 mb-10 mt-4 flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
				<div>
					<div className="flex items-center gap-2 mb-2">
						<span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
							<Zap size={12} fill="currentColor" /> Admin Core
						</span>
					</div>
					<h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight">
						{t('management.title')}
					</h1>
					<p className="text-slate-500 font-medium mt-2 max-w-lg text-lg">
						{t('management.subtitle')}
					</p>
				</div>
				<div className="hidden md:block">
					<button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95">
						<Sparkles size={18} className="text-amber-500" />
						{t('management.new_feature')}
					</button>
				</div>
			</div>

			{/* СЕТКА */}
			<div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-1">
				{cards.map((card, index) => (
					<TiltCard key={index} card={card} index={index} navigate={navigate} />
				))}
			</div>
		</div>
	);
};

// --- TiltCard оставляем без изменений ---
const TiltCard = ({ card, index, navigate }: any) => {
	const [rotate, setRotate] = useState({ x: 0, y: 0 });

	const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
		const card = e.currentTarget;
		const box = card.getBoundingClientRect();
		const x = e.clientX - box.left;
		const y = e.clientY - box.top;
		const centerX = box.width / 2;
		const centerY = box.height / 2;
		const rotateX = (y - centerY) / 20;
		const rotateY = (centerX - x) / 20;
		setRotate({ x: rotateX, y: rotateY });
	};

	const onMouseLeave = () => setRotate({ x: 0, y: 0 });

	return (
		<div
			onClick={() => navigate(card.path)}
			onMouseMove={onMouseMove}
			onMouseLeave={onMouseLeave}
			className="relative group cursor-pointer perspective-1000"
			style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.05}s backwards` }}
		>
			<div
				className="relative h-40 rounded-[2rem] p-6 overflow-hidden transition-all duration-200 ease-out bg-white/80 border border-white/60 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-indigo-500/20 hover:border-white"
				style={{
					transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1, 1, 1)`,
					transition: 'transform 0.1s ease-out'
				}}
			>
				<div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${card.from} ${card.to}`}></div>
				<card.icon className={`absolute -right-6 -bottom-6 text-slate-100/50 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500 ease-out ${card.isDark ? 'text-slate-800' : ''}`} size={140} strokeWidth={1} />
				<div className="relative z-10 flex flex-col justify-between h-full transform translate-z-10 group-hover:translate-x-1 transition-transform duration-300">
					<div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg mb-2 bg-gradient-to-br ${card.from} ${card.to} group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
						<card.icon size={22} strokeWidth={2.5} />
					</div>
					<div>
						<h3 className="text-xl font-bold text-slate-800 group-hover:text-slate-900 leading-tight">{card.title}</h3>
						<p className="text-sm font-medium text-slate-400 group-hover:text-slate-500 mt-1">{card.desc}</p>
					</div>
					<div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
						<div className="bg-white p-1.5 rounded-full shadow-sm text-slate-600"><ArrowUpRight size={16} /></div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Management;