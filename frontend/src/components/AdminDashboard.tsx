import { useEffect, useState, MouseEvent } from 'react';
import {
	Users, BookOpen, ClipboardCheck, Building2, Zap,
	Trophy, Star, ArrowUpRight, Timer, BellRing, Server,
	MoreHorizontal, Cpu, HardDrive, UserPlus, FilePlus, Megaphone, Shield
} from 'lucide-react';
import { useTranslation } from 'react-i18next'; // <--- ВАЖНО

// --- 1. АНИМАЦИЯ ЦИФР ---
const AnimatedCounter = ({ end, duration = 2000 }: { end: number, duration?: number }) => {
	const [count, setCount] = useState(0);
	useEffect(() => {
		let startTimestamp: number | null = null;
		const step = (timestamp: number) => {
			if (!startTimestamp) startTimestamp = timestamp;
			const progress = Math.min((timestamp - startTimestamp) / duration, 1);
			setCount(Math.floor(progress * end));
			if (progress < 1) window.requestAnimationFrame(step);
		};
		window.requestAnimationFrame(step);
	}, [end, duration]);
	return <span>{count.toLocaleString()}</span>;
};

// --- 2. 3D TILT КАРТОЧКА ---
const TiltStatCard = ({ card, index }: any) => {
	const [rotate, setRotate] = useState({ x: 0, y: 0 });

	const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
		const div = e.currentTarget;
		const box = div.getBoundingClientRect();
		const x = e.clientX - box.left;
		const y = e.clientY - box.top;
		const centerX = box.width / 2;
		const centerY = box.height / 2;
		const rotateX = (y - centerY) / 10;
		const rotateY = (centerX - x) / 10;
		setRotate({ x: rotateX, y: rotateY });
	};

	const onMouseLeave = () => {
		setRotate({ x: 0, y: 0 });
	};

	return (
		<div
			onMouseMove={onMouseMove}
			onMouseLeave={onMouseLeave}
			className="relative group perspective-1000"
			style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.1}s backwards` }}
		>
			<div
				className={`
					relative overflow-hidden rounded-[1.5rem] p-5
					bg-white/80 backdrop-blur-xl border border-white/60
					shadow-xl shadow-slate-200/40 transition-all duration-100 ease-out
					hover:shadow-2xl hover:shadow-indigo-500/20 hover:border-white hover:z-50
				`}
				style={{
					transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1, 1, 1)`,
				}}
			>
				<div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br ${card.color}`}></div>
				<card.icon
					className={`absolute -right-4 -bottom-4 text-slate-100 group-hover:text-${card.baseColor}-50 transition-all duration-500 transform group-hover:scale-110 group-hover:-rotate-12`}
					size={80} strokeWidth={1.5}
				/>
				<div className="relative z-10 flex justify-between items-start">
					<div>
						<p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{card.title}</p>
						<h3 className="text-3xl font-black text-slate-800 tracking-tight">
							<AnimatedCounter end={card.value} />
						</h3>
						{card.percent && (
							<div className={`flex items-center gap-1 mt-2 text-xs font-bold ${card.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
								<span className={`px-1.5 py-0.5 rounded-md ${card.trend === 'up' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
									{card.percent}
								</span>
								<span className="text-slate-400 font-medium">{card.suffix}</span>
							</div>
						)}
					</div>
					<div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br ${card.color}`}>
						<card.icon size={18} strokeWidth={2.5} />
					</div>
				</div>
			</div>
		</div>
	);
};

// --- 3. COUNTDOWN WIDGET ---
const CountdownWidget = () => {
	const { t } = useTranslation();
	return (
		<div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-6 text-white shadow-xl h-full flex flex-col justify-between group">
			<div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-colors"></div>
			<div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/30 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

			<div className="relative z-10 flex justify-between items-start">
				<div>
					<div className="flex items-center gap-2 mb-2">
						<span className="px-2 py-0.5 rounded-md bg-white/20 text-xs font-bold border border-white/10 flex items-center gap-1">
							<Timer size={12} /> {t('dashboard.before_exam').split(':')[0]}
						</span>
					</div>
					<h3 className="text-2xl font-black leading-tight">{t('dashboard.final_gat')}</h3>
					<p className="text-indigo-200 text-sm font-medium">{t('dashboard.before_exam')}</p>
				</div>
				<div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 animate-pulse">
					<span className="text-2xl">🔥</span>
				</div>
			</div>

			<div className="relative z-10 grid grid-cols-4 gap-2 mt-6">
				{[{ val: "142", label: t('dashboard.days') }, { val: "08", label: t('dashboard.hours') }, { val: "45", label: t('dashboard.min') }, { val: "12", label: t('dashboard.sec') }].map((item, i) => (
					<div key={i} className="bg-black/20 backdrop-blur-sm rounded-xl p-2 text-center border border-white/5">
						<div className="text-lg font-bold font-mono">{item.val}</div>
						<div className="text-[9px] text-indigo-200 uppercase tracking-wider">{item.label}</div>
					</div>
				))}
			</div>
		</div>
	);
};

// --- 4. SCORE DISTRIBUTION ---
const ScoreDistribution = () => {
	const { t } = useTranslation();
	const bars = [
		{ range: "0-20", h: 5, count: 12 }, { range: "21-40", h: 15, count: 45 }, { range: "41-60", h: 35, count: 120 },
		{ range: "61-80", h: 80, count: 450 }, { range: "81-100", h: 55, count: 210 },
	];
	return (
		<div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 h-full flex flex-col">
			<div className="flex items-center justify-between mb-6">
				<h3 className="font-bold text-lg text-slate-800">{t('dashboard.score_dist')}</h3>
				<MoreHorizontal size={20} className="text-slate-400 cursor-pointer hover:text-indigo-600" />
			</div>
			<div className="flex-1 flex items-end justify-between gap-4 px-2">
				{bars.map((bar, i) => (
					<div key={i} className="flex flex-col items-center gap-2 w-full group">
						<div className="relative w-full bg-slate-100 rounded-t-xl overflow-hidden flex items-end h-32">
							<div className={`w-full rounded-t-xl transition-all duration-700 ease-out group-hover:opacity-90 relative ${i === 3 ? 'bg-gradient-to-t from-emerald-500 to-teal-400' : 'bg-gradient-to-t from-indigo-500 to-blue-400'}`} style={{ height: `${bar.h}%` }}>
								<div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">{bar.count}</div>
							</div>
						</div>
						<span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">{bar.range}</span>
					</div>
				))}
			</div>
		</div>
	);
};

// --- 5. RESOURCE MONITOR ---
const ResourceCircle = ({ percent, color, icon: Icon, label }: any) => {
	const radius = 30;
	const circumference = 2 * Math.PI * radius;
	const strokeDashoffset = circumference - (percent / 100) * circumference;

	return (
		<div className="flex flex-col items-center gap-2 group cursor-default">
			<div className="relative w-24 h-24 flex items-center justify-center">
				<svg className="w-full h-full transform -rotate-90 drop-shadow-lg">
					<circle cx="48" cy="48" r={radius} stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
					<circle
						cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent"
						strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
						className={`text-${color}-500 transition-all duration-1000 ease-out`}
					/>
				</svg>
				<div className={`absolute inset-0 flex items-center justify-center text-${color}-500 bg-${color}-50 rounded-full w-12 h-12 m-auto group-hover:scale-110 transition-transform`}>
					<Icon size={20} />
				</div>
			</div>
			<div className="text-center">
				<h4 className="text-xl font-black text-slate-700">{percent}%</h4>
				<p className="text-xs font-bold text-slate-400 uppercase">{label}</p>
			</div>
		</div>
	);
};

const ResourcePulse = () => {
	const { t } = useTranslation();
	return (
		<div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 h-full">
			<div className="flex items-center justify-between mb-6">
				<h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
					<Server size={18} className="text-blue-500" /> {t('dashboard.server_status')}
				</h3>
				<span className="flex h-2 w-2 relative">
					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
					<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
				</span>
			</div>
			<div className="flex justify-around items-center">
				<ResourceCircle percent={42} color="indigo" icon={Cpu} label={t('dashboard.cpu')} />
				<ResourceCircle percent={65} color="purple" icon={HardDrive} label={t('dashboard.ram')} />
				<ResourceCircle percent={28} color="emerald" icon={Server} label={t('dashboard.storage')} />
			</div>
		</div>
	);
};

// --- 6. QUICK ACTIONS ---
const QuickActions = () => {
	const { t } = useTranslation();
	const actions = [
		{ label: t('dashboard.actions.create_test'), icon: FilePlus, color: "from-blue-500 to-indigo-600", shadow: "shadow-blue-500/30" },
		{ label: t('dashboard.actions.add_student'), icon: UserPlus, color: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-500/30" },
		{ label: t('dashboard.actions.broadcast'), icon: Megaphone, color: "from-orange-500 to-amber-600", shadow: "shadow-orange-500/30" },
		{ label: t('dashboard.actions.security'), icon: Shield, color: "from-red-500 to-rose-600", shadow: "shadow-red-500/30" },
	];

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-full">
			{actions.map((act, i) => (
				<button key={i} className={`
					group relative overflow-hidden rounded-2xl p-4 flex flex-col items-center justify-center gap-3
					bg-white border border-transparent hover:border-white/50 transition-all duration-300
					shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-95
				`}>
					<div className={`
						absolute inset-0 bg-gradient-to-br ${act.color} opacity-0 group-hover:opacity-10 transition-opacity
					`}></div>

					<div className={`
						w-12 h-12 rounded-xl bg-gradient-to-br ${act.color} flex items-center justify-center text-white
						shadow-lg ${act.shadow} group-hover:scale-110 group-hover:rotate-6 transition-all duration-300
					`}>
						<act.icon size={22} strokeWidth={2} />
					</div>
					<span className="font-bold text-slate-700 text-sm group-hover:text-slate-900 text-center leading-tight">{act.label}</span>
				</button>
			))}
		</div>
	);
};

// --- 7. LIVE FEED ---
const LiveFeed = () => {
	const { t } = useTranslation();
	const events = [
		{ text: "Алишер (11А) завершил тест 'Math Final'", time: "2 мин назад", type: "success" },
		{ text: "Новая школа 'Лицей №1' добавлена", time: "15 мин назад", type: "info" },
		{ text: "Сбой загрузки PDF у пользователя Zafar", time: "42 мин назад", type: "error" },
	];
	return (
		<div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 h-full flex flex-col">
			<div className="flex items-center justify-between mb-4">
				<h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
					<BellRing size={18} className="text-orange-500 fill-orange-500" /> {t('dashboard.live_feed')}
				</h3>
			</div>
			<div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
				{events.map((ev, i) => (
					<div key={i} className="flex gap-3 items-start group">
						<div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${ev.type === 'success' ? 'bg-emerald-500' : ev.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
						<div>
							<p className="text-sm text-slate-700 font-medium leading-tight group-hover:text-indigo-600 transition-colors">{ev.text}</p>
							<p className="text-[10px] text-slate-400 font-semibold mt-1">{ev.time}</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};


// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const AdminDashboard = () => {
	const { t } = useTranslation(); // Инициализация

	const cards = [
		{ title: t('dashboard.cards.total_schools'), value: 12, percent: "+2", trend: "up", icon: Building2, color: "from-blue-500 to-indigo-500", baseColor: "blue", suffix: t('dashboard.cards.month') },
		{ title: t('dashboard.cards.total_students'), value: 8730, percent: "+12%", trend: "up", icon: Users, color: "from-purple-500 to-pink-500", baseColor: "purple", suffix: t('dashboard.cards.month') },
		{ title: t('dashboard.cards.subjects'), value: 33, percent: "0%", trend: "neutral", icon: BookOpen, color: "from-emerald-400 to-teal-400", baseColor: "teal", suffix: t('dashboard.cards.month') },
		{ title: t('dashboard.cards.exams'), value: 4064, percent: "+150", trend: "up", icon: ClipboardCheck, color: "from-orange-400 to-amber-400", baseColor: "orange", suffix: t('dashboard.cards.month') },
		{ title: t('dashboard.cards.system_status'), value: 99, percent: "Stable", trend: "up", icon: Zap, color: "from-cyan-500 to-blue-500", baseColor: "cyan", suffix: t('dashboard.cards.month') },
	];

	const topSchools = [
		{ name: "Presidential School", students: 1250, rating: 98 },
		{ name: "Lyceum for Gifted", students: 980, rating: 92 },
		{ name: "International School", students: 850, rating: 89 },
	];

	return (
		<div className="w-full relative pb-20">
			{/* ФОН */}
			<div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40"></div>

			{/* ЗАГОЛОВОК */}
			<div className="mb-8 mt-2 animate-fade-in-up">
				<div className="flex items-center gap-2 mb-1">
					<span className="flex h-2 w-2 relative">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
						<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
					</span>
					<span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">{t('dashboard.live_system')}</span>
				</div>
				<h1 className="text-4xl font-black text-slate-800">
					{t('dashboard.mission_control').split(' ')[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">{t('dashboard.mission_control').split(' ').slice(1).join(' ')}</span>
				</h1>
			</div>

			{/* 1. ВЕРХНИЕ СТАТЫ */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
				{cards.map((card, index) => <TiltStatCard key={index} card={card} index={index} />)}
			</div>

			{/* 2. ТАЙМЕР + РАСПРЕДЕЛЕНИЕ */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 h-auto lg:h-80">
				<div className="lg:col-span-1 animate-fade-in-up" style={{ animationDelay: '0.2s' }}><CountdownWidget /></div>
				<div className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '0.3s' }}><ScoreDistribution /></div>
			</div>

			{/* 3. НОВЫЙ БЛОК: СИСТЕМА И ДЕЙСТВИЯ */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 h-auto lg:h-64">
				<div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}><ResourcePulse /></div>
				<div className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}><QuickActions /></div>
			</div>

			{/* 4. НИЗ: СПИСКИ */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
				{/* Топ Школ */}
				<div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 flex flex-col animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
					<div className="flex justify-between items-center mb-6">
						<h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Trophy size={18} className="text-yellow-500" /> {t('dashboard.top_schools')}</h3>
					</div>
					<div className="overflow-y-auto custom-scrollbar pr-2 space-y-2">
						{topSchools.map((school, i) => (
							<div key={i} className="flex items-center justify-between p-3 hover:bg-white rounded-xl transition-all duration-300 border border-transparent hover:border-slate-100 hover:shadow-md">
								<div className="flex items-center gap-4">
									<div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</div>
									<div><h6 className="text-sm font-bold text-slate-700">{school.name}</h6><p className="text-[10px] text-slate-400 font-medium">{school.students} {t('dashboard.students_count')}</p></div>
								</div>
								<span className="text-sm font-black text-slate-800">{school.rating}%</span>
							</div>
						))}
					</div>
				</div>

				{/* Live Feed */}
				<div className="animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
					<LiveFeed />
				</div>

				{/* Топ Предметов */}
				<div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 flex flex-col animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
					<div className="flex justify-between items-center mb-6">
						<h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Star size={18} className="text-emerald-500" /> {t('dashboard.top_subjects')}</h3>
					</div>
					<div className="flex items-center justify-center h-full text-slate-400 text-sm">
						{/* Пока оставим заглушку, но переведем позже, если будет график */}
						Chart Coming Soon...
					</div>
				</div>
			</div>
		</div>
	);
};

export default AdminDashboard;