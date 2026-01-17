import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Интерфейс экзамена
interface Exam {
	id: number;
	title: string;
	description: string;
	time_limit: number;
}

interface DashboardProps {
	token: string;
}

const Dashboard: React.FC<DashboardProps> = ({ token }) => {
	const [exams, setExams] = useState<Exam[]>([]);
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		// Замените URL на ваш реальный бэкенд
		axios.get('http://127.0.0.1:8000/api/exams/', {
			headers: { Authorization: `JWT ${token}` }
		})
			.then(response => {
				setExams(response.data);
				setLoading(false);
			})
			.catch(error => {
				console.error("Ошибка загрузки экзаменов:", error);
				setLoading(false);
			});
	}, [token]);

	const getGradient = (id: number) => {
		const gradients = [
			"from-pink-500 to-rose-500",
			"from-blue-400 to-indigo-500",
			"from-green-400 to-emerald-500",
			"from-orange-400 to-amber-500",
			"from-purple-500 to-violet-600"
		];
		return gradients[id % gradients.length];
	};

	return (
		<div className="relative z-10">
			{/* Приветственный блок */}
			<div className="mb-10 mt-4">
				<h2 className="text-xl text-slate-500 font-medium">С возвращением! 👋</h2>
				<h1 className="text-4xl font-extrabold tracking-tight text-slate-800 mt-1">Твои Экзамены</h1>
			</div>

			{loading ? (
				<div className="flex justify-center items-center h-64">
					<div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{exams.map((exam, index) => (
						<div key={exam.id} className="group bg-white rounded-3xl p-1 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:rotate-1">
							{/* Карточка экзамена */}
							<div className={`h-32 rounded-t-[20px] bg-gradient-to-br ${getGradient(index)} flex items-center justify-center relative overflow-hidden`}>
								<div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full transform translate-x-8 -translate-y-8"></div>
								<div className="absolute bottom-0 left-0 w-16 h-16 bg-white opacity-10 rounded-full transform -translate-x-4 translate-y-4"></div>
								<span className="text-5xl drop-shadow-lg filter transform group-hover:scale-110 transition-transform duration-300">🎓</span>
							</div>

							<div className="p-6">
								<div className="flex justify-between items-center mb-3">
									<h2 className="text-xl font-bold text-slate-800 leading-tight line-clamp-1">{exam.title}</h2>
									<span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200 whitespace-nowrap">
										{exam.time_limit} мин
									</span>
								</div>
								<p className="text-slate-500 text-sm mb-6 line-clamp-2 min-h-[40px]">
									{exam.description || "Готов проверить свои знания? Жми старт!"}
								</p>

								<button
									onClick={() => navigate(`/exam/${exam.id}`)}
									className={`w-full bg-gradient-to-r ${getGradient(index)} text-white font-bold py-3 px-4 rounded-xl shadow-lg opacity-90 hover:opacity-100 transition-all active:scale-95 flex justify-center items-center gap-2`}
								>
									Начать тест 🚀
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{!loading && exams.length === 0 && (
				<div className="text-center py-20 bg-white rounded-3xl shadow-lg border border-slate-100 mt-10">
					<span className="text-6xl">🏝️</span>
					<h3 className="text-2xl font-bold text-slate-700 mt-4">Пока экзаменов нет</h3>
					<p className="text-slate-500">Отдыхай и наслаждайся жизнью!</p>
				</div>
			)}
		</div>
	);
};

export default Dashboard;