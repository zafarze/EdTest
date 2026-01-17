import React, { useState } from 'react';
import axios from 'axios';
import {
	Book, Download, Printer, FileText,
	Loader2, AlertCircle, CheckCircle2,
	QrCode, GraduationCap, School
} from 'lucide-react';

const Booklets = () => {
	const [isGenerating, setIsGenerating] = useState(false);

	// Временные стейты для ввода ID (потом заменим на выпадающие списки)
	const [examId, setExamId] = useState('1');
	const [classId, setClassId] = useState('1');

	// --- ЛОГИКА СКАЧИВАНИЯ ---
	const handleDownload = async () => {
		if (!examId || !classId) {
			alert("Пожалуйста, введите ID экзамена и класса");
			return;
		}

		setIsGenerating(true);
		try {
			// 1. Берем токен из хранилища (чтобы бэкенд нас пустил)
			const token = localStorage.getItem('token');

			// 2. Делаем запрос
			const response = await axios.get(`http://127.0.0.1:8000/api/booklets/generate_class_booklet/`, {
				params: {
					exam_id: examId,
					class_id: classId
				},
				responseType: 'blob', // <--- КРИТИЧЕСКИ ВАЖНО: Мы ждем файл, а не JSON
				headers: {
					Authorization: `Bearer ${token}` // Отправляем пропуск
				}
			});

			// 3. Создаем ссылку для скачивания в браузере
			const url = window.URL.createObjectURL(new Blob([response.data]));
			const link = document.createElement('a');
			link.href = url;

			// Пытаемся вытащить имя файла из заголовков ответа
			const contentDisposition = response.headers['content-disposition'];
			let fileName = `exam_${examId}_class_${classId}.pdf`;

			if (contentDisposition) {
				const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
				if (fileNameMatch && fileNameMatch.length === 2) {
					fileName = fileNameMatch[1];
				}
			}

			link.setAttribute('download', fileName);
			document.body.appendChild(link);
			link.click();

			// Чистим мусор
			link.remove();
			window.URL.revokeObjectURL(url);

		} catch (error: any) {
			console.error("Ошибка скачивания:", error);
			// Если сервер вернул текст ошибки (например 404), Blob сложно прочитать сразу,
			// но для простоты покажем алерт
			alert("Ошибка генерации! Проверьте, существуют ли ID Экзамена и Класса в базе.");
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<div className="p-8 max-w-7xl mx-auto">

			{/* ЗАГОЛОВОК */}
			<div className="mb-10">
				<h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Генератор Буклетов</h1>
				<p className="text-slate-500 font-medium text-lg">
					Создание персональных бланков ответов с <span className="text-indigo-600 font-bold">QR-кодами</span> для сканера.
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

				{/* ЛЕВАЯ КОЛОНКА: ФОРМА */}
				<div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
					<div className="flex items-center gap-4 mb-8">
						<div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
							<Printer size={32} />
						</div>
						<div>
							<h3 className="text-xl font-bold text-slate-800">Параметры печати</h3>
							<p className="text-sm text-slate-500">Выберите класс и экзамен</p>
						</div>
					</div>

					<div className="space-y-6">
						{/* Поле ID Экзамена */}
						<div>
							<label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block">ID Экзамена</label>
							<div className="relative">
								<FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
								<input
									type="text"
									value={examId}
									onChange={(e) => setExamId(e.target.value)}
									placeholder="Например: 1"
									className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
								/>
							</div>
						</div>

						{/* Поле ID Класса */}
						<div>
							<label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block">ID Класса</label>
							<div className="relative">
								<GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
								<input
									type="text"
									value={classId}
									onChange={(e) => setClassId(e.target.value)}
									placeholder="Например: 1"
									className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
								/>
							</div>
						</div>

						{/* КНОПКА ГЕНЕРАЦИИ */}
						<button
							onClick={handleDownload}
							disabled={isGenerating}
							className="w-full py-5 rounded-2xl font-black text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-70 disabled:cursor-not-allowed mt-4"
						>
							{isGenerating ? (
								<>
									<Loader2 className="animate-spin" size={24} />
									<span>Печатаем PDF...</span>
								</>
							) : (
								<>
									<Download size={24} />
									<span>Сгенерировать и Скачать</span>
								</>
							)}
						</button>
					</div>
				</div>

				{/* ПРАВАЯ КОЛОНКА: ПРЕВЬЮ / ИНФО */}
				<div className="space-y-6">
					{/* Карточка Инфо */}
					<div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
						<div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>

						<div className="relative z-10">
							<h3 className="text-2xl font-black mb-4 flex items-center gap-3">
								<QrCode className="text-indigo-400" />
								Smart Booklets
							</h3>
							<p className="text-slate-400 leading-relaxed mb-6">
								Система автоматически генерирует уникальный QR-код для каждого студента.
								<br /><br />
								В коде зашифрованы:
							</p>
							<ul className="space-y-3">
								<li className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
									<CheckCircle2 size={18} className="text-emerald-400" />
									<span className="font-bold text-sm">ID Ученика (чтобы не перепутали)</span>
								</li>
								<li className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
									<CheckCircle2 size={18} className="text-emerald-400" />
									<span className="font-bold text-sm">Вариант Теста (А или B)</span>
								</li>
								<li className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
									<CheckCircle2 size={18} className="text-emerald-400" />
									<span className="font-bold text-sm">ID Экзамена (для ключей)</span>
								</li>
							</ul>
						</div>
					</div>

					{/* Подсказка */}
					<div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex gap-4">
						<AlertCircle className="text-amber-500 shrink-0 mt-1" />
						<div>
							<h4 className="font-bold text-amber-800 mb-1">Важно</h4>
							<p className="text-sm text-amber-700 leading-relaxed">
								Убедитесь, что список учеников в классе актуален перед генерацией.
								PDF файл будет содержать по 1 странице на каждого ученика.
							</p>
						</div>
					</div>
				</div>

			</div>
		</div>
	);
};

export default Booklets;