import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // 🔥 ДОБАВЛЕНО: Для перехода
import {
	UploadCloud, FileSpreadsheet, CheckCircle2,
	X, Loader2, ScanLine, BrainCircuit,
	Sparkles, FileAudio, FileImage, FileText, Camera,
	ArrowRight // Иконка для кнопки
} from 'lucide-react';

// --- ИНТЕРФЕЙСЫ ---
interface Exam {
	id: number;
	title: string;
	date: string;
}

interface HistoryItem {
	id: number;
	file: string;
	type: string;
	school: string;
	date: string;
	author: string;
	status: "success" | "processing" | "error";
	ai_checked: boolean;
	examId: string; // 🔥 ДОБАВЛЕНО: Чтобы знать, куда переходить
}

// --- ИСТОРИЯ ЗАГРУЗОК ---
const UPLOAD_HISTORY: HistoryItem[] = [];

type UploadMode = 'scan' | 'excel' | 'cambridge' | 'manual';

const Upload = () => {
	const navigate = useNavigate(); // 🔥 Хук навигации
	const [step, setStep] = useState(1);
	const [file, setFile] = useState<File | null>(null);
	const [isDragOver, setIsDragOver] = useState(false);
	const [isUploading, setIsUploading] = useState(false);

	// --- ДАННЫЕ С СЕРВЕРА ---
	const [examsList, setExamsList] = useState<Exam[]>([]);
	const [isLoadingExams, setIsLoadingExams] = useState(false);

	// --- НАСТРОЙКИ ---
	const [uploadMode, setUploadMode] = useState<UploadMode>('scan');
	const [selectedExamId, setSelectedExamId] = useState('');
	const [runAiAudit, setRunAiAudit] = useState(true);

	// История
	const [history, setHistory] = useState<HistoryItem[]>(UPLOAD_HISTORY);

	// === ЗАГРУЗКА СПИСКА ЭКЗАМЕНОВ ПРИ СТАРТЕ ===
	useEffect(() => {
		const fetchExams = async () => {
			setIsLoadingExams(true);
			try {
				const token = localStorage.getItem('token') || localStorage.getItem('access');
				if (!token) {
					console.warn("Токен не найден! Пользователь не авторизован.");
					return;
				}

				const response = await axios.get('http://127.0.0.1:8000/api/exams/', {
					headers: { 'Authorization': `JWT ${token}` }
				});

				const data = response.data;
				const exams = Array.isArray(data) ? data : (data.results || []);
				setExamsList(exams);
			} catch (error) {
				console.error("Ошибка при загрузке экзаменов:", error);
			} finally {
				setIsLoadingExams(false);
			}
		};

		fetchExams();
	}, []);


	// --- ЛОГИКА ФАЙЛОВ ---
	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) detectFileType(e.target.files[0]);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault(); setIsDragOver(false);
		if (e.dataTransfer.files && e.dataTransfer.files[0]) detectFileType(e.dataTransfer.files[0]);
	};

	const detectFileType = (file: File) => {
		setFile(file);
		const name = file.name.toLowerCase();

		if (name.endsWith('.pdf') || name.endsWith('.jpg') || name.endsWith('.png') || name.endsWith('.jpeg')) {
			setUploadMode('scan');
		} else if (name.endsWith('.mp3') || name.endsWith('.zip')) {
			setUploadMode('cambridge');
		} else {
			setUploadMode('excel');
		}
		setStep(2);
	};

	// === ОТПРАВКА НА СЕРВЕР ===
	const handleUpload = async () => {
		if (!file) return;
		if (!selectedExamId) {
			alert("Пожалуйста, выберите экзамен из списка!");
			return;
		}

		setIsUploading(true);

		const formData = new FormData();
		formData.append('file', file);
		const backendMode = uploadMode === 'scan' ? 'scan' : 'scores';
		formData.append('mode', backendMode);
		formData.append('exam_id', selectedExamId);

		try {
			const token = localStorage.getItem('token') || localStorage.getItem('access');

			await axios.post('http://127.0.0.1:8000/api/upload/', formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
					'Authorization': `JWT ${token}`,
				},
			});

			setStep(3);

			const examTitle = examsList.find(e => e.id.toString() === selectedExamId)?.title || "Экзамен";

			setHistory(prev => [{
				id: Date.now(),
				file: file.name,
				type: uploadMode === 'scan' ? "Smart Scan (PDF)" : "Excel (Data)",
				school: examTitle,
				date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
				author: "Вы",
				status: "success",
				ai_checked: runAiAudit,
				examId: selectedExamId // 🔥 Сохраняем ID экзамена для истории
			}, ...prev]);

		} catch (error: any) {
			console.error("Upload error:", error);
			const errorMsg = error.response?.data?.error || "Ошибка соединения с сервером";
			alert(`Ошибка: ${errorMsg}`);
		} finally {
			setIsUploading(false);
		}
	};

	const reset = () => { setFile(null); setStep(1); setIsUploading(false); setSelectedExamId(''); }

	return (
		<div className="p-6 max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8">

			{/* ЛЕВАЯ КОЛОНКА */}
			<div className="xl:col-span-8 space-y-8">
				<div>
					<h1 className="text-4xl font-black text-slate-800 tracking-tight">Центр Загрузки</h1>
					<p className="text-slate-500 font-medium text-lg mt-2">
						Импорт любых данных: <span className="text-indigo-600 font-bold">Фото бланков</span>, <span className="text-indigo-600 font-bold">Excel</span> или <span className="text-indigo-600 font-bold">Аудио</span>.
					</p>
				</div>

				{/* ИНДИКАТОР ШАГОВ */}
				<div className="flex items-center gap-4">
					{[1, 2, 3].map((s) => (
						<div key={s} className={`flex items-center gap-3 px-5 py-3 rounded-2xl transition-all border ${step === s ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/20' : 'bg-white text-slate-400 border-slate-200'}`}>
							<div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{s}</div>
							<span className="font-bold text-sm">
								{s === 1 && 'Файл / Фото'}
								{s === 2 && 'Тип данных'}
								{s === 3 && 'Результат'}
							</span>
						</div>
					))}
				</div>

				{/* ОСНОВНОЙ КОНТЕЙНЕР */}
				<div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100 min-h-[600px] relative flex flex-col">
					<AnimatePresence mode="wait">

						{/* STEP 1: DROPZONE */}
						{step === 1 && (
							<motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 p-12 flex flex-col items-center justify-center relative">
								<div
									onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
									onDragLeave={() => setIsDragOver(false)}
									onDrop={handleDrop}
									className={`
                                        w-full max-w-3xl h-96 border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-all cursor-pointer group relative overflow-hidden
                                        ${isDragOver ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' : 'border-slate-200 bg-slate-50/50 hover:border-indigo-300 hover:bg-slate-50'}
                                    `}
								>
									<input type="file" accept=".xlsx,.csv,.zip,.mp3,.pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
									<div className="w-28 h-28 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform relative z-10">
										<Camera size={48} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
									</div>
									<h3 className="text-3xl font-black text-slate-800 z-10 mb-2 text-center">Скан, Фото или Excel</h3>
									<p className="text-slate-400 font-medium text-lg z-10 max-w-md text-center">
										Перетащите PDF скан, фото с телефона или Excel таблицу.
									</p>
									<div className="absolute bottom-8 flex gap-3 opacity-60">
										<span className="px-3 py-1 bg-white border rounded-lg text-xs font-bold text-slate-500 flex items-center gap-1"><FileImage size={12} /> JPG/PNG</span>
										<span className="px-3 py-1 bg-white border rounded-lg text-xs font-bold text-slate-500 flex items-center gap-1"><FileText size={12} /> PDF</span>
										<span className="px-3 py-1 bg-white border rounded-lg text-xs font-bold text-slate-500 flex items-center gap-1"><FileSpreadsheet size={12} /> XLSX</span>
									</div>
								</div>
							</motion.div>
						)}

						{/* STEP 2: ВЫБОР РЕЖИМА И ЭКЗАМЕНА */}
						{step === 2 && (
							<motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 p-10">
								<div className="flex justify-between items-center mb-10 pb-6 border-b border-slate-100">
									<div className="flex items-center gap-5">
										<div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
											{uploadMode === 'scan' && <ScanLine size={32} />}
											{uploadMode === 'excel' && <FileSpreadsheet size={32} />}
											{uploadMode === 'cambridge' && <FileAudio size={32} />}
										</div>
										<div>
											<h3 className="text-2xl font-black text-slate-800">{file?.name}</h3>
											<p className="text-sm text-slate-500 font-medium mt-1">Режим: <strong className="text-indigo-600 uppercase">{uploadMode}</strong></p>
										</div>
									</div>
									<button onClick={reset} className="p-3 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
								</div>

								<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
									<div className="space-y-4">
										<label className="text-xs font-bold text-slate-400 uppercase ml-1">Как обработать?</label>
										<button onClick={() => setUploadMode('scan')} className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-4 ${uploadMode === 'scan' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:bg-slate-50'}`}>
											<div className={`mt-1 p-2 rounded-lg ${uploadMode === 'scan' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}><ScanLine size={20} /></div>
											<div>
												<h5 className="font-bold text-slate-800">Smart Scan (OCR/OMR)</h5>
												<p className="text-xs text-slate-500 mt-1">Распознать ответы с фото или PDF скана.</p>
											</div>
										</button>
										<button onClick={() => setUploadMode('excel')} className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-4 ${uploadMode === 'excel' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:bg-slate-50'}`}>
											<div className={`mt-1 p-2 rounded-lg ${uploadMode === 'excel' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}><FileSpreadsheet size={20} /></div>
											<div>
												<h5 className="font-bold text-slate-800">Excel / CSV</h5>
												<p className="text-xs text-slate-500 mt-1">Загрузить таблицу с баллами.</p>
											</div>
										</button>
										<button onClick={() => setUploadMode('cambridge')} className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-4 ${uploadMode === 'cambridge' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:bg-slate-50'}`}>
											<div className={`mt-1 p-2 rounded-lg ${uploadMode === 'cambridge' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}><FileAudio size={20} /></div>
											<div>
												<h5 className="font-bold text-slate-800">Cambridge AI</h5>
												<p className="text-xs text-slate-500 mt-1">Анализ устных ответов (Voice).</p>
											</div>
										</button>
									</div>

									<div className="space-y-6">
										<div>
											<label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-2 block">Связать с экзаменом (Для ключей)</label>
											<select
												value={selectedExamId}
												onChange={e => setSelectedExamId(e.target.value)}
												disabled={isLoadingExams}
												className="w-full p-4 rounded-2xl border border-slate-200 bg-white font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
											>
												<option value="">{isLoadingExams ? "Загрузка списка..." : "-- Выберите тест --"}</option>
												{examsList.map((exam) => (
													<option key={exam.id} value={exam.id}>{exam.title} ({new Date(exam.date).toLocaleDateString()})</option>
												))}
											</select>
										</div>

										<div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
											<div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[50px] opacity-30"></div>
											<div className="flex justify-between items-start relative z-10">
												<div className="flex gap-3">
													<BrainCircuit className="text-indigo-400" />
													<div>
														<h5 className="font-bold text-lg">AI Vision</h5>
														<p className="text-slate-400 text-xs mt-1">{uploadMode === 'scan' ? "Автоматически выравнивает фото и распознает ответы." : "Проверяет аномалии в данных."}</p>
													</div>
												</div>
												<input type="checkbox" checked={runAiAudit} onChange={() => setRunAiAudit(!runAiAudit)} className="w-6 h-6 rounded-md accent-indigo-500 cursor-pointer" />
											</div>
										</div>

										<button
											onClick={handleUpload}
											disabled={isUploading || !selectedExamId}
											className="w-full py-4 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-70 disabled:cursor-not-allowed"
										>
											{isUploading ? (
												<><Loader2 className="animate-spin" /> {uploadMode === 'scan' ? "Распознавание..." : "Загрузка..."}</>
											) : (
												<><UploadCloud /> Начать {uploadMode === 'scan' ? 'Сканирование' : 'Импорт'}</>
											)}
										</button>
									</div>
								</div>
							</motion.div>
						)}

						{/* STEP 3: SUCCESS (ОБНОВЛЕНО) */}
						{step === 3 && (
							<motion.div key="step3" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-1 p-10 flex flex-col items-center justify-center text-center">
								<div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 shadow-lg shadow-emerald-200 animate-bounce">
									<CheckCircle2 size={48} strokeWidth={3} />
								</div>
								<h2 className="text-3xl font-black text-slate-800 mb-2">
									{uploadMode === 'scan' ? "Распознано успешно!" : "Загрузка завершена!"}
								</h2>
								<p className="text-slate-500 font-medium mb-8 max-w-md">
									{uploadMode === 'scan' ? "Мы распознали бланки. Оценки выставлены." : "Данные успешно добавлены в базу."}
								</p>

								{/* 🔥 КНОПКИ ДЕЙСТВИЙ */}
								<div className="flex gap-4 items-center">
									<button onClick={reset} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-colors">
										Загрузить еще
									</button>
									<button
										onClick={() => navigate(`/manage/results/${selectedExamId}`)}
										className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 group"
									>
										<FileSpreadsheet size={18} />
										Смотреть результаты
										<ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
									</button>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</div>

			{/* ПРАВАЯ КОЛОНКА (ИСТОРИЯ) */}
			<div className="xl:col-span-4 space-y-6">
				<div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-6 flex-1 flex flex-col h-[600px]">
					<h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
						<ScanLine className="text-indigo-600" /> История операций
					</h3>
					<div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
						{history.length === 0 ? (
							<div className="text-center py-10 text-slate-400 font-medium text-sm">История пока пуста</div>
						) : (
							history.map((item) => (
								// 🔥 ИСТОРИЯ ТЕПЕРЬ КЛИКАБЕЛЬНА
								<div
									key={item.id}
									onClick={() => navigate(`/manage/results/${item.examId}`)}
									className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-md transition-all cursor-pointer group"
								>
									<div className="flex justify-between items-start mb-2">
										<div className="flex items-center gap-2">
											{item.type.includes('Scan') ? <FileImage size={16} className="text-blue-500" /> : <FileSpreadsheet size={16} className="text-emerald-500" />}
											<span className="text-xs font-bold text-slate-700 truncate max-w-[140px] group-hover:text-indigo-600 transition-colors">{item.file}</span>
										</div>
										<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.status === 'processing' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>{item.status}</span>
									</div>
									<div className="flex justify-between items-end text-[10px] text-slate-500">
										<div><p className="font-bold">{item.school}</p><p>{item.date}</p></div>
										{item.ai_checked && <Sparkles size={12} className="text-indigo-500" />}
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default Upload;