import React, { useState } from 'react';
import {
	Trophy, Medal, Crown, Search, Filter,
	ArrowUp, ArrowDown, Minus, School, Users
} from 'lucide-react';

// --- ДАННЫЕ (MOCK DATA) ---
const initialStudents = [
	{ id: 1, name: "Алишер Валиев", school: "Presidential School", score: 985, avatar: "bg-indigo-500", trend: "up" },
	{ id: 2, name: "Мадина Зоирова", school: "Lyceum for Gifted", score: 972, avatar: "bg-pink-500", trend: "up" },
	{ id: 3, name: "Фаррух Исмоилов", school: "International School", score: 950, avatar: "bg-emerald-500", trend: "down" },
	{ id: 4, name: "Зарина Каримова", school: "Gymnasium №1", score: 930, avatar: "bg-orange-500", trend: "same" },
	{ id: 5, name: "Джамшед Рахимов", school: "Private 'Knowledge'", score: 915, avatar: "bg-blue-500", trend: "up" },
	{ id: 6, name: "Самира Алиева", school: "Lyceum №2", score: 890, avatar: "bg-violet-500", trend: "down" },
];

const initialSchools = [
	{ id: 1, name: "Presidential School", students: 1250, score: 98, avatar: "bg-blue-600", trend: "up" },
	{ id: 2, name: "Lyceum for Gifted", students: 980, score: 95, avatar: "bg-purple-600", trend: "same" },
	{ id: 3, name: "International School", students: 850, score: 91, avatar: "bg-emerald-600", trend: "up" },
	{ id: 4, name: "Gymnasium №1", students: 720, score: 88, avatar: "bg-amber-600", trend: "down" },
];

// --- КОМПОНЕНТ ПОДИУМА (ТОП 3) ---
const Podium = ({ winners, type }: { winners: any[], type: string }) => {
	return (
		<div className="flex justify-center items-end gap-4 mb-12 h-64 sm:h-80 px-4">
			{/* 2 МЕСТО (СЕРЕБРО) */}
			<div className="relative flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
				<div className="mb-2 flex flex-col items-center">
					<div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-slate-300 shadow-xl flex items-center justify-center text-white font-bold text-xl ${winners[1].avatar} relative`}>
						{winners[1].name.charAt(0)}
						<div className="absolute -bottom-3 bg-slate-300 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white">2nd</div>
					</div>
					<p className="mt-3 font-bold text-slate-700 text-sm text-center max-w-[100px] leading-tight">{winners[1].name}</p>
					<p className="text-xs text-slate-400 font-bold">{type === 'students' ? `${winners[1].score} pts` : `${winners[1].score}%`}</p>
				</div>
				<div className="w-20 sm:w-24 bg-gradient-to-t from-slate-300 to-slate-100 rounded-t-xl h-32 sm:h-40 shadow-lg flex items-end justify-center pb-4 opacity-90 backdrop-blur-sm border-t border-white/50">
					<Medal className="text-slate-400 drop-shadow-sm" size={32} />
				</div>
			</div>

			{/* 1 МЕСТО (ЗОЛОТО) - ВЫШЕ ВСЕХ */}
			<div className="relative flex flex-col items-center z-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
				<div className="absolute -top-10 animate-bounce">
					<Crown size={32} className="text-yellow-400 fill-yellow-400 drop-shadow-lg" />
				</div>
				<div className="mb-2 flex flex-col items-center">
					<div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-yellow-400 shadow-2xl flex items-center justify-center text-white font-bold text-2xl ${winners[0].avatar} relative`}>
						{winners[0].name.charAt(0)}
						<div className="absolute -bottom-3 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-3 py-0.5 rounded-full border border-white shadow-sm">1st</div>
					</div>
					<p className="mt-3 font-bold text-slate-800 text-base text-center max-w-[120px] leading-tight">{winners[0].name}</p>
					<p className="text-xs text-yellow-600 font-bold bg-yellow-50 px-2 py-0.5 rounded-md mt-1">{type === 'students' ? `${winners[0].score} pts` : `${winners[0].score}%`}</p>
				</div>
				<div className="w-24 sm:w-28 bg-gradient-to-t from-yellow-300 to-yellow-100 rounded-t-xl h-40 sm:h-52 shadow-xl flex items-end justify-center pb-6 opacity-90 backdrop-blur-sm border-t border-white/50 relative overflow-hidden">
					{/* Блик на золоте */}
					<div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
					<Trophy className="text-yellow-500 drop-shadow-md" size={40} />
				</div>
			</div>

			{/* 3 МЕСТО (БРОНЗА) */}
			<div className="relative flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
				<div className="mb-2 flex flex-col items-center">
					<div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-orange-300 shadow-xl flex items-center justify-center text-white font-bold text-xl ${winners[2].avatar} relative`}>
						{winners[2].name.charAt(0)}
						<div className="absolute -bottom-3 bg-orange-300 text-orange-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white">3rd</div>
					</div>
					<p className="mt-3 font-bold text-slate-700 text-sm text-center max-w-[100px] leading-tight">{winners[2].name}</p>
					<p className="text-xs text-slate-400 font-bold">{type === 'students' ? `${winners[2].score} pts` : `${winners[2].score}%`}</p>
				</div>
				<div className="w-20 sm:w-24 bg-gradient-to-t from-orange-300 to-orange-100 rounded-t-xl h-24 sm:h-32 shadow-lg flex items-end justify-center pb-4 opacity-90 backdrop-blur-sm border-t border-white/50">
					<Medal className="text-orange-500 drop-shadow-sm" size={32} />
				</div>
			</div>
		</div>
	);
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const Rating = () => {
	const [activeTab, setActiveTab] = useState<'students' | 'schools'>('students');

	const data = activeTab === 'students' ? initialStudents : initialSchools;
	const winners = data.slice(0, 3);
	const rest = data.slice(3);

	return (
		<div className="w-full relative pb-20">
			{/* ФОН */}
			<div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40"></div>

			{/* ЗАГОЛОВОК И ПЕРЕКЛЮЧАТЕЛЬ */}
			<div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 animate-fade-in-up">
				<div>
					<h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
						<Crown className="text-yellow-500 fill-yellow-500" />
						Зал Славы
					</h1>
					<p className="text-slate-500 font-medium">Лучшие из лучших в этом сезоне.</p>
				</div>

				<div className="bg-white p-1 rounded-xl shadow-md flex gap-1">
					<button
						onClick={() => setActiveTab('students')}
						className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'students' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
					>
						<Users size={16} /> Ученики
					</button>
					<button
						onClick={() => setActiveTab('schools')}
						className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'schools' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
					>
						<School size={16} /> Школы
					</button>
				</div>
			</div>

			{/* 1. ПОДИУМ */}
			<Podium winners={winners} type={activeTab} />

			{/* 2. ОСТАЛЬНОЙ СПИСОК */}
			<div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
				<div className="flex items-center justify-between mb-4 px-2">
					<h3 className="font-bold text-lg text-slate-800">Остальные участники</h3>
					<button className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400">
						<Filter size={18} />
					</button>
				</div>

				<div className="space-y-2">
					{rest.map((item, index) => (
						<div key={item.id} className="group flex items-center justify-between p-4 bg-white/50 border border-white rounded-2xl hover:bg-white hover:shadow-lg hover:scale-[1.01] transition-all duration-200">
							<div className="flex items-center gap-4">
								<span className="font-black text-slate-300 w-6 text-center text-lg group-hover:text-slate-400 transition-colors">
									{index + 4}
								</span>
								<div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${item.avatar}`}>
									{item.name.charAt(0)}
								</div>
								<div>
									<h4 className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-indigo-600 transition-colors">
										{item.name}
									</h4>
									{activeTab === 'students' && (
										<p className="text-xs text-slate-400 font-medium">{item.school}</p>
									)}
								</div>
							</div>

							<div className="flex items-center gap-6">
								{/* Тренд (Рост/Падение) */}
								<div className="hidden sm:flex items-center gap-1">
									{item.trend === 'up' && <ArrowUp size={16} className="text-emerald-500" />}
									{item.trend === 'down' && <ArrowDown size={16} className="text-rose-500" />}
									{item.trend === 'same' && <Minus size={16} className="text-slate-300" />}
								</div>

								{/* Баллы */}
								<div className="text-right">
									<span className="block font-black text-slate-800 text-lg">
										{item.score} <span className="text-xs text-slate-400 font-bold uppercase">{activeTab === 'students' ? 'pts' : '%'}</span>
									</span>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

		</div>
	);
};

export default Rating;