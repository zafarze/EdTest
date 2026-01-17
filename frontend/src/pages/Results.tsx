import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
	ArrowLeft, BarChart3, Trophy, Users, Search,
	School, Medal, ChevronDown, ChevronUp, Check, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResultItem {
	id: number;
	student_name: string;
	class_name: string;
	school_name: string;
	score: number;
	max_score: number;
	percentage: number;
	details: Record<string, number>;
}

const ResultsPage: React.FC = () => {
	const { examId } = useParams();
	const navigate = useNavigate();
	const [results, setResults] = useState<ResultItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');

	// 🔥 Состояние для раскрытой строки (храним ID ученика)
	const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);

	// Список предметов
	const [subjects, setSubjects] = useState<string[]>([]);

	useEffect(() => {
		fetchResults();
	}, [examId]);

	const fetchResults = async () => {
		try {
			const token = localStorage.getItem('token');
			const response = await axios.get(`http://127.0.0.1:8000/api/exams/${examId}/results/`, {
				headers: { 'Authorization': `JWT ${token}` }
			});

			const data = response.data;
			data.sort((a: ResultItem, b: ResultItem) => b.score - a.score);

			// Определяем предметы
			const allSubjects = new Set<string>();
			data.forEach((item: ResultItem) => {
				if (item.details) {
					Object.keys(item.details).forEach(key => {
						const subjectName = key.split('_')[0];
						allSubjects.add(subjectName);
					});
				}
			});
			setSubjects(Array.from(allSubjects).sort());
			setResults(data);
		} catch (error) {
			console.error("Ошибка:", error);
		} finally {
			setLoading(false);
		}
	};

	// --- HELPER FUNCTIONS ---
	const getSubjectScore = (details: Record<string, number>, subject: string) => {
		if (!details) return { score: 0, total: 0 };
		let score = 0, total = 0;
		Object.entries(details).forEach(([key, val]) => {
			if (key.startsWith(subject)) {
				if (val === 1) score++;
				total++;
			}
		});
		return { score, total };
	};

	const getRankDisplay = (index: number) => {
		const rank = index + 1;
		if (rank === 1) return <div className="flex justify-center"><Trophy className="text-yellow-500 drop-shadow-md" size={24} fill="currentColor" /></div>;
		if (rank === 2) return <div className="flex justify-center"><Medal className="text-gray-400 drop-shadow-md" size={24} /></div>;
		if (rank === 3) return <div className="flex justify-center"><Medal className="text-amber-700 drop-shadow-md" size={24} /></div>;
		return <span className="text-slate-400 font-bold text-sm">#{rank}</span>;
	};

	const getProgressColor = (percent: number) => {
		if (percent >= 80) return 'bg-emerald-500';
		if (percent >= 50) return 'bg-indigo-500';
		return 'bg-amber-500';
	};

	// 🔥 Группировка для детального вида
	const getGroupedDetails = (details: Record<string, number>) => {
		if (!details || Object.keys(details).length === 0) return null;
		const groups: Record<string, { key: string, val: number }[]> = {};

		Object.entries(details).forEach(([key, val]) => {
			const parts = key.split('_');
			let subject = "Общее";
			let num = key;
			if (parts.length > 1) {
				subject = parts[0];
				num = parts[1];
			}
			if (!groups[subject]) groups[subject] = [];
			groups[subject].push({ key: num, val });
		});
		return groups;
	};

	// Логика клика по строке
	const toggleRow = (id: number) => {
		if (expandedStudentId === id) setExpandedStudentId(null);
		else setExpandedStudentId(id);
	};

	// --- ФИЛЬТРАЦИЯ ---
	const filteredResults = results.filter(r =>
		r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
		r.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
		r.school_name.toLowerCase().includes(searchTerm.toLowerCase())
	);

	// Статистика
	const averageScore = results.length > 0 ? (results.reduce((acc, curr) => acc + curr.percentage, 0) / results.length).toFixed(1) : 0;
	const maxScore = results.length > 0 ? Math.max(...results.map(r => r.score)) : 0;

	return (
		<div className="p-8 max-w-[1800px] mx-auto space-y-8 relative">
			{/* Header */}
			<div className="flex items-center gap-4">
				<button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
					<ArrowLeft className="text-slate-600" />
				</button>
				<div>
					<h1 className="text-3xl font-black text-slate-800">Результаты экзамена</h1>
					<p className="text-slate-500">ID Экзамена: #{examId}</p>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
					<div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24} /></div>
					<div><p className="text-sm text-slate-400 font-bold uppercase">Учеников</p><p className="text-2xl font-black text-slate-800">{results.length}</p></div>
				</div>
				<div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
					<div className="p-3 bg-violet-50 text-violet-600 rounded-xl"><BarChart3 size={24} /></div>
					<div><p className="text-sm text-slate-400 font-bold uppercase">Средний %</p><p className="text-2xl font-black text-slate-800">{averageScore}%</p></div>
				</div>
				<div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
					<div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl"><Trophy size={24} /></div>
					<div><p className="text-sm text-slate-400 font-bold uppercase">Лучший балл</p><p className="text-2xl font-black text-slate-800">{maxScore}</p></div>
				</div>
			</div>

			{/* Table */}
			<div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
				<div className="p-6 border-b border-slate-100 flex justify-between items-center">
					<div className="flex items-center gap-4">
						<h3 className="font-bold text-lg text-slate-800">Общая ведомость</h3>
						<div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold border border-indigo-100">Предметов: {subjects.length}</div>
					</div>
					<div className="relative w-72">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
						<input type="text" placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase sticky top-0 z-10">
							<tr>
								<th className="px-4 py-4 text-center w-16 bg-slate-50">№</th>
								<th className="px-4 py-4 bg-slate-50">Ученик</th>
								<th className="px-4 py-4 bg-slate-50">Школа</th>
								<th className="px-4 py-4 bg-slate-50">Класс</th>
								{subjects.map(subj => (
									<th key={subj} className="px-4 py-4 text-center bg-slate-100/50 text-indigo-600 border-l border-slate-200">{subj}</th>
								))}
								<th className="px-4 py-4 text-center border-l border-slate-200 bg-slate-50">Итого</th>
								<th className="px-4 py-4 bg-slate-50 w-48">Прогресс</th>
								<th className="px-4 py-4 bg-slate-50 w-10"></th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{loading ? (
								<tr><td colSpan={7 + subjects.length} className="text-center py-10 text-slate-400">Загрузка...</td></tr>
							) : filteredResults.length === 0 ? (
								<tr><td colSpan={7 + subjects.length} className="text-center py-10 text-slate-400">Нет данных</td></tr>
							) : (
								filteredResults.map((item, index) => (
									<React.Fragment key={item.id}>
										{/* 🔥 ГЛАВНАЯ СТРОКА */}
										<tr
											onClick={() => toggleRow(item.id)}
											className={`cursor-pointer transition-colors group ${expandedStudentId === item.id ? 'bg-indigo-50/60' : 'hover:bg-slate-50/80'} ${index < 3 && expandedStudentId !== item.id ? 'bg-yellow-50/10' : ''}`}
										>
											<td className="px-4 py-4 text-center font-bold">{getRankDisplay(index)}</td>
											<td className="px-4 py-4 font-bold text-slate-700 whitespace-nowrap">{item.student_name}</td>
											<td className="px-4 py-4 text-slate-500 text-xs whitespace-nowrap"><div className="flex items-center gap-1"><School size={12} className="text-slate-400" />{item.school_name.length > 20 ? item.school_name.substring(0, 20) + '...' : item.school_name}</div></td>
											<td className="px-4 py-4 text-slate-500 text-sm">{item.class_name}</td>

											{subjects.map(subj => {
												const { score, total } = getSubjectScore(item.details, subj);
												const isGood = total > 0 && (score / total) >= 0.5;
												return (
													<td key={subj} className="px-4 py-4 text-center border-l border-slate-100">
														{total > 0 ? <span className={`font-mono font-bold ${isGood ? 'text-slate-700' : 'text-red-400'}`}>{score}</span> : <span className="text-slate-200">-</span>}
													</td>
												);
											})}

											<td className="px-4 py-4 text-center border-l border-slate-200 bg-slate-50/30">
												<span className="font-black text-slate-800 text-lg">{item.score}</span><span className="text-slate-400 text-xs ml-1">/ {item.max_score}</span>
											</td>
											<td className="px-4 py-4">
												<div className="flex items-center gap-3">
													<div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
														<div className={`h-full rounded-full transition-all duration-500 ${getProgressColor(item.percentage)}`} style={{ width: `${item.percentage}%` }}></div>
													</div>
													<span className="text-xs font-bold text-slate-500 w-8 text-right">{item.percentage}%</span>
												</div>
											</td>
											<td className="px-4 py-4 text-slate-400">
												{expandedStudentId === item.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
											</td>
										</tr>

										{/* 🔥 РАСКРЫВАЮЩАЯСЯ СТРОКА (ДЕТАЛИ) */}
										<AnimatePresence>
											{expandedStudentId === item.id && (
												<tr>
													<td colSpan={7 + subjects.length} className="p-0 border-b border-indigo-100 bg-slate-50/50">
														<motion.div
															initial={{ opacity: 0, height: 0 }}
															animate={{ opacity: 1, height: 'auto' }}
															exit={{ opacity: 0, height: 0 }}
															className="overflow-hidden"
														>
															<div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
																{item.details && Object.keys(item.details).length > 0 ? (
																	Object.entries(getGroupedDetails(item.details) || {}).map(([subject, questions]) => (
																		<div key={subject} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
																			<h4 className="text-sm font-bold text-slate-700 mb-3 border-b border-slate-100 pb-2 flex justify-between">
																				{subject}
																				<span className="text-xs text-slate-400 font-normal">
																					{questions.filter(q => q.val === 1).length} / {questions.length} верно
																				</span>
																			</h4>
																			<div className="flex flex-wrap gap-2">
																				{questions.map((q, idx) => (
																					<div key={idx} className="flex flex-col items-center gap-1" title={`Вопрос ${q.key}: ${q.val === 1 ? 'Верно' : 'Ошибка'}`}>
																						<div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm ${q.val === 1 ? 'bg-emerald-500' : 'bg-red-400'}`}>
																							{q.val === 1 ? <Check size={14} strokeWidth={3} /> : <XCircle size={14} />}
																						</div>
																						<span className="text-[9px] font-bold text-slate-400">{q.key}</span>
																					</div>
																				))}
																			</div>
																		</div>
																	))
																) : (
																	<div className="col-span-3 text-center py-4 text-slate-400">Детализация ответов отсутствует</div>
																)}
															</div>
														</motion.div>
													</td>
												</tr>
											)}
										</AnimatePresence>
									</React.Fragment>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};

export default ResultsPage;