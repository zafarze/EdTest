import React, { useState, ChangeEvent, useCallback, useRef, useEffect } from 'react';
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
	useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// ДОБАВИЛ иконки Move, Check, X для переноса
import { GripVertical, ImageIcon, Italic, Trash2, Eye, EyeOff, Crop, ZoomIn, Printer, Move, Check, X } from 'lucide-react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

// --- 1. УМНЫЙ КОД: Функция расчета сетки ---
// Если текст короткий -> 2 колонки. Если длинный -> 1 колонка.
const getGridClass = (options: Option[]) => {
	const maxLen = Math.max(...options.map(o => o.text.length));
	// Если самый длинный текст меньше 25 символов -> делаем сетку 2 колонки
	if (maxLen < 25) return "grid grid-cols-2 gap-x-4 gap-y-2";
	// Иначе -> список (одна под другой)
	return "flex flex-col gap-2";
};

// --- Компонент AutoResizeTextarea (БЕЗ ИЗМЕНЕНИЙ) ---
const AutoResizeTextarea = ({ value, onChange, className, placeholder }: any) => {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto';
			textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
		}
	}, [value]);
	return <textarea ref={textareaRef} value={value} onChange={onChange} className={`${className} resize-none overflow-hidden block`} rows={1} placeholder={placeholder} />;
};

// --- Утилиты для обрезки (БЕЗ ИЗМЕНЕНИЙ) ---
const createImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => { const image = new Image(); image.addEventListener('load', () => resolve(image)); image.addEventListener('error', (error) => reject(error)); image.setAttribute('crossOrigin', 'anonymous'); image.src = url; });
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> { const image = await createImage(imageSrc); const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); if (!ctx) return ''; canvas.width = pixelCrop.width; canvas.height = pixelCrop.height; ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height); return new Promise((resolve) => { canvas.toBlob((blob) => { if (!blob) return; resolve(window.URL.createObjectURL(blob)); }, 'image/png'); }); }

// --- Модалка Обрезки (БЕЗ ИЗМЕНЕНИЙ) ---
const ImageCropperModal = ({ imageSrc, onCancel, onSave }: any) => { const [crop, setCrop] = useState({ x: 0, y: 0 }); const [zoom, setZoom] = useState(1); const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null); const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => { setCroppedAreaPixels(croppedAreaPixels); }, []); const handleSave = async () => { if (croppedAreaPixels) { try { const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels); onSave(croppedImage); } catch (e) { console.error(e); } } }; return (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:hidden"> <div className="bg-white rounded-xl overflow-hidden shadow-2xl w-full max-w-lg relative flex flex-col h-[500px]"> <div className="relative flex-1 bg-gray-100"> <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={undefined} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} /> </div> <div className="p-4 bg-white flex flex-col gap-4 border-t"> <div className="flex justify-end gap-3"> <button onClick={onCancel} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100">Отмена</button> <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Сохранить</button> </div> </div> </div> </div>); };

// --- Типы ---
interface Option { id: string; label: string; text: string; isHighlight?: boolean; imageUrl?: string; isItalic?: boolean; }
interface Question { id: string; text: string; options: Option[]; imageUrl?: string; isItalic?: boolean; }

// --- Компонент Варианта ---
const SortableOption = ({
	option,
	showLabel,
	onUpdate,
	onImageUpload,
	showAnswers,
	onOpenCrop,
	// Новые пропсы для переноса
	onTransfer,
	transferMode
}: any) => {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: option.id });
	const style = { transform: CSS.Transform.toString(transform), transition };

	// Проверяем, является ли этот вариант источником переноса
	const isSource = transferMode?.id === option.id;

	return (
		// ВАЖНО: h-full чтобы при сетке карточки были одной высоты
		<div ref={setNodeRef} style={style} className="flex flex-col mb-1 group relative h-full">
			<div className="flex items-start gap-2 h-full">
				<div {...attributes} {...listeners} className="mt-1 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-gray-400 hover:text-blue-500 print:hidden absolute -left-4">
					<GripVertical size={14} />
				</div>

				<span className="font-medium min-w-[20px] select-none pt-1">{showLabel})</span>

				<div className="flex-1 w-full min-w-0">
					<AutoResizeTextarea
						value={option.text}
						onChange={(e: any) => onUpdate('text', e.target.value)}
						className={`w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1 py-0.5 transition-colors 
                        ${showAnswers && option.isHighlight ? "bg-yellow-300 rounded print:bg-transparent" : ""} 
                        ${option.isItalic ? "italic" : ""}`}
					/>

					{option.imageUrl && (
						<div className="mt-2 relative flex justify-center bg-gray-50 border border-gray-200 rounded overflow-hidden w-full max-w-[150px] mx-auto group/img">
							<img src={option.imageUrl} alt="Option" className="h-24 w-full object-contain" draggable="false" />
							<div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity bg-white/90 shadow-sm rounded p-0.5 print:hidden">
								<button onClick={() => onOpenCrop(option.imageUrl!)} className="p-1 hover:text-blue-600 rounded hover:bg-gray-100"><Crop size={12} /></button>
								<button onClick={() => onUpdate('imageUrl', undefined)} className="p-1 hover:text-red-600 rounded hover:bg-gray-100"><Trash2 size={12} /></button>
							</div>
						</div>
					)}
				</div>

				<div className="opacity-0 group-hover:opacity-100 flex gap-1 items-center bg-white shadow-sm border rounded px-1 absolute right-0 -top-7 z-10 print:hidden transition-opacity">
					{/* Кнопка ПЕРЕНОСА */}
					<button
						onClick={() => onTransfer(option.id, 'option', option.imageUrl)}
						className={`p-1 rounded hover:bg-gray-100 ${isSource ? 'text-green-600 bg-green-50 animate-pulse' : 'text-gray-400 hover:text-blue-600'}`}
						title="Переместить фото"
					>
						{transferMode ? <Check size={14} /> : <Move size={14} />}
					</button>

					<button onClick={() => onUpdate('isHighlight', !option.isHighlight)} className={`p-1 rounded hover:bg-gray-100 ${option.isHighlight ? 'text-yellow-600' : 'text-gray-400'}`}><Eye size={14} /></button>
					<button onClick={() => onUpdate('isItalic', !option.isItalic)} className={`p-1 rounded hover:bg-gray-100 ${option.isItalic ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}><Italic size={14} /></button>
					{!option.imageUrl && (
						<label className="p-1 rounded hover:bg-gray-100 cursor-pointer text-gray-500 hover:text-blue-600"><ImageIcon size={14} /><input type="file" accept="image/*" className="hidden" onChange={onImageUpload} /></label>
					)}
				</div>
			</div>
		</div>
	);
};

// --- Компонент Вопроса ---
const SortableQuestion = ({
	question,
	index,
	onQuestionUpdate,
	onOptionsReorder,
	onOptionUpdate,
	showAnswers,
	onOpenCrop,
	// Новые пропсы
	onTransfer,
	transferMode
}: any) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		zIndex: isDragging ? 50 : 'auto',
		position: 'relative' as 'relative',
	};

	const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

	// 2. УМНЫЙ КОД: Получаем класс сетки для вариантов этого вопроса
	const gridClass = getGridClass(question.options);
	const isSource = transferMode?.id === question.id;

	const handleOptionDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (active.id !== over?.id) {
			const oldIndex = question.options.findIndex((o: any) => o.id === active.id);
			const newIndex = question.options.findIndex((o: any) => o.id === over?.id);
			onOptionsReorder(question.id, arrayMove(question.options, oldIndex, newIndex));
		}
	};

	const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, target: 'question' | 'option', optionId?: string) => {
		const file = e.target.files?.[0];
		if (file) {
			const url = URL.createObjectURL(file);
			if (target === 'question') onQuestionUpdate(question.id, 'imageUrl', url);
			else if (optionId) onOptionUpdate(question.id, optionId, 'imageUrl', url);
			onOpenCrop(url, optionId);
		}
	};

	return (
		<div ref={setNodeRef} style={style} className="mb-6 bg-white group/question relative break-inside-avoid">
			<div className="flex gap-2 items-start">
				<div {...attributes} {...listeners} className="mt-1 -ml-6 w-6 flex justify-center opacity-0 group-hover/question:opacity-100 cursor-grab active:cursor-grabbing text-gray-400 hover:text-blue-600 print:hidden absolute">
					<GripVertical size={20} />
				</div>

				<div className="flex-1 text-sm w-full">
					<div className="flex gap-2 font-bold mb-2 select-none group/title relative">
						<span>{index + 1}.</span>

						<div className="flex-1 flex flex-col w-full">
							<AutoResizeTextarea
								value={question.text}
								onChange={(e: any) => onQuestionUpdate(question.id, 'text', e.target.value)}
								className={`w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none p-1 rounded transition-colors ${question.isItalic ? "italic" : ""}`}
							/>

							{question.imageUrl && (
								<div className="mt-3 relative w-full h-48 bg-gray-50 border border-gray-200 rounded overflow-hidden group/img mx-auto">
									<img src={question.imageUrl} alt="Question" className="w-full h-full object-contain" draggable="false" />
									<div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity bg-white/90 shadow-sm rounded p-1 z-10 print:hidden">
										<button onClick={() => onOpenCrop(question.imageUrl!)} className="p-1 rounded hover:bg-gray-100 text-blue-600"><Crop size={16} /></button>
										<button onClick={() => onQuestionUpdate(question.id, 'imageUrl', undefined)} className="p-1 rounded hover:bg-gray-100 text-red-600"><Trash2 size={16} /></button>
									</div>
								</div>
							)}
						</div>

						<div className="opacity-0 group-hover/title:opacity-100 absolute right-0 -top-8 flex gap-1 bg-white border shadow rounded p-1 z-20 print:hidden transition-opacity">
							{/* Кнопка ПЕРЕНОСА Вопроса */}
							<button
								onClick={() => onTransfer(question.id, 'question', question.imageUrl)}
								className={`p-1 rounded hover:bg-gray-100 ${isSource ? 'text-green-600 bg-green-50 animate-pulse' : 'text-gray-400 hover:text-blue-600'}`}
							>
								{transferMode ? <Check size={16} /> : <Move size={16} />}
							</button>
							<button onClick={() => onQuestionUpdate(question.id, 'isItalic', !question.isItalic)} className={`p-1 rounded hover:bg-gray-100 ${question.isItalic ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}><Italic size={16} /></button>
							{!question.imageUrl && (
								<label className="p-1 rounded hover:bg-gray-100 cursor-pointer text-gray-500 hover:text-blue-600"><ImageIcon size={16} /><input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'question')} /></label>
							)}
						</div>
					</div>

					<div className="pl-2 w-full">
						<DndContext sensors={sensors} modifiers={[]} collisionDetection={closestCenter} onDragEnd={handleOptionDragEnd}>
							<SortableContext items={question.options} strategy={verticalListSortingStrategy}>
								{/* 3. ПРИМЕНЯЕМ УМНУЮ СЕТКУ */}
								<div className={gridClass}>
									{question.options.map((opt: any, idx: number) => (
										<SortableOption
											key={opt.id}
											option={opt}
											showLabel={String.fromCharCode(65 + idx)}
											onUpdate={(field: any, value: any) => onOptionUpdate(question.id, opt.id, field, value)}
											onImageUpload={(e: any) => handleImageUpload(e, 'option', opt.id)}
											showAnswers={showAnswers}
											onOpenCrop={(url: string) => onOpenCrop(url, opt.id)}
											onTransfer={onTransfer}
											transferMode={transferMode}
										/>
									))}
								</div>
							</SortableContext>
						</DndContext>
					</div>
				</div>
			</div>
		</div>
	);
};

const TestPaperBuilder = () => {
	const [showAnswers, setShowAnswers] = useState(true);
	const [croppingState, setCroppingState] = useState<{ questionId: string; optionId?: string; imageUrl: string; } | null>(null);

	// 4. СОСТОЯНИЕ ДЛЯ ПЕРЕНОСА ФОТО
	const [transferMode, setTransferMode] = useState<{ id: string; type: 'question' | 'option'; imageUrl: string } | null>(null);

	const [questions, setQuestions] = useState<Question[]>([
		{
			id: 'q1',
			text: "What is the native file extension of the Photoshop application?",
			options: [
				{ id: 'q1-o1', label: 'A', text: "TXT" },
				{ id: 'q1-o2', label: 'B', text: "JPG" },
				{ id: 'q1-o3', label: 'C', text: "PSH" },
				{ id: 'q1-o4', label: 'D', text: "PSD", isHighlight: true },
			]
		},
		{
			id: 'q2',
			text: "Which shortcut opens Free Transform?",
			options: [
				{ id: 'q2-o1', label: 'A', text: "Ctrl + S" },
				{ id: 'q2-o2', label: 'B', text: "Ctrl + T", isHighlight: true },
				{ id: 'q2-o3', label: 'C', text: "Ctrl + J" },
				{ id: 'q2-o4', label: 'D', text: "Ctrl + Z" },
			]
		},
		{
			id: 'q3',
			text: "Which tool copies pixels from one area to another?",
			options: [
				{ id: 'q3-o1', label: 'A', text: "Paint Bucket Tool" },
				{ id: 'q3-o2', label: 'B', text: "Clone Stamp Tool", isHighlight: true },
				{ id: 'q3-o3', label: 'C', text: "Lasso Tool" },
				{ id: 'q3-o4', label: 'D', text: "Crop Tool" },
			]
		},
		{
			id: 'q4',
			text: "Which tool is used for selecting areas based on color similarity?",
			options: [
				{ id: 'q4-o1', label: 'A', text: "Magic Wand Tool", isHighlight: true },
				{ id: 'q4-o2', label: 'B', text: "Pen Tool" },
				{ id: 'q4-o3', label: 'C', text: "Crop Tool" },
				{ id: 'q4-o4', label: 'D', text: "Healing Brush Tool" },
			]
		},
		{
			id: 'q5',
			text: "Which tool is best for quickly separating a person from the background?",
			options: [
				{ id: 'q5-o1', label: 'A', text: "Magic Wand" },
				{ id: 'q5-o2', label: 'B', text: "Quick Selection Tool", isHighlight: true },
				{ id: 'q5-o3', label: 'C', text: "Lasso Tool" },
				{ id: 'q5-o4', label: 'D', text: "Crop tool" },
			]
		},
		{
			id: 'q6',
			text: "Which tool allows you to add text to an image?",
			options: [
				{ id: 'q6-o1', label: 'A', text: "Type Tool", isHighlight: true },
				{ id: 'q6-o2', label: 'B', text: "Pen Tool" },
				{ id: 'q6-o3', label: 'C', text: "Brush Tool" },
				{ id: 'q6-o4', label: 'D', text: "Eyedropper Tool" },
			]
		},
		{
			id: 'q7',
			text: "Which tool can be used to create a smooth gradient from one color to another?",
			options: [
				{ id: 'q7-o1', label: 'A', text: "Paint Bucket Tool" },
				{ id: 'q7-o2', label: 'B', text: "Brush Tool" },
				{ id: 'q7-o3', label: 'C', text: "Gradient Tool", isHighlight: true },
				{ id: 'q7-o4', label: 'D', text: "Pen Tool" },
			]
		},
		{
			id: 'q8',
			text: "Which Photoshop option adjusts brightness and contrast?",
			options: [
				{ id: 'q8-o1', label: 'A', text: "Image → Adjustments → Brightness", isHighlight: true },
				{ id: 'q8-o2', label: 'B', text: "File → Open" },
				{ id: 'q8-o3', label: 'C', text: "View → Zoom" },
				{ id: 'q8-o4', label: 'D', text: "Filter → Blur" },
			]
		},
		{
			id: 'q9',
			text: "Which tool paints one part of an image over another part of the same image?",
			options: [
				{ id: 'q9-o1', label: 'A', text: "Eraser Tool" },
				{ id: 'q9-o2', label: 'B', text: "Clone Stamp Tool", isHighlight: true },
				{ id: 'q9-o3', label: 'C', text: "Zoom Tool" },
				{ id: 'q9-o4', label: 'D', text: "Text Tool" },
			]
		},
		{
			id: 'q10',
			text: "Which tool is used to remove red-eye from photographs in Photoshop?",
			options: [
				{ id: 'q10-o1', label: 'A', text: "Healing Brush Tool" },
				{ id: 'q10-o2', label: 'B', text: "Spot Healing Brush Tool" },
				{ id: 'q10-o3', label: 'C', text: "Red Eye Tool", isHighlight: true },
				{ id: 'q10-o4', label: 'D', text: "Clone Stamp Tool" },
			]
		},
	]);

	const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

	const handleQuestionDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (active.id !== over?.id) {
			setQuestions((items) => {
				const oldIndex = items.findIndex((item) => item.id === active.id);
				const newIndex = items.findIndex((item) => item.id === over?.id);
				return arrayMove(items, oldIndex, newIndex);
			});
		}
	};

	const handleOptionsReorder = (questionId: string, newOptions: Option[]) => {
		setQuestions(questions.map(q => q.id === questionId ? { ...q, options: newOptions } : q));
	};

	const handleQuestionUpdate = (id: string, field: keyof Question, value: any) => {
		setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
	};

	const handleOptionUpdate = (questionId: string, optionId: string, field: keyof Option, value: any) => {
		setQuestions(questions.map(q => {
			if (q.id === questionId) {
				return { ...q, options: q.options.map(o => o.id === optionId ? { ...o, [field]: value } : o) };
			}
			return q;
		}));
	};

	const handleOpenCrop = (questionId: string, imageUrl: string, optionId?: string) => {
		setCroppingState({ questionId, optionId, imageUrl });
	};

	const handleCropSave = (croppedImageUrl: string) => {
		if (!croppingState) return;
		const { questionId, optionId } = croppingState;
		if (optionId) handleOptionUpdate(questionId, optionId, 'imageUrl', croppedImageUrl);
		else handleQuestionUpdate(questionId, 'imageUrl', croppedImageUrl);
		setCroppingState(null);
	};

	// 5. ЛОГИКА ПЕРЕНОСА (TRANSFER)
	const handleTransfer = (id: string, type: 'question' | 'option', currentImageUrl?: string) => {
		if (!transferMode) {
			// ФАЗА 1: Копирование (Взяли фото)
			if (currentImageUrl) {
				setTransferMode({ id, type, imageUrl: currentImageUrl });
			}
		} else {
			// ФАЗА 2: Вставка (Положили фото)
			if (transferMode.id === id) {
				setTransferMode(null); // Отмена
				return;
			}

			const newQuestions = JSON.parse(JSON.stringify(questions));

			// Удаляем фото из старого места
			newQuestions.forEach((q: Question) => {
				if (q.id === transferMode.id && transferMode.type === 'question') delete q.imageUrl;
				q.options.forEach(o => {
					if (o.id === transferMode.id && transferMode.type === 'option') delete o.imageUrl;
				});
			});

			// Вставляем фото в новое место
			newQuestions.forEach((q: Question) => {
				if (q.id === id && type === 'question') q.imageUrl = transferMode.imageUrl;
				q.options.forEach(o => {
					if (o.id === id && type === 'option') o.imageUrl = transferMode.imageUrl;
				});
			});

			setQuestions(newQuestions);
			setTransferMode(null);
		}
	};

	const midPoint = Math.ceil(questions.length / 2);
	const leftQuestions = questions.slice(0, midPoint);
	const rightQuestions = questions.slice(midPoint);

	return (
		<div className="min-h-screen bg-gray-200 p-8 flex justify-center items-start font-serif text-black print:p-0 print:bg-white">

			<div className="fixed top-4 right-4 z-50 flex flex-col gap-2 print:hidden animate-in slide-in-from-right duration-300">
				{/* Индикатор переноса */}
				{transferMode && (
					<div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold flex items-center justify-center animate-pulse cursor-pointer" onClick={() => setTransferMode(null)}>
						<Move className="mr-2" size={16} /> Выберите куда вставить <X size={16} className="ml-2" />
					</div>
				)}
				<button
					onClick={() => setShowAnswers(!showAnswers)}
					className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl hover:bg-blue-50 text-blue-900 font-bold transition-all active:scale-95"
				>
					{showAnswers ? <EyeOff size={18} /> : <Eye size={18} />}
					{showAnswers ? 'Скрыть ответы' : 'Показать ответы'}
				</button>
				<button
					onClick={() => window.print()}
					className="flex items-center gap-2 bg-blue-600 px-4 py-2 rounded-full shadow-lg hover:shadow-xl hover:bg-blue-700 text-white font-bold transition-all active:scale-95 justify-center"
				>
					<Printer size={18} />
					Печать / PDF
				</button>
			</div>

			{croppingState && <ImageCropperModal imageSrc={croppingState.imageUrl} onCancel={() => setCroppingState(null)} onSave={handleCropSave} />}

			{/* ТВОЙ ДИЗАЙН СТРОГО СОХРАНЕН */}
			<div className="bg-white shadow-2xl w-[210mm] min-h-[297mm] p-8 md:p-12 relative flex flex-col print:shadow-none print:w-[210mm] print:h-auto print:p-8 mx-auto">

				<div className="flex justify-between items-end border-b-2 border-black pb-1 mb-0 text-gray-600 font-bold uppercase tracking-wider text-sm md:text-base">
					<span>СИНФИ 10</span>
					<span className="text-black text-lg">ТЕСТИ УМУМИ 2</span>
					<span>2025-2026</span>
				</div>

				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQuestionDragEnd}>
					<SortableContext items={questions} strategy={verticalListSortingStrategy}>
						<div className="flex-1 flex flex-col md:flex-row relative print:flex-row">

							{/* Левая колонка */}
							<div className="w-full md:w-1/2 md:pr-6 pt-6 print:w-1/2 print:pr-6">
								<h1 className="text-center text-2xl font-bold mb-8 uppercase tracking-wide">
									COMPUTER
								</h1>
								{leftQuestions.map((q, i) => (
									<SortableQuestion
										key={q.id}
										question={q}
										index={i}
										onQuestionUpdate={handleQuestionUpdate}
										onOptionsReorder={handleOptionsReorder}
										onOptionUpdate={handleOptionUpdate}
										showAnswers={showAnswers}
										onOpenCrop={(url: string, optId: string) => handleOpenCrop(q.id, url, optId)}
										onTransfer={handleTransfer}
										transferMode={transferMode}
									/>
								))}
							</div>

							<div className="hidden md:block w-[2px] bg-black absolute left-1/2 top-0 bottom-0 -translate-x-1/2 h-full print:block"></div>

							{/* Правая колонка */}
							<div className="w-full md:w-1/2 md:pl-6 pt-6 border-t-2 border-black md:border-t-0 mt-0 md:mt-0 print:w-1/2 print:pl-6 print:border-t-0 print:mt-0">
								{rightQuestions.map((q, i) => (
									<SortableQuestion
										key={q.id}
										question={q}
										index={midPoint + i}
										onQuestionUpdate={handleQuestionUpdate}
										onOptionsReorder={handleOptionsReorder}
										onOptionUpdate={handleOptionUpdate}
										showAnswers={showAnswers}
										onOpenCrop={(url: string, optId: string) => handleOpenCrop(q.id, url, optId)}
										onTransfer={handleTransfer}
										transferMode={transferMode}
									/>
								))}
							</div>
						</div>
					</SortableContext>
				</DndContext>

				<div className="mt-auto pt-8 border-t-2 border-transparent print:mt-4">
					<div className="flex items-center text-gray-500 font-bold uppercase tracking-widest text-xs md:text-sm border-b-2 border-gray-300 pb-1 w-full">
						<span className="mr-8">ORIGINAL</span>
						<div className="flex-1 flex justify-between px-2">
							{[...Array(7)].map((_, i) => <span key={i}>A</span>)}
						</div>
					</div>
					<div className="text-center text-xs text-gray-400 mt-1">1</div>
				</div>

			</div>
		</div>
	);
};

export default TestPaperBuilder;