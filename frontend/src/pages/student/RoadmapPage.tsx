import React from 'react';
import LearningRoadmap from '../../components/student_layout/LearningRoadmap';
import { Map, Zap } from 'lucide-react';

const RoadmapPage = () => {
	return (
		<div className="space-y-6">

			{/* Заголовок */}
			<div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
						<Map className="text-indigo-600" />
						Карта Знаний
					</h1>
					<p className="text-slate-500 text-sm mt-1">Твой персональный путь к мастерству. Исправь красные блоки, чтобы пройти дальше.</p>
				</div>
				<div className="hidden sm:flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-xl text-yellow-700 font-bold text-sm">
					<Zap size={18} />
					<span>Текущий уровень: 5</span>
				</div>
			</div>

			{/* Сама карта */}
			<div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 min-h-[500px]">
				<LearningRoadmap />
			</div>
		</div>
	);
};

export default RoadmapPage;