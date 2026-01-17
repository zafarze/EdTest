import React, { useState } from 'react';
import {
	Trash2,
	AlertTriangle,
	RefreshCcw,
	Database,
	History,
	Users,
	FileX,
	X,
	Loader2
} from 'lucide-react';

interface CleanupTask {
	id: string;
	title: string;
	description: string;
	lastRun: string;
	risk: 'medium' | 'high';
	icon: any;
}

const Cleanup = () => {
	const [tasks] = useState<CleanupTask[]>([
		{ id: 'old_sessions', title: "Удалить старые сессии", description: "Очистить логи входов старше 30 дней", lastRun: "2 дня назад", risk: 'medium', icon: History },
		{ id: 'temp_files', title: "Временные файлы", description: "Удалить сгенерированные PDF буклеты", lastRun: "Никогда", risk: 'medium', icon: FileX },
		{ id: 'graduated', title: "Выпускники", description: "Архивировать учеников 11 класса прошлого года", lastRun: "1 год назад", risk: 'high', icon: Users },
		{ id: 'reset_db', title: "Сброс тестовой базы", description: "Удалить все вопросы и предметы (ОПАСНО!)", lastRun: "Никогда", risk: 'high', icon: Database },
	]);

	const [activeTask, setActiveTask] = useState<CleanupTask | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [success, setSuccess] = useState(false);

	const handleExecute = () => {
		setIsProcessing(true);
		// Имитация долгого процесса
		setTimeout(() => {
			setIsProcessing(false);
			setSuccess(true);
			// Закрыть через 2 сек
			setTimeout(() => {
				setActiveTask(null);
				setSuccess(false);
			}, 1500);
		}, 2000);
	};

	return (
		<div className="w-full mt-2 pb-20">

			{/* --- ЗАГОЛОВОК --- */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 animate-fade-in-up">
				<div>
					<h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
						<div className="p-2 bg-red-100 rounded-lg text-red-600">
							<Trash2 size={24} />
						</div>
						Очистка данных
					</h1>
					<p className="text-slate-400 text-sm mt-1 ml-14">
						Инструменты для обслуживания системы и удаления устаревших данных.
					</p>
				</div>
			</div>

			{/* --- WARNING BANNER --- */}
			<div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-8 flex items-start gap-4 animate-fade-in-up">
				<AlertTriangle className="text-red-500 shrink-0 mt-1" size={24} />
				<div>
					<h3 className="text-red-800 font-bold text-lg">Будьте осторожны!</h3>
					<p className="text-red-700/80 text-sm mt-1">
						Действия в этом разделе необратимы. Удаленные данные невозможно восстановить без резервной копии.
						Пожалуйста, убедитесь в правильности выбора перед запуском.
					</p>
				</div>
			</div>

			{/* --- СЕТКА ЗАДАЧ --- */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{tasks.map((task, idx) => (
					<div
						key={task.id}
						className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-red-100 transition-all duration-300 group animate-fade-in-up"
						style={{ animationDelay: `${idx * 100}ms` }}
					>
						<div className="flex justify-between items-start mb-4">
							<div className={`p-3 rounded-xl ${task.risk === 'high' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
								<task.icon size={24} />
							</div>
							<span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${task.risk === 'high' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
								{task.risk === 'high' ? 'Высокий риск' : 'Средний риск'}
							</span>
						</div>

						<h3 className="text-lg font-bold text-slate-800 mb-2">{task.title}</h3>
						<p className="text-sm text-slate-500 mb-6 min-h-[40px]">{task.description}</p>

						<div className="flex items-center justify-between pt-4 border-t border-slate-100">
							<div className="text-xs text-slate-400 font-medium">
								Последний запуск: <span className="text-slate-600">{task.lastRun}</span>
							</div>
							<button
								onClick={() => setActiveTask(task)}
								className="px-4 py-2 bg-slate-50 text-slate-700 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
							>
								<RefreshCcw size={14} />
								Очистить
							</button>
						</div>
					</div>
				))}
			</div>

			{/* --- МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ --- */}
			{activeTask && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
					<div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setActiveTask(null)}></div>

					<div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up overflow-hidden">
						{!success ? (
							<>
								<div className="flex justify-center mb-4">
									<div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center animate-pulse">
										<AlertTriangle size={32} className="text-red-500" />
									</div>
								</div>

								<div className="text-center mb-6">
									<h3 className="text-xl font-bold text-slate-800 mb-2">Вы уверены?</h3>
									<p className="text-slate-500 text-sm">
										Вы собираетесь запустить процесс: <br />
										<span className="font-bold text-slate-700">"{activeTask.title}"</span>.
										<br />Это действие нельзя будет отменить.
									</p>
								</div>

								<div className="flex gap-3">
									<button
										disabled={isProcessing}
										onClick={() => setActiveTask(null)}
										className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
									>
										Отмена
									</button>
									<button
										disabled={isProcessing}
										onClick={handleExecute}
										className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
									>
										{isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
										{isProcessing ? "Удаление..." : "Да, удалить"}
									</button>
								</div>
							</>
						) : (
							<div className="text-center py-4">
								<div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
									<CheckCircle2 size={32} className="text-green-500" />
								</div>
								<h3 className="text-xl font-bold text-slate-800">Успешно!</h3>
								<p className="text-slate-500 text-sm mt-1">Очистка завершена.</p>
							</div>
						)}
					</div>
				</div>
			)}

		</div>
	);
};

export default Cleanup;