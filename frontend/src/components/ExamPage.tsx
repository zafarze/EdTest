import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
	Clock,
	ChevronRight,
	ChevronLeft,
	Flag,
	CheckCircle,
	AlertCircle,
	LogOut,
	Save
} from 'lucide-react';

// Моковые данные для примера (потом заменим на API)
const mockExam = {
	title: "Mathematics Final: Algebra & Geometry",
	duration: 45 * 60, // 45 минут в секундах
	questions: [
		{ id: 1, text: "Решите уравнение: 2x + 5 = 15", options: ["x = 5", "x = 10", "x = 2", "x = 7.5"] },
		{ id: 2, text: "Чему равна площадь круга с радиусом 3?", options: ["9π", "6π", "3π", "12π"] },
		{ id: 3, text: "Какой угол называется прямым?", options: ["90 градусов", "180 градусов", "45 градусов", "0 градусов"] },
		{ id: 4, text: "Вычислите: 15% от 200", options: ["30", "20", "15", "40"] },
		{ id: 5, text: "Корнем уравнения x^2 = 49 является:", options: ["7 и -7", "Только 7", "Только -7", "49"] },
	]
};

const ExamPage = () => {
	const { id } = useParams();
	const navigate = useNavigate();

	// Состояния
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<number, number>>({}); // { questionId: optionIndex }
	const [flagged, setFlagged] = useState<Record<number, boolean>>({}); // Отмеченные вопросы
	const [timeLeft, setTimeLeft] = useState(mockExam.duration);

	// Таймер
	useEffect(() => {
		const timer = setInterval(() => {
			setTimeLeft((prev) => {
				if (prev <= 0) {
					clearInterval(timer);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(timer);
	}, []);

	// Форматирование времени (MM:SS)
	const formatTime = (seconds: number) => {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
	};

	const handleAnswer = (optionIndex: number) => {
		setAnswers({ ...answers, [currentQuestionIndex]: optionIndex });
	};

	const toggleFlag = () => {
		setFlagged({ ...flagged, [currentQuestionIndex]: !flagged[currentQuestionIndex] });
	};

	const progress = ((Object.keys(answers).length) / mockExam.questions.length) * 100;
	const currentQ = mockExam.questions[currentQuestionIndex];

	return (
		<div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 selection:bg-indigo-100 selection:text-indigo-700">

			{/* --- HEADER (Экзаменационный) --- */}
			<header className="h-20 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
				<div className="flex items-center gap-4">
					<div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200">
						{id}
					</div>
					<div>
						<h1 className="font-bold text-lg leading-tight text-slate-800">{mockExam.title}</h1>
						<div className="flex items-center gap-2 text-xs font-medium text-slate-400">
							<span>Вопрос {currentQuestionIndex + 1} из {mockExam.questions.length}</span>
							<span className="w-1 h-1 rounded-full bg-slate-300"></span>
							<span className={timeLeft < 300 ? "text-red-500 animate-pulse" : "text-slate-500"}>
								Осталось: {formatTime(timeLeft)}
							</span>
						</div>
					</div>
				</div>

				{/* Прогресс бар (Центр) */}
				<div className="hidden md:flex flex-col w-1/3 gap-1.5">
					<div className="flex justify-between text-xs font-bold text-slate-400">
						<span>Прогресс</span>
						<span>{Math.round(progress)}%</span>
					</div>
					<div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
						<div
							className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
							style={{ width: `${progress}%` }}
						></div>
					</div>
				</div>

				<button
					onClick={() => navigate('/')}
					className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-bold"
				>
					<LogOut size={18} />
					<span className="hidden sm:inline">Выйти</span>
				</button>
			</header>

			{/* --- MAIN CONTENT --- */}
			<main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

				{/* ЛЕВАЯ КОЛОНКА: Вопрос (Занимает 8/12) */}
				<div className="lg:col-span-9 flex flex-col gap-6">

					{/* Карточка вопроса */}
					<div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex-1 relative overflow-hidden">
						{/* Декоративный фон */}
						<div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none"></div>

						<div className="relative z-10">
							<div className="flex justify-between items-start mb-6">
								<span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold uppercase tracking-wider">
									Вопрос №{currentQuestionIndex + 1}
								</span>
								<button
									onClick={toggleFlag}
									className={`flex items-center gap-2 text-sm font-bold transition-colors ${flagged[currentQuestionIndex] ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}`}
								>
									<Flag size={18} fill={flagged[currentQuestionIndex] ? "currentColor" : "none"} />
									{flagged[currentQuestionIndex] ? 'Отмечен' : 'Отметить'}
								</button>
							</div>

							<h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-8 leading-snug">
								{currentQ.text}
							</h2>

							<div className="space-y-3">
								{currentQ.options.map((option, idx) => {
									const isSelected = answers[currentQuestionIndex] === idx;
									return (
										<button
											key={idx}
											onClick={() => handleAnswer(idx)}
											className={`
                          w-full text-left p-5 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group
                          ${isSelected
													? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-1 ring-indigo-200'
													: 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50'
												}
                        `}
										>
											<div className="flex items-center gap-4">
												<div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors
                            ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-slate-400 group-hover:border-indigo-400 group-hover:text-indigo-500'}
                          `}>
													{String.fromCharCode(65 + idx)}
												</div>
												<span className={`text-lg font-medium ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>
													{option}
												</span>
											</div>
											{isSelected && <CheckCircle className="text-indigo-600 animate-in zoom-in duration-200" size={24} />}
										</button>
									)
								})}
							</div>
						</div>
					</div>

					{/* Навигация (Bottom) */}
					<div className="flex justify-between items-center">
						<button
							disabled={currentQuestionIndex === 0}
							onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
							className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-all"
						>
							<ChevronLeft size={20} />
							Назад
						</button>

						{currentQuestionIndex === mockExam.questions.length - 1 ? (
							<button className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold hover:shadow-lg hover:shadow-emerald-500/30 flex items-center gap-2 transition-all transform hover:-translate-y-0.5">
								<Save size={20} /> Завершить экзамен
							</button>
						) : (
							<button
								onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
								className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
							>
								Далее
								<ChevronRight size={20} />
							</button>
						)}
					</div>

				</div>

				{/* ПРАВАЯ КОЛОНКА: Навигатор (Занимает 4/12) */}
				<div className="lg:col-span-3">
					<div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 sticky top-24">
						<h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
							<Clock size={18} className="text-slate-400" />
							Навигация
						</h3>

						<div className="grid grid-cols-5 gap-2">
							{mockExam.questions.map((_, idx) => {
								const isAnswered = answers[idx] !== undefined;
								const isCurrent = currentQuestionIndex === idx;
								const isFlagged = flagged[idx];

								let baseClass = "h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all border-2 ";

								if (isCurrent) baseClass += "border-indigo-600 bg-white text-indigo-600 shadow-md ring-2 ring-indigo-100 ";
								else if (isFlagged) baseClass += "border-amber-400 bg-amber-50 text-amber-600 ";
								else if (isAnswered) baseClass += "border-transparent bg-indigo-600 text-white ";
								else baseClass += "border-transparent bg-slate-100 text-slate-400 hover:bg-slate-200 ";

								return (
									<button
										key={idx}
										onClick={() => setCurrentQuestionIndex(idx)}
										className={baseClass}
									>
										{isFlagged ? <Flag size={14} fill="currentColor" /> : idx + 1}
									</button>
								)
							})}
						</div>

						<div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
							<div className="flex items-center gap-3 text-xs font-medium text-slate-500">
								<div className="w-3 h-3 rounded-full bg-indigo-600"></div> Решен
							</div>
							<div className="flex items-center gap-3 text-xs font-medium text-slate-500">
								<div className="w-3 h-3 rounded-full border-2 border-indigo-600"></div> Текущий
							</div>
							<div className="flex items-center gap-3 text-xs font-medium text-slate-500">
								<div className="w-3 h-3 rounded-full bg-amber-400"></div> На проверку
							</div>
							<div className="flex items-center gap-3 text-xs font-medium text-slate-500">
								<div className="w-3 h-3 rounded-full bg-slate-200"></div> Не решен
							</div>
						</div>
					</div>
				</div>

			</main>
		</div>
	);
};

export default ExamPage;