import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
	Trophy, Flame, Clock, Calendar, ChevronRight,
	BookOpen, Target, Sparkles, BrainCircuit,
	Medal, Zap, Map, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

const StudentDashboard = () => {
	const [student, setStudent] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchUserData = async () => {
			try {
				const token = localStorage.getItem('token');
				const response = await axios.get('http://127.0.0.1:8000/auth/users/me/', {
					headers: { Authorization: `JWT ${token}` }
				});
				setStudent(response.data);
			} catch (error) {
				console.error(error);
			} finally {
				setLoading(false);
			}
		};
		fetchUserData();
	}, []);

	// --- MOCK DATA ДЛЯ ГЕЙМИФИКАЦИИ ---
	const gamification = {
		level: 5,
		xp: 2450,
		nextLevelXp: 3000,
		streak: 12, // Дней подряд
		achievements: [
			{ id: 1, name: "Математик", icon: "📐", color: "bg-blue-100" },
			{ id: 2, name: "Снайпер", icon: "🎯", color: "bg-red-100" },
		]
	};

	// --- MOCK DATA ДЛЯ ROADMAP ОШИБОК ---
	const weakTopics = [
		{ id: 1, subject: "Алгебра", topic: "Логарифмы", errorRate: 65, status: "critical" },
		{ id: 2, subject: "Физика", topic: "Кинематика", errorRate: 40, status: "warning" },
	];

	if (loading) return <div className="p-10 text-center">Загрузка...</div>;

	const xpPercentage = (gamification.xp / gamification.nextLevelXp) * 100;

	return (
		<div className="space-y-8 pb-10">

			{/* 1. HERO SECTION (Приветствие + Уровень) */}
			<div className="flex flex-col lg:flex-row justify-between items-end gap-4">
				<div>
					<h1 className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight">
						Привет, {student?.first_name}! 👋
					</h1>
					<p className="text-slate-500 mt-2 text-lg font-medium">
						Твой мозг готов к новым победам?
					</p>
				</div>

				{/* Блок Уровня */}
				<div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 min-w-[300px]">
					<div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200">
						{gamification.level}
					</div>
					<div className="flex-1">
						<div className="flex justify-between text-xs font-bold mb-1">
							<span className="text-slate-600">Level {gamification.level}</span>
							<span className="text-indigo-600">{gamification.xp} / {gamification.nextLevelXp} XP</span>
						</div>
						<div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
							<motion.div
								initial={{ width: 0 }}
								animate={{ width: `${xpPercentage}%` }}
								className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
							/>
						</div>
					</div>
				</div>
			</div>

			{/* 2. BENTO GRID */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

				{/* ЛЕВАЯ КОЛОНКА (2/3) */}
				<div className="lg:col-span-2 space-y-6">

					{/* Карточка: AI СОВЕТНИК (Новая фича!) */}
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl"
					>
						<div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

						<div className="relative z-10">
							<div className="flex items-center gap-2 mb-3">
								<BrainCircuit className="text-indigo-400" />
								<span className="text-indigo-200 font-bold text-xs uppercase tracking-wider">AI Анализ Навыков</span>
							</div>
							<h2 className="text-2xl font-bold mb-2">Твой путь: Инженерия и IT 💻</h2>
							<p className="text-slate-300 mb-6 max-w-lg leading-relaxed">
								Анализируя твои ответы, я вижу сильные способности к точным наукам (Математика +90%).
								Рекомендую рассмотреть факультет "Программная инженерия" или "Кибербезопасность".
							</p>
							<button className="bg-white text-slate-900 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center gap-2">
								<Sparkles size={16} className="text-indigo-600" />
								Подробнее о факультетах
							</button>
						</div>
					</motion.div>

					{/* ROADMAP ОШИБОК (Новая фича!) */}
					<div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
						<div className="flex justify-between items-center mb-6">
							<h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
								<Map size={20} className="text-indigo-500" />
								Твоя карта пробелов
							</h3>
							<span className="text-xs font-bold bg-red-50 text-red-500 px-2 py-1 rounded-md">Требует внимания</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							{weakTopics.map((topic) => (
								<div key={topic.id} className="p-4 rounded-2xl border-2 border-red-50 bg-red-50/30 flex items-start gap-3 hover:border-red-100 transition-colors">
									<div className="bg-white p-2 rounded-full shadow-sm text-red-500 mt-1">
										<AlertCircle size={20} />
									</div>
									<div>
										<p className="text-xs font-bold text-slate-400 uppercase mb-0.5">{topic.subject}</p>
										<h4 className="font-bold text-slate-800 text-base">{topic.topic}</h4>
										<p className="text-xs text-red-600 font-medium mt-1">
											{topic.errorRate}% ошибок в тестах
										</p>
										<button className="mt-3 text-xs font-black text-indigo-600 hover:underline flex items-center gap-1">
											Пройти тренировку <ChevronRight size={12} />
										</button>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* СТАТИСТИКА (Геймификация) */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
						<div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
							<Flame size={24} className="text-orange-500 mb-2" />
							<span className="text-2xl font-black text-slate-800">{gamification.streak}</span>
							<span className="text-xs font-bold text-slate-400 uppercase">Дней подряд</span>
						</div>
						<div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
							<Trophy size={24} className="text-yellow-500 mb-2" />
							<span className="text-2xl font-black text-slate-800">Top 5%</span>
							<span className="text-xs font-bold text-slate-400 uppercase">Рейтинг</span>
						</div>
						<div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
							<Target size={24} className="text-emerald-500 mb-2" />
							<span className="text-2xl font-black text-slate-800">89%</span>
							<span className="text-xs font-bold text-slate-400 uppercase">Точность</span>
						</div>
						<div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
							<Zap size={24} className="text-blue-500 mb-2" />
							<span className="text-2xl font-black text-slate-800">12</span>
							<span className="text-xs font-bold text-slate-400 uppercase">Тестов</span>
						</div>
					</div>

				</div>

				{/* ПРАВАЯ КОЛОНКА (1/3) */}
				<div className="space-y-6">

					{/* Профиль карточка */}
					<div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center relative overflow-hidden group">
						<div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-indigo-50 to-purple-50 group-hover:from-indigo-100 group-hover:to-purple-100 transition-colors"></div>
						<div className="relative z-10 mt-10">
							<div className="w-24 h-24 bg-white rounded-full mx-auto p-1.5 shadow-lg relative">
								<div className="w-full h-full bg-slate-800 rounded-full flex items-center justify-center text-white text-3xl font-black">
									{student?.first_name?.[0]}
								</div>
								{/* Бейдж уровня на аватаре */}
								<div className="absolute bottom-0 right-0 bg-indigo-600 text-white text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full border-2 border-white">
									{gamification.level}
								</div>
							</div>

							<h3 className="font-bold text-xl mt-4 text-slate-800">{student?.last_name} {student?.first_name}</h3>
							<p className="text-slate-400 text-sm font-medium">{student?.profile?.school?.name}</p>

							{/* Достижения */}
							<div className="mt-6">
								<p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Мои награды</p>
								<div className="flex justify-center gap-2">
									{gamification.achievements.map(ach => (
										<div key={ach.id} className={`w-10 h-10 ${ach.color} rounded-xl flex items-center justify-center text-xl cursor-help`} title={ach.name}>
											{ach.icon}
										</div>
									))}
									<div className="w-10 h-10 bg-slate-50 border border-slate-200 border-dashed rounded-xl flex items-center justify-center text-slate-300">
										<PlusCircle size={16} />
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Календарь событий */}
					<div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
						<h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
							<Calendar size={18} className="text-indigo-500" /> Календарь
						</h3>
						<div className="space-y-4">
							<div className="flex gap-4 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
								<div className="flex-shrink-0 w-12 text-center bg-white rounded-xl py-1 shadow-sm">
									<span className="block text-[10px] font-black text-red-500 uppercase">ФЕВ</span>
									<span className="block text-xl font-black text-slate-800">20</span>
								</div>
								<div>
									<p className="font-bold text-sm text-slate-800">Финальный GAT-4</p>
									<p className="text-xs text-slate-500 font-medium">Осталось 3 дня</p>
								</div>
							</div>
						</div>
						<button className="w-full mt-4 py-2.5 text-xs font-bold text-slate-500 bg-slate-50 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-colors">
							Открыть расписание
						</button>
					</div>

				</div>
			</div>
		</div>
	);
};

// Вспомогательный компонент иконки (для макета)
const PlusCircle = ({ size }: { size: number }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
);

export default StudentDashboard;