import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Award, TrendingUp, Info, HelpCircle, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MonitoringPerformance = () => {
	const { t } = useTranslation();
	// Состояние переключателя: 'quality' (Качество) или 'success' (Успеваемость)
	const [metricType, setMetricType] = useState<'quality' | 'success'>('quality');

	// MOCK DATA (Данные)
	const data = [
		{ name: '11А', quality: 45, success: 92 },
		{ name: '11Б', quality: 30, success: 85 },
		{ name: '10А', quality: 55, success: 98 },
		{ name: '10Б', quality: 25, success: 70 },
		{ name: '9А', quality: 40, success: 90 },
		{ name: '9Б', quality: 35, success: 88 },
		{ name: '8А', quality: 60, success: 100 },
	];

	// Цвета для графиков
	const activeColor = metricType === 'quality' ? '#6366f1' : '#10b981'; // Indigo vs Emerald

	return (
		<div className="w-full relative pb-20">
			{/* ФОН (как у вас в Rating) */}
			<div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40"></div>

			{/* ЗАГОЛОВОК */}
			<div className="mb-8 animate-fade-in-up">
				<h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
					<TrendingUp className="text-indigo-600" />
					Мониторинг успеваемости
				</h1>
				<p className="text-slate-500 font-medium mt-1">
					Анализ показателей согласно стандартам ГИС
				</p>
			</div>

			{/* --- ПЕРЕКЛЮЧАТЕЛЬ (TABS) --- */}
			<div className="bg-white/60 backdrop-blur-xl border border-white/60 p-1.5 rounded-2xl inline-flex mb-8 shadow-lg shadow-slate-200/40 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
				<button
					onClick={() => setMetricType('quality')}
					className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${metricType === 'quality'
							? 'bg-indigo-600 text-white shadow-md transform scale-105'
							: 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
						}`}
				>
					<Award size={18} />
					<span>Качество знаний</span>
					<span className="hidden sm:inline opacity-70 ml-1 text-xs font-normal">(Сифати таҳсилот)</span>
				</button>
				<button
					onClick={() => setMetricType('success')}
					className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${metricType === 'success'
							? 'bg-emerald-500 text-white shadow-md transform scale-105'
							: 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
						}`}
				>
					<TrendingUp size={18} />
					<span>Успеваемость</span>
					<span className="hidden sm:inline opacity-70 ml-1 text-xs font-normal">(Сифати азхудкуни)</span>
				</button>
			</div>

			{/* --- KPI КАРТОЧКИ --- */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
				{/* Большая цветная карточка */}
				<div
					className={`col-span-2 rounded-[2rem] p-8 text-white relative overflow-hidden flex flex-col justify-center shadow-xl transition-all duration-500 animate-fade-in-up`}
					style={{
						animationDelay: '0.2s',
						background: metricType === 'quality'
							? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
							: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)'
					}}
				>
					<div className="relative z-10">
						<div className="flex items-center gap-2 opacity-80 mb-3">
							<Info size={18} />
							<span className="text-xs font-bold uppercase tracking-wider">Описание показателя</span>
						</div>
						<h2 className="text-3xl sm:text-4xl font-black mb-3">
							{metricType === 'quality' ? 'Качество знаний' : 'Общая успеваемость'}
						</h2>
						<p className="opacity-90 max-w-lg text-sm sm:text-base leading-relaxed font-medium">
							{metricType === 'quality'
								? 'Показатель "Сифати таҳсилот". Процент учащихся, получивших оценки "4" и "5" (или выше 70 баллов).'
								: 'Показатель "Сифати азхудкуни". Процент учащихся, усвоивших программу и не имеющих неудовлетворительных оценок.'}
						</p>
					</div>
					{/* Декор фона */}
					<div className="absolute right-0 top-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 mix-blend-overlay"></div>
					<div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/3"></div>
				</div>

				{/* Карточка со средней цифрой */}
				<div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-xl shadow-slate-200/40 flex flex-col items-center justify-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
					<span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Среднее по школе</span>
					<div className={`text-7xl font-black tracking-tight ${metricType === 'quality' ? 'text-indigo-600' : 'text-emerald-500'}`}>
						{metricType === 'quality' ? '39%' : '87%'}
					</div>
					<div className={`mt-4 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${metricType === 'quality' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
						<TrendingUp size={14} />
						{metricType === 'quality' ? '+2.4% к прошлой неделе' : 'Стабильно'}
					</div>
				</div>
			</div>

			{/* --- ГРАФИК --- */}
			<div className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 h-96 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
				<div className="flex justify-between items-center mb-6 px-2">
					<h3 className="font-bold text-lg text-slate-800">Динамика по классам</h3>
					<button className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
						<FileText size={16} /> Отчет
					</button>
				</div>

				<ResponsiveContainer width="100%" height="85%">
					<BarChart data={data} barSize={40}>
						<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
						<XAxis
							dataKey="name"
							axisLine={false}
							tickLine={false}
							tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }}
							dy={10}
						/>
						<YAxis
							axisLine={false}
							tickLine={false}
							tick={{ fill: '#64748b', fontSize: 12 }}
							unit="%"
						/>
						<Tooltip
							cursor={{ fill: '#f1f5f9', radius: 8 }}
							contentStyle={{
								borderRadius: '16px',
								border: 'none',
								boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
								padding: '12px 16px',
								fontWeight: 'bold',
								color: '#1e293b'
							}}
							itemStyle={{ color: activeColor }}
						/>
						<Bar
							dataKey={metricType}
							radius={[12, 12, 0, 0]}
							animationDuration={1500}
						>
							{data.map((_, index) => (
								<Cell
									key={`cell-${index}`}
									fill={activeColor}
									className="transition-all duration-500 hover:opacity-80"
								/>
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
};

export default MonitoringPerformance;