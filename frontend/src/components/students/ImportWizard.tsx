import React, { useState, useRef } from 'react';
import {
	UploadCloud, FileSpreadsheet, AlertTriangle,
	ArrowRight, CheckCircle2, X, Download, AlertOctagon,
	Loader2
} from 'lucide-react';
// 🔥 ИСПРАВЛЕНИЕ: Добавили AnimatePresence в импорт
import { motion, AnimatePresence } from 'framer-motion';
import { StudentService } from '../../services/studentService';

interface ImportWizardProps {
	isOpen: boolean;
	onClose: () => void;
	schoolId: number;
	onSuccess: () => void;
}

interface PreviewData {
	new_count: number;
	total_rows: number;
	changes: {
		id: string;
		name: string;
		diff: { field: string; old: string; new: string }[];
	}[];
	warnings: {
		id: string;
		name: string;
		current_school: string;
	}[];
}

const ImportWizard = ({ isOpen, onClose, schoolId, onSuccess }: ImportWizardProps) => {
	const [step, setStep] = useState<1 | 2>(1);
	const [file, setFile] = useState<File | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [previewData, setPreviewData] = useState<PreviewData | null>(null);
	const [error, setError] = useState<string | null>(null); // Состояние для красивой ошибки
	const fileInputRef = useRef<HTMLInputElement>(null);

	// 1. Скачать шаблон
	const handleDownloadTemplate = async () => {
		setError(null);
		try {
			const blob = await StudentService.downloadTemplate();
			const url = window.URL.createObjectURL(new Blob([blob]));
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute('download', 'student_import_template.xlsx');
			document.body.appendChild(link);
			link.click();
			link.remove();
		} catch (e) {
			// 🔥 Заменили alert на setError
			setError("Не удалось скачать шаблон. Проверьте соединение.");
		}
	};

	// 2. Загрузка файла и Предпросмотр
	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		setError(null);
		const selectedFile = e.target.files?.[0];
		if (!selectedFile) return;
		setFile(selectedFile);

		setIsLoading(true);
		const fd = new FormData();
		fd.append('file', selectedFile);
		fd.append('school_id', schoolId.toString());

		try {
			const data = await StudentService.previewImport(fd);
			setPreviewData(data);
			setStep(2);
		} catch (e: any) {
			// 🔥 Красивая ошибка вместо alert
			const errorMsg = e.response?.data?.error || "Ошибка чтения файла. Проверьте формат Excel.";
			setError(errorMsg);
			setFile(null);
		} finally {
			setIsLoading(false);
			if (fileInputRef.current) fileInputRef.current.value = '';
		}
	};

	// 3. Финальный импорт
	const handleFinalImport = async () => {
		if (!file) return;
		setError(null);
		setIsLoading(true);
		const fd = new FormData();
		fd.append('file', file);
		fd.append('school_id', schoolId.toString());

		try {
			await StudentService.importExcel(fd);
			// Успех
			onSuccess();
			handleClose();
		} catch (e: any) {
			// 🔥 Красивая ошибка вместо alert
			const errorMsg = e.response?.data?.error || "Ошибка при сохранении данных.";
			setError(errorMsg);
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = () => {
		setStep(1);
		setFile(null);
		setPreviewData(null);
		setError(null);
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
			>
				{/* HEADER */}
				<div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
					<div>
						<h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
							<FileSpreadsheet className="text-emerald-500" />
							Мастер Импорта
						</h2>
						<p className="text-sm text-slate-500 font-medium">
							{step === 1 ? 'Шаг 1: Загрузка файла' : 'Шаг 2: Проверка изменений'}
						</p>
					</div>
					<button onClick={handleClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button>
				</div>

				{/* BODY */}
				<div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-[400px] relative">

					{/* 🔥 БЛОК ОШИБКИ (КРАСИВЫЙ) */}
					<AnimatePresence>
						{error && (
							<motion.div
								initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
								className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3"
							>
								<AlertOctagon className="text-rose-500 shrink-0" size={24} />
								<div className="flex-1">
									<h4 className="font-bold text-rose-700 text-sm">Ошибка</h4>
									<p className="text-sm text-rose-600">{error}</p>
								</div>
								<button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600"><X size={18} /></button>
							</motion.div>
						)}
					</AnimatePresence>

					{/* --- ШАГ 1: ЗАГРУЗКА --- */}
					{step === 1 && (
						<div className="flex flex-col items-center justify-center h-full space-y-8 py-4">
							<div
								onClick={() => !isLoading && fileInputRef.current?.click()}
								className={`w-full max-w-lg border-4 border-dashed rounded-[2rem] p-12 transition-all group text-center ${isLoading ? 'border-slate-100 bg-slate-50 cursor-wait' : 'border-slate-200 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30'}`}
							>
								<div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors ${isLoading ? 'bg-slate-200 text-slate-400' : 'bg-slate-100 group-hover:bg-emerald-100 text-slate-400 group-hover:text-emerald-600'}`}>
									{isLoading ? <Loader2 className="animate-spin" size={48} /> : <UploadCloud size={48} />}
								</div>
								<h3 className="text-xl font-bold text-slate-700">
									{isLoading ? "Анализируем файл..." : "Нажмите для загрузки Excel"}
								</h3>
								{!isLoading && <p className="text-slate-400 mt-2">или перетащите файл сюда</p>}
								<input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileSelect} disabled={isLoading} />
							</div>

							<div className="flex items-center gap-3 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
								<span>Нет правильного файла?</span>
								<button onClick={handleDownloadTemplate} className="text-indigo-600 font-bold hover:underline flex items-center gap-1">
									<Download size={16} /> Скачать шаблон
								</button>
							</div>
						</div>
					)}

					{/* --- ШАГ 2: СРАВНЕНИЕ (DIFF) --- */}
					{step === 2 && previewData && (
						<div className="space-y-6">
							{/* Сводка */}
							<div className="grid grid-cols-3 gap-4">
								<div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
									<div className="text-3xl font-black text-emerald-600">+{previewData.new_count}</div>
									<div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mt-1">Новых</div>
								</div>
								<div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center">
									<div className="text-3xl font-black text-amber-600">~{previewData.changes.length}</div>
									<div className="text-xs font-bold text-amber-800 uppercase tracking-wider mt-1">Изменений</div>
								</div>
								<div className={`p-4 rounded-2xl border text-center ${previewData.warnings.length > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
									<div className={`text-3xl font-black ${previewData.warnings.length > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{previewData.warnings.length}</div>
									<div className={`text-xs font-bold uppercase tracking-wider mt-1 ${previewData.warnings.length > 0 ? 'text-rose-800' : 'text-slate-400'}`}>Конфликт</div>
								</div>
							</div>

							{/* Конфликты школ */}
							{previewData.warnings.length > 0 && (
								<div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
									<h4 className="flex items-center gap-2 text-rose-700 font-bold mb-3">
										<AlertOctagon size={20} /> Внимание: Чужая школа
									</h4>
									<p className="text-sm text-rose-600 mb-4">Ученики найдены в системе, но привязаны к другой школе. Продолжение обновит их данные.</p>
									<div className="max-h-40 overflow-y-auto bg-white rounded-xl border border-rose-100 p-1 custom-scrollbar">
										<table className="w-full text-sm text-left">
											<thead className="text-xs text-rose-400 uppercase bg-rose-50/50 sticky top-0"><tr><th className="px-3 py-2">ФИО</th><th className="px-3 py-2">Текущая школа</th></tr></thead>
											<tbody>
												{previewData.warnings.map((w, i) => (
													<tr key={i} className="border-b border-rose-50 last:border-0 hover:bg-rose-50/30">
														<td className="px-3 py-2 font-bold text-slate-700">{w.name}</td>
														<td className="px-3 py-2 text-rose-600 font-medium">{w.current_school}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							)}

							{/* Детали изменений */}
							{previewData.changes.length > 0 ? (
								<div>
									<h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> Детали изменений</h4>
									<div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
										{previewData.changes.map((change, idx) => (
											<div key={idx} className="border-b border-slate-100 last:border-0 p-4 hover:bg-slate-50 transition-colors">
												<div className="font-bold text-slate-800 mb-2">{change.name} <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-xs font-mono ml-2">ID: {change.id}</span></div>
												<div className="space-y-1.5">
													{change.diff.map((d, i) => (
														<div key={i} className="flex items-center text-sm gap-3">
															<span className="font-mono text-slate-400 w-28 text-right text-xs uppercase font-bold">{d.field}</span>
															<div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-lg flex-1">
																<span className="text-rose-500 line-through decoration-rose-300 px-1">{d.old || <i className="opacity-50">пусто</i>}</span>
																<ArrowRight size={14} className="text-slate-300" />
																<span className="text-emerald-600 font-bold bg-emerald-100/50 px-1.5 rounded">{d.new}</span>
															</div>
														</div>
													))}
												</div>
											</div>
										))}
									</div>
								</div>
							) : (
								<div className="text-center text-slate-400 py-8 border-2 border-dashed border-slate-100 rounded-2xl">
									Нет изменений в существующих данных (только новые записи)
								</div>
							)}
						</div>
					)}
				</div>

				{/* FOOTER */}
				<div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
					{step === 2 && (
						<button onClick={() => { setStep(1); setFile(null); setError(null); }} className="text-slate-500 font-bold hover:text-slate-800 text-sm px-4 py-2 hover:bg-slate-200 rounded-lg transition-colors">
							Назад
						</button>
					)}
					<div className="ml-auto flex gap-3">
						<button onClick={handleClose} className="px-5 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">
							Отмена
						</button>
						{step === 2 && (
							<button
								onClick={handleFinalImport}
								disabled={isLoading}
								className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 transition-all active:scale-95 ${previewData?.warnings.length ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'}`}
							>
								{isLoading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
								{previewData?.warnings.length ? 'Подтвердить (с конфликтами)' : 'Импортировать'}
							</button>
						)}
					</div>
				</div>
			</motion.div>
		</div>
	);
};

export default ImportWizard;