import React from 'react';
import { Building2, Sparkles, TrendingUp, ChevronRight, GraduationCap } from 'lucide-react';

const FacultiesPage = () => {

	// MOCK DATA: Список факультетов с процентом совместимости (от AI)
	const faculties = [
		{ id: 1, name: "Программная Инженерия", uni: "ТНУ (Национальный)", match: 92, color: "bg-emerald-500" },
		{ id: 2, name: "Кибербезопасность", uni: "Славянский (РТСУ)", match: 88, color: "bg-teal-500" },
		{ id: 3, name: "Экономика и Финансы", uni: "Финансовый Институт", match: 65, color: "bg-yellow-500" },
		{ id: 4, name: "Международные Отношения", uni: "Министерство ИД", match: 45, color: "bg-orange-500" },
	];

	return (
		<div className="space-y-6">

			{/* AI Блок */}
			<div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg">
				<div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
				<div className="relative z-10">
					<div className="flex items-center gap-2 mb-3">
						<Sparkles className="text-yellow-300 animate-pulse" />
						<span className="font-bold text-xs uppercase tracking-wider text-indigo-200">AI Рекомендация</span>
					</div>
					<h2 className="text-3xl font-black mb-2">Твой профиль: Технарь 💻</h2>
					<p className="text-indigo-100 max-w-xl leading-relaxed">
						Судя по твоим успехам в Математике (90%) и Логике, тебе идеально подходят IT-специальности.
						Гуманитарные направления могут показаться тебе скучными.
					</p>
				</div>
			</div>

			{/* Список Факультетов */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{faculties.map((fac) => (
					<div key={fac.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
						<div className="flex justify-between items-start mb-4">
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
									<Building2 size={24} />
								</div>
								<div>
									<h3 className="font-bold text-lg text-slate-800 leading-tight">{fac.name}</h3>
									<p className="text-sm text-slate-500">{fac.uni}</p>
								</div>
							</div>
							<div className="bg-slate-50 px-3 py-1 rounded-lg text-xs font-bold text-slate-500">
								2026
							</div>
						</div>

						{/* Прогресс бар совместимости */}
						<div className="space-y-2">
							<div className="flex justify-between text-xs font-bold">
								<span className="text-slate-400">Совместимость</span>
								<span className={`${fac.match > 80 ? 'text-emerald-600' : 'text-slate-600'}`}>{fac.match}%</span>
							</div>
							<div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
								<div
									className={`h-full rounded-full ${fac.color} transition-all duration-1000`}
									style={{ width: `${fac.match}%` }}
								></div>
							</div>
						</div>

						<button className="w-full mt-6 py-3 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex justify-center items-center gap-2">
							Подробнее <ChevronRight size={16} />
						</button>
					</div>
				))}
			</div>
		</div>
	);
};

export default FacultiesPage;