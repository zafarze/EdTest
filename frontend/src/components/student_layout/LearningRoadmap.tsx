import React from 'react';
import { CheckCircle, Lock, AlertCircle, Play, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

// Типы для карты
interface RoadmapNode {
	id: string;
	title: string;
	description?: string;
	status: 'completed' | 'current' | 'locked' | 'weak'; // weak - это где были ошибки
	position: 'left' | 'right' | 'center';
}

const LearningRoadmap = () => {

	// MOCK DATA: Это то, что потом будет приходить с бэкенда на основе ошибок
	const roadmapData: RoadmapNode[] = [
		{ id: '1', title: 'Основы Алгебры', status: 'completed', position: 'center', description: 'Базовые операции' },
		{ id: '2', title: 'Линейные уравнения', status: 'completed', position: 'left' },
		{ id: '3', title: 'Дроби и Пропорции', status: 'completed', position: 'right' },
		{ id: '4', title: 'Квадратные корни', status: 'weak', position: 'center', description: 'Ты допустил 3 ошибки здесь!' }, // 🔥 ПРОБЛЕМНАЯ ТЕМА
		{ id: '5', title: 'Тригонометрия', status: 'locked', position: 'left' },
		{ id: '6', title: 'Функции', status: 'locked', position: 'right' },
		{ id: '7', title: 'Финальный тест', status: 'locked', position: 'center' },
	];

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'completed': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
			case 'weak': return 'bg-red-100 text-red-600 border-red-200 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'; // Мигает красным
			case 'current': return 'bg-indigo-100 text-indigo-600 border-indigo-200 ring-2 ring-indigo-400 ring-offset-2';
			default: return 'bg-slate-100 text-slate-400 border-slate-200 grayscale';
		}
	};

	const getIcon = (status: string) => {
		switch (status) {
			case 'completed': return <CheckCircle size={18} />;
			case 'weak': return <AlertCircle size={18} />;
			case 'current': return <Play size={18} fill="currentColor" />;
			default: return <Lock size={18} />;
		}
	};

	return (
		<div className="relative py-10 flex flex-col items-center">

			{/* ЦЕНТРАЛЬНАЯ ЛИНИЯ (СТВОЛ) */}
			<div className="absolute top-0 bottom-0 left-1/2 w-1.5 bg-slate-200 -translate-x-1/2 rounded-full z-0"></div>

			{roadmapData.map((node, index) => (
				<motion.div
					key={node.id}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: index * 0.1 }}
					className={`relative z-10 flex w-full mb-12 ${node.position === 'left' ? 'justify-end pr-[50%] pl-4' :
							node.position === 'right' ? 'justify-start pl-[50%] pr-4' :
								'justify-center'
						}`}
				>
					{/* ЛИНИИ-ВЕТКИ (Связи с центром) */}
					{node.position !== 'center' && (
						<div className={`absolute top-1/2 w-[calc(50%-2rem)] h-1 bg-slate-200 -z-10
                            ${node.position === 'left' ? 'right-1/2 rounded-tl-xl border-t-4 border-l-0' : 'left-1/2 rounded-tr-xl'}
                        `}></div>
					)}

					{/* КАРТОЧКА ТЕМЫ */}
					<div className={`
                        relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all cursor-pointer hover:scale-105 duration-200
                        ${getStatusColor(node.status)}
                        ${node.position === 'center' ? 'w-64 text-center' : 'w-48'}
                    `}>
						{/* Иконка статуса */}
						<div className="mb-2 p-2 bg-white/50 rounded-full backdrop-blur-sm">
							{getIcon(node.status)}
						</div>

						<h4 className="font-black text-sm uppercase tracking-wide">{node.title}</h4>

						{node.description && (
							<p className="text-[10px] mt-1 font-bold opacity-80">{node.description}</p>
						)}

						{/* Кнопка действия для слабых тем */}
						{node.status === 'weak' && (
							<button className="mt-3 bg-red-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-md hover:bg-red-600 transition-colors flex items-center gap-1">
								Исправить <ChevronRight size={12} />
							</button>
						)}
						{node.status === 'current' && (
							<button className="mt-3 bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-md hover:bg-indigo-700 transition-colors">
								Начать
							</button>
						)}
					</div>

					{/* ТОЧКА НА СТВОЛЕ (Коннектор) */}
					<div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-sm z-20
                        ${node.status === 'completed' ? 'bg-emerald-500' :
							node.status === 'weak' ? 'bg-red-500 animate-ping' : 'bg-slate-300'}
                    `}></div>
					{/* Статичная точка поверх пульсирующей для weak */}
					{node.status === 'weak' && (
						<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white bg-red-500 z-20"></div>
					)}

				</motion.div>
			))}

			{/* ФИНИШ */}
			<div className="relative z-10 bg-slate-800 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-xl border-4 border-slate-100">
				Start
			</div>
		</div>
	);
};

export default LearningRoadmap;