import React, { useState, useEffect } from 'react';
import {
	Brain, Target, TrendingUp, AlertTriangle,
	Zap, Cpu, Search, Sparkles, Fingerprint, ChevronRight,
	MoreHorizontal, ArrowUpRight
} from 'lucide-react';

// --- TYES & INTERFACES (Типизация) ---
interface InsightProps {
	title: string;
	value: string;
	desc: string;
	icon: React.ElementType;
	color: string;
	delay: number;
}

interface StudentRisk {
	id: number;
	name: string;
	grade: string;
	risk: number;
	reason: string;
}

interface TopicStat {
	name: string;
	score: number; // 0-100
	trend: number; // e.g. +5 or -10
}

// --- СТИЛИ АНИМАЦИИ (Внутренние, чтобы работало сразу) ---
const AnimationStyles = () => (
	<style>{`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      from { transform: translateX(-100%); }
      to { transform: translateX(100%); }
    }
    .animate-fade-in-up {
      animation: fadeInUp 0.6s ease-out forwards;
    }
  `}</style>
);

// --- 1. КОМПОНЕНТ: КАРТОЧКА AI ИНСАЙТА ---
const AIInsightCard: React.FC<InsightProps> = ({ title, value, desc, icon: Icon, color, delay }) => (
	<div
		className="relative group overflow-hidden rounded-[2rem] bg-white/80 backdrop-blur-xl border border-white p-6 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
		style={{ animation: `fadeInUp 0.6s ease-out ${delay}s backwards` }}
	>
		{/* Декор фона */}
		<div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full bg-gradient-to-br ${color} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity`}></div>

		<div className="relative z-10 flex justify-between items-start mb-4">
			<div className={`p-3 rounded-2xl bg-gradient-to-br ${color} text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
				<Icon size={22} strokeWidth={2.5} />
			</div>
			<div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
				<Sparkles size={10} className="text-purple-500 fill-purple-500" /> AI Analysis
			</div>
		</div>

		<h3 className="text-3xl font-black text-slate-800 mb-1 tracking-tight">{value}</h3>
		<p className="text-sm font-bold text-slate-600 mb-2">{title}</p>
		<p className="text-xs text-slate-400 font-medium leading-relaxed">{desc}</p>
	</div>
);

// --- 2. КОМПОНЕНТ: СПИСОК РИСКА (Обновленный) ---
const RiskList = () => {
	const students: StudentRisk[] = [
		{ id: 1, name: "Алишер Валиев", grade: "11-А", risk: 89, reason: "Резкое падение по Алгебре" },
		{ id: 2, name: "Мадина Зоирова", grade: "10-Б", risk: 74, reason: "Систематические пропуски" },
		{ id: 3, name: "Фаррух Исмоилов", grade: "9-В", risk: 62, reason: "Аномально быстрые ответы" },
	];

	const getRiskColor = (risk: number) => {
		if (risk >= 80) return "text-rose-600 bg-rose-50 border-rose-100"; // Critical
		if (risk >= 70) return "text-orange-600 bg-orange-50 border-orange-100"; // High
		return "text-amber-600 bg-amber-50 border-amber-100"; // Medium
	};

	return (
		<div className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 h-full flex flex-col">
			<div className="flex items-center justify-between mb-6">
				<h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
					<div className="p-1.5 rounded-lg bg-rose-100 text-rose-600">
						<AlertTriangle size={18} />
					</div>
					Зона Риска
				</h3>
				<span className="flex h-3 w-3 relative">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
					<span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
				</span>
			</div>

			<div className="flex-1 space-y-3">
				{students.map((s) => {
					const styleClass = getRiskColor(s.risk);
					return (
						<div key={s.id} className="group relative p-3 rounded-2xl bg-white border border-slate-100 hover:border-rose-200 hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-300 cursor-pointer">
							<div className="flex justify-between items-start mb-2">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-200">
										{s.name.charAt(0)}
									</div>
									<div>
										<h5 className="text-sm font-bold text-slate-800 leading-tight">{s.name}</h5>
										<span className="text-[10px] text-slate-400 font-medium">{s.grade}</span>
									</div>
								</div>
								<span className={`px-2 py-1 rounded-lg text-xs font-black ${styleClass}`}>
									{s.risk}%
								</span>
							</div>

							<div className="pl-[52px]">
								<div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
									<span className="w-1 h-1 rounded-full bg-rose-500"></span>
									{s.reason}
								</div>
								{/* Progress Bar Mini */}
								<div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
									<div className="h-full bg-rose-500 rounded-full transition-all duration-1000" style={{ width: `${s.risk}%` }}></div>
								</div>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	);
};

// --- 3. КОМПОНЕНТ: КАРТА ЗНАНИЙ (Skill Bars вместо Heatmap) ---
const KnowledgeMap = () => {
	const topics: TopicStat[] = [
		{ name: "Алгебра и Начала Анализа", score: 92, trend: 5 },
		{ name: "Стереометрия", score: 45, trend: -12 },
		{ name: "Тригонометрия", score: 78, trend: 2 },
		{ name: "Теория Вероятностей", score: 65, trend: 0 },
	];

	const getBarColor = (score: number) => {
		if (score < 50) return "bg-rose-500 shadow-rose-500/30";
		if (score < 70) return "bg-amber-400 shadow-amber-400/30";
		return "bg-emerald-500 shadow-emerald-500/30";
	};

	return (
		<div className="bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 h-full flex flex-col relative overflow-hidden">
			<div className="flex justify-between items-center mb-6 relative z-10">
				<h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
					<div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">
						<Search size={18} />
					</div>
					Карта Знаний
				</h3>
				<button className="text-slate-400 hover:text-indigo-600 transition-colors">
					<MoreHorizontal size={20} />
				</button>
			</div>

			<div className="flex-1 flex flex-col justify-center gap-5 relative z-10">
				{topics.map((t, i) => (
					<div key={i} className="group">
						<div className="flex justify-between items-end mb-2">
							<span className="text-xs font-bold text-slate-700">{t.name}</span>
							<div className="flex items-center gap-2">
								<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.trend < 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
									{t.trend > 0 ? '+' : ''}{t.trend}%
								</span>
								<span className="text-xs font-black text-slate-800">{t.score}%</span>
							</div>
						</div>
						<div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative border border-slate-100">
							<div
								className={`h-full rounded-full shadow-lg transition-all duration-1000 ease-out group-hover:brightness-110 ${getBarColor(t.score)}`}
								style={{ width: `${t.score}%` }}
							>
								{/* Shimmer Effect */}
								<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full -translate-x-full animate-[shimmer_2s_infinite]"></div>
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Фон декоративный */}
			<div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl z-0"></div>

			<div className="mt-6 pt-4 border-t border-slate-100 text-center relative z-10">
				<p className="text-[10px] text-slate-400 mb-2">AI проанализировал 3,420 ответов</p>
			</div>
		</div>
	)
}

// --- 4. КОМПОНЕНТ: AI СОВЕТНИК ---
const AIAdvisor = () => {
	return (
		<div className="relative overflow-hidden bg-[#1e1b4b] rounded-[2rem] p-6 shadow-2xl shadow-indigo-900/20 text-white h-full flex flex-col">
			{/* Декор фона */}
			<div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-[80px] pointer-events-none"></div>
			<div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-600/20 rounded-full blur-[60px] pointer-events-none"></div>

			<div className="relative z-10 flex-1">
				<div className="flex items-center gap-3 mb-6">
					<div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 shadow-inner">
						<Brain size={24} className="text-purple-300" />
					</div>
					<div>
						<h3 className="font-bold text-lg tracking-wide">AI Advisor</h3>
						<p className="text-[10px] text-purple-200 opacity-70 uppercase tracking-widest">Neural Core v2.0</p>
					</div>
				</div>

				<div className="space-y-4">
					<div className="bg-white/5 backdrop-blur-md rounded-2xl rounded-tl-none p-5 border border-white/10 text-sm font-medium leading-relaxed relative group hover:bg-white/10 transition-colors">
						<div className="absolute -left-1 top-0 w-1 h-full bg-gradient-to-b from-purple-400 to-indigo-400 rounded-l-md"></div>
						<p className="mb-3 text-indigo-50">
							<span className="text-xl mr-2">🤖</span>
							<span className="text-purple-200 font-bold uppercase text-xs tracking-wider">Обнаружена аномалия</span>
						</p>
						<p className="text-slate-200 mb-2">
							Успеваемость 10-х классов по теме <span className="text-yellow-300 font-bold border-b border-yellow-300/30">Геометрия</span> снизилась на <span className="text-rose-300 font-bold">15%</span>.
						</p>
						<div className="mt-3 pt-3 border-t border-white/10 flex items-start gap-2">
							<div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-emerald-400 shrink-0"></div>
							<p className="text-xs text-white/60">Рекомендую назначить микро-тест по теме "Векторы" на завтра.</p>
						</div>
					</div>
				</div>
			</div>

			<button className="relative z-10 w-full py-4 rounded-xl bg-gradient-to-r from-white to-indigo-50 text-indigo-900 font-bold text-sm hover:to-white transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 shadow-lg shadow-white/10 group">
				<Zap size={18} className="text-indigo-600 group-hover:scale-110 transition-transform" />
				Сгенерировать План
			</button>
		</div>
	);
};

// --- ГЛАВНАЯ СТРАНИЦА ---
const Analytics = () => {
	return (
		<div className="w-full min-h-screen relative pb-20 bg-[#F8FAFC] font-sans selection:bg-purple-200 selection:text-purple-900">
			<AnimationStyles />

			{/* Фон Сетка (Subtle Grid) */}
			<div className="absolute inset-0 pointer-events-none z-0"
				style={{
					backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
					backgroundSize: '30px 30px',
					opacity: 0.4
				}}>
			</div>

			<div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-8">

				{/* Заголовок */}
				<div className="mb-10 animate-fade-in-up">
					<div className="flex items-center gap-2 mb-3">
						<span className="px-3 py-1 rounded-full bg-white border border-purple-100 text-purple-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
							<Cpu size={12} /> GAT Neural Core v2.0
						</span>
					</div>
					<h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight leading-tight">
						Интеллектуальная <br className="md:hidden" />
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">Аналитика</span>
					</h1>
				</div>

				{/* 1. ВЕРХНИЕ КАРТОЧКИ (AI INSIGHTS) */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<AIInsightCard
						title="Прогноз Успеваемости"
						value="+14.2%"
						desc="Ожидаемый рост среднего балла в следующем месяце."
						icon={TrendingUp} color="from-emerald-500 to-teal-400" delay={0.1}
					/>
					<AIInsightCard
						title="Качество Тестов"
						value="98.5%"
						desc="Индекс валидности. Дубликатов не обнаружено."
						icon={Target} color="from-blue-500 to-indigo-500" delay={0.2}
					/>
					<AIInsightCard
						title="Вовлеченность"
						value="Высокая"
						desc="85% учеников сдают тесты в первые 2 часа."
						icon={Fingerprint} color="from-orange-500 to-amber-500" delay={0.3}
					/>
				</div>

				{/* 2. СЛОЖНАЯ СЕТКА (GRID LAYOUT) */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-fr mb-8">
					{/* Левая колонка - РИСК */}
					<div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
						<RiskList />
					</div>

					{/* Центр - НОВАЯ КАРТА ЗНАНИЙ */}
					<div className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
						<KnowledgeMap />
					</div>

					{/* Правая колонка - AI СОВЕТНИК */}
					<div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
						<AIAdvisor />
					</div>
				</div>

				{/* 3. НИЖНИЙ БАННЕР (Call to Action) */}
				<div
					className="w-full rounded-[2rem] bg-slate-900 p-1 relative overflow-hidden group cursor-pointer animate-fade-in-up shadow-2xl shadow-slate-900/20"
					style={{ animationDelay: '0.7s' }}
				>
					<div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 blur-xl group-hover:opacity-30 transition-opacity"></div>

					<div className="bg-slate-900 rounded-[1.8rem] px-8 py-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between z-10">
						{/* Glow effect on hover */}
						<div className="absolute -left-20 -top-20 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl group-hover:bg-indigo-600/30 transition-colors"></div>

						<div className="relative z-10 flex items-center gap-6">
							<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
								<Zap size={28} fill="currentColor" />
							</div>
							<div>
								<h2 className="text-2xl font-bold text-white mb-1">Полный отчет готов</h2>
								<p className="text-slate-400 text-sm">Скачайте PDF с детальным разбором каждого ученика.</p>
							</div>
						</div>

						<div className="mt-6 md:mt-0 flex items-center gap-4">
							<span className="text-slate-500 text-xs font-bold uppercase tracking-wider group-hover:text-white transition-colors">PDF • 2.4 MB</span>
							<div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-slate-900 transition-all duration-300">
								<ArrowUpRight size={24} />
							</div>
						</div>
					</div>
				</div>

			</div>
		</div>
	);
};

export default Analytics;