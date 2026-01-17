import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Search, Plus, School as SchoolIcon,
	Edit2, Trash2, Key, Globe,
	Users, ChevronDown, Check, Building2,
	UploadCloud, Download, X as CloseIcon, CheckSquare, Square,
	Loader2, UserPlus,
	FileSpreadsheet, FileText, ArrowRightCircle,
	LayoutGrid, List,
	Eye, EyeOff, ChevronRight, ChevronLeft,
	AlertTriangle, AlertOctagon,
	Wand2, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { StudentService } from '../../services/studentService';
import type { Student } from '../../services/studentService';
import $api from '../../services/api';
import ImportWizard from '../../components/students/ImportWizard';

interface School { id: number; name: string; custom_id: string; }
interface StudentClass { id: number; grade_level: number; section: string; students_count: number; }

// --- ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ---
const OnlineStatus = ({ isOnline, lastLogin }: { isOnline: boolean, lastLogin: string }) => {
	const { t } = useTranslation();
	if (isOnline) return <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100 w-fit"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span><span className="text-[10px] font-bold text-emerald-600 uppercase">Online</span></div>;
	return <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400">{t('students.table.was_online')}</span><span className="text-[10px] font-medium text-slate-600">{lastLogin ? new Date(lastLogin).toLocaleDateString() : '-'}</span></div>;
};

const PasswordCell = ({ password }: { password?: string }) => {
	const [show, setShow] = useState(false);
	if (!password) return <span className="text-slate-300 text-xs font-mono">-</span>;
	return (
		<div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 w-fit">
			<span className="text-xs font-mono font-bold text-slate-600 min-w-[60px] tracking-widest">{show ? password : '••••••'}</span>
			<button onClick={(e) => { e.stopPropagation(); setShow(!show); }} className="text-slate-400 hover:text-indigo-600 transition-colors" title={show ? "Hide" : "Show"}>{show ? <EyeOff size={14} /> : <Eye size={14} />}</button>
		</div>
	);
};

const StatsCard = ({ title, value, color, icon: Icon }: any) => (
	<div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 flex-1 min-w-[200px]">
		<div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}><Icon size={24} /></div>
		<div><p className="text-slate-400 text-xs font-bold uppercase">{title}</p><h4 className="text-2xl font-black text-slate-800">{value}</h4></div>
	</div>
);

const SchoolSelect = ({ schools, selectedId, onSelect }: { schools: School[], selectedId: number | null, onSelect: (id: number) => void }) => {
	const [isOpen, setIsOpen] = useState(false);
	const { t } = useTranslation();
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false); };
		document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);
	const selectedSchool = schools.find(s => s.id === selectedId);
	return (
		<div className="relative mb-6" ref={ref}>
			<label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 block">{t('students.sidebar.current_school')}</label>
			<button onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all ${isOpen ? 'border-indigo-500 shadow-indigo-100' : 'border-slate-100 hover:border-slate-300'}`}>
				<div className="flex items-center gap-3 overflow-hidden"><div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0"><Building2 size={18} /></div><span className={`text-sm font-bold truncate ${selectedSchool ? 'text-slate-700' : 'text-slate-400'}`}>{selectedSchool ? selectedSchool.name : t('students.sidebar.select_school_placeholder')}</span></div><ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
			</button>
			<AnimatePresence>{isOpen && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-80 overflow-y-auto custom-scrollbar p-1">{schools.map(s => (<button key={s.id} onClick={() => { onSelect(s.id); setIsOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl transition-all mb-1 ${selectedId === s.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}><span className="truncate text-left">{s.name}</span>{selectedId === s.id && <Check size={16} />}</button>))}</motion.div>)}</AnimatePresence>
		</div>
	);
};

const Students = () => {
	const navigate = useNavigate();
	const { t, i18n } = useTranslation();

	// Data States
	const [schools, setSchools] = useState<School[]>([]);
	const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
	const [classes, setClasses] = useState<StudentClass[]>([]);
	const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
	const [selectedGradeLevel, setSelectedGradeLevel] = useState<number | null>(null);
	const [students, setStudents] = useState<Student[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [selectedIds, setSelectedIds] = useState<number[]>([]);

	// View States
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
	const [expandedGrades, setExpandedGrades] = useState<number[]>([]);

	// Modals
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
	const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);

	// 🔥 НОВЫЕ СОСТОЯНИЯ ДЛЯ МОДАЛОК
	const [notification, setNotification] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string; }>({ isOpen: false, type: 'success', title: '', message: '' });
	const [isGenerateConfirmOpen, setIsGenerateConfirmOpen] = useState(false);

	const [isDeleting, setIsDeleting] = useState(false);
	const [activeTab, setActiveTab] = useState<'ru' | 'tj' | 'en'>('ru');

	// Forms
	const [editingId, setEditingId] = useState<number | null>(null);
	const [formData, setFormData] = useState({
		first_name_ru: '', last_name_ru: '', first_name_tj: '', last_name_tj: '', first_name_en: '', last_name_en: '',
		gender: 'male', student_class: '', password: '', showPassword: false
	});
	const [passwordData, setPasswordData] = useState({ studentId: 0, studentName: '', newPassword: '', isVisible: false });
	const [transferType, setTransferType] = useState<'class' | 'next_year' | 'archive'>('class');
	const [targetClassId, setTargetClassId] = useState<string>('');

	// 🔥 УМНЫЕ УВЕДОМЛЕНИЯ
	const showSuccess = (msg: string) => {
		setNotification({ isOpen: true, type: 'success', title: t('students.messages.notification_success'), message: msg });
	};

	const showError = (msg: string) => {
		setNotification({ isOpen: true, type: 'error', title: t('students.messages.notification_error'), message: msg });
	};

	const closeNotification = () => setNotification(prev => ({ ...prev, isOpen: false }));

	// ESC Listener
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setIsCreateModalOpen(false);
				setIsPasswordModalOpen(false);
				setIsTransferModalOpen(false);
				setIsDeleteModalOpen(false);
				setIsImportWizardOpen(false);
				setIsGenerateConfirmOpen(false);
				closeNotification();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

	// Data Fetching
	useEffect(() => {
		$api.get('/schools/')
			.then(res => {
				const data = Array.isArray(res.data) ? res.data : (res.data as any).results;
				setSchools(data);
				if (data.length > 0 && !selectedSchoolId) setSelectedSchoolId(data[0].id);
			})
			.catch(err => {
				if (err.response && err.response.status === 401) showError(t('students.messages.session_expired'));
			});
	}, []);

	const fetchStructure = useCallback(async () => {
		if (!selectedSchoolId) return;
		try {
			const res = await $api.get(`/classes/structure/?school_id=${selectedSchoolId}`);
			setClasses(res.data);
		} catch (e) { console.error(e); }
	}, [selectedSchoolId]);

	useEffect(() => { fetchStructure(); setSelectedClassId(null); setSelectedGradeLevel(null); setStudents([]); setSelectedIds([]); setExpandedGrades([]); }, [selectedSchoolId, fetchStructure]);

	const fetchStudents = async () => {
		if (!selectedSchoolId) return;
		setIsLoading(true);
		try {
			const params: any = { school_id: selectedSchoolId };
			if (selectedClassId) params.class_id = selectedClassId;
			else if (selectedGradeLevel) params.grade_level = selectedGradeLevel;
			if (searchQuery) params.search = searchQuery;
			const data = await StudentService.getAll(params);
			setStudents(Array.isArray(data) ? data : (data as any).results);
		} catch (e) { console.error(e); } finally { setIsLoading(false); }
	};

	useEffect(() => {
		if ((selectedClassId || selectedGradeLevel || searchQuery) && selectedSchoolId) {
			const t = setTimeout(fetchStudents, 500); return () => clearTimeout(t);
		}
	}, [selectedSchoolId, selectedClassId, selectedGradeLevel, searchQuery]);

	const groupedClasses = useMemo(() => {
		const groups: any = {};
		classes.forEach(c => { if (!groups[c.grade_level]) groups[c.grade_level] = []; groups[c.grade_level].push(c); });
		return groups;
	}, [classes]);

	const activeClass = classes.find(c => c.id === selectedClassId);
	const activeSchool = schools.find(s => s.id === selectedSchoolId);
	const editingStudent = students.find(s => s.id === editingId);

	const stats = useMemo(() => ({
		total: students.length,
		boys: students.filter(s => s.gender === 'male').length,
		girls: students.filter(s => s.gender === 'female').length,
		online: students.filter(s => s.is_online).length
	}), [students]);

	const toggleSelection = (id: number) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
	const toggleSelectAll = () => setSelectedIds(selectedIds.length === students.length ? [] : students.map(s => s.id));
	const toggleGradeAccordion = (grade: number, e: React.MouseEvent) => {
		e.stopPropagation();
		setExpandedGrades(prev => prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]);
	};

	const openPasswordModal = (s: Student) => {
		const name = i18n.language === 'tj' ? `${s.last_name_tj} ${s.first_name_tj}` : i18n.language === 'en' ? `${s.last_name_en} ${s.first_name_en}` : `${s.last_name_ru} ${s.first_name_ru}`;
		setPasswordData({ studentId: s.id, studentName: name, newPassword: '', isVisible: false });
		setIsPasswordModalOpen(true);
	};

	// --- HANDLERS ---
	const handleCreateClick = () => {
		if (!selectedSchoolId) return showError(t('students.messages.select_school_first'));
		setEditingId(null);
		setFormData({ first_name_ru: '', last_name_ru: '', first_name_tj: '', last_name_tj: '', first_name_en: '', last_name_en: '', gender: 'male', student_class: selectedClassId ? selectedClassId.toString() : '', password: '', showPassword: false });
		setActiveTab('ru');
		setIsCreateModalOpen(true);
	};

	const handleEditClick = (s: Student) => {
		setEditingId(s.id);
		const foundClass = classes.find(c => {
			const rawName = `${c.grade_level}${c.section}`;
			const hyphenName = `${c.grade_level}-${c.section}`;
			const studentClassName = s.class_name ? s.class_name.replace('-', '') : '';
			return rawName === studentClassName || hyphenName === s.class_name;
		});

		setFormData({
			first_name_ru: s.first_name_ru, last_name_ru: s.last_name_ru,
			first_name_tj: s.first_name_tj, last_name_tj: s.last_name_tj,
			first_name_en: s.first_name_en, last_name_en: s.last_name_en,
			gender: s.gender, student_class: foundClass ? foundClass.id.toString() : '',
			password: '', showPassword: false
		});
		setIsCreateModalOpen(true);
	};

	const handleSaveSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.student_class) return showError(t('students.messages.class_required'));
		try {
			const { showPassword, ...dataToSend } = formData;
			const payload = { ...dataToSend, school: selectedSchoolId, status: 'active' };
			if (editingId) await StudentService.update(editingId, payload);
			else await StudentService.create(payload);
			setIsCreateModalOpen(false); fetchStudents(); fetchStructure();
			showSuccess(editingId ? t('students.messages.save_success_edit') : t('students.messages.save_success_create'));
		} catch (e: any) { showError(t('students.messages.save_error') + ": " + JSON.stringify(e.response?.data || "Error")); }
	};

	const handleGenerateClick = () => {
		setIsGenerateConfirmOpen(true);
	};

	const performGeneratePasswords = async () => {
		try {
			await StudentService.bulkGenerateCredentials(selectedIds);
			setIsGenerateConfirmOpen(false);
			showSuccess(t('students.messages.gen_success'));
			fetchStudents();
			setSelectedIds([]);
		} catch (e) {
			setIsGenerateConfirmOpen(false);
			showError(t('students.messages.gen_error'));
		}
	};

	const handleTransferSubmit = async () => {
		if (!window.confirm(t('students.messages.transfer_confirm', { count: selectedIds.length }))) return;
		try {
			await StudentService.transfer({ ids: selectedIds, type: transferType, target_class_id: transferType === 'class' ? targetClassId : null });
			setIsTransferModalOpen(false); fetchStudents(); fetchStructure(); setSelectedIds([]);
			showSuccess(t('students.messages.transfer_success'));
		} catch (e) { showError(t('students.messages.transfer_error')); }
	};

	const performDelete = async () => {
		setIsDeleting(true);
		try {
			await StudentService.bulkDelete(selectedIds);
			setStudents(prev => prev.filter(s => !selectedIds.includes(s.id)));
			setSelectedIds([]);
			fetchStructure();
			setIsDeleteModalOpen(false);
			showSuccess(t('students.messages.delete_success'));
		} catch (e) { showError(t('students.messages.delete_error')); } finally { setIsDeleting(false); }
	};

	const handleImportClick = () => {
		if (!selectedSchoolId) return showError(t('students.messages.select_school_first'));
		setIsImportWizardOpen(true);
	};

	const handleExport = async (type: 'excel' | 'pdf') => {
		try {
			const params = new URLSearchParams();
			if (selectedIds.length > 0) params.append('ids', selectedIds.join(','));
			else {
				if (selectedSchoolId) params.append('school_id', selectedSchoolId.toString());
				if (selectedClassId) params.append('class_id', selectedClassId.toString());
				if (searchQuery) params.append('search', searchQuery);
			}

			let data;
			let fileName;

			if (type === 'excel') {
				data = await StudentService.exportExcel(params);
				fileName = `students_${new Date().toISOString().split('T')[0]}.xlsx`;
			} else {
				data = await StudentService.exportPdfCards(params);
				fileName = `access_cards_${new Date().toISOString().split('T')[0]}.pdf`;
			}

			const url = window.URL.createObjectURL(new Blob([data]));
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute('download', fileName);
			document.body.appendChild(link);
			link.click();
			link.remove();
		} catch (e) {
			console.error(e);
			showError(t('students.messages.export_error'));
		}
	};

	const handlePasswordReset = async () => {
		try {
			await StudentService.resetPassword(passwordData.studentId, passwordData.newPassword);
			setIsPasswordModalOpen(false);
			showSuccess(t('students.messages.pass_change_success'));
		} catch (e) { showError(t('students.messages.pass_change_error')); }
	};

	return (
		<div className="w-full h-[calc(100vh-100px)] flex flex-col gap-4 mt-2">

			{selectedSchoolId && (
				<div className="flex flex-wrap gap-4">
					<StatsCard title={t('students.stats.total')} value={stats.total} color="bg-indigo-50 text-indigo-600" icon={Users} />
					<StatsCard title={t('students.stats.gender_ratio')} value={`${stats.boys} / ${stats.girls}`} color="bg-blue-50 text-blue-600" icon={Check} />
					<StatsCard title={t('students.stats.online')} value={stats.online} color="bg-emerald-50 text-emerald-600" icon={Globe} />
				</div>
			)}

			<div className="flex flex-1 gap-6 overflow-hidden relative">
				<div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-xl flex flex-col overflow-hidden relative transition-all duration-300">
					<div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 bg-slate-50/30 justify-between items-center">
						<div className="flex items-center gap-4 w-full md:w-auto">
							{/* КНОПКА НАЗАД */}
							<button onClick={() => navigate('/admin/management')} className="p-2 rounded-xl bg-white border shadow-sm hover:bg-slate-50 text-slate-500 transition-colors">
								<ChevronLeft size={20} />
							</button>
							<div>
								{selectedClassId && activeClass ?
									<h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
										{t('students.header.class_title', { grade: activeClass.grade_level, section: activeClass.section })}
										<span className="px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold">{activeClass.students_count} {t('students.header.people_short')}</span>
									</h2> :
									selectedGradeLevel ? <h2 className="text-xl font-black text-slate-800">{t('students.header.grade_title', { grade: selectedGradeLevel })}</h2> :
										<h2 className="text-xl font-black text-slate-800">{t('students.header.all_students')}</h2>
								}
							</div>
							<div className="relative w-64 hidden md:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder={t('students.header.search')} className="w-full pl-9 pr-4 py-2 bg-white border rounded-xl font-bold outline-none text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
						</div>
						<div className="flex items-center gap-2">
							<div className="bg-slate-100 p-1 rounded-lg flex border">
								<button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`} title={t('students.header.view_list')}><List size={16} /></button>
								<button onClick={() => setViewMode('grid')} className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`} title={t('students.header.view_grid')}><LayoutGrid size={16} /></button>
							</div>
							<button onClick={handleCreateClick} className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold shadow-lg flex items-center gap-2 hover:bg-indigo-700 text-sm"><Plus size={16} /> <span className="hidden sm:inline">{t('students.header.create_btn')}</span></button>
						</div>
					</div>

					<div className="flex-1 overflow-auto custom-scrollbar p-1">
						{!selectedSchoolId ? <div className="h-full flex items-center justify-center text-slate-300">{t('students.table.select_school_msg')}</div> : isLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-500" /></div> : students.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-300"><Users size={64} className="mb-4 opacity-50" /><p>{t('students.table.no_students')}</p></div> : (
							viewMode === 'list' ? (
								<table className="w-full border-collapse">
									<thead className="bg-slate-50 sticky top-0 z-10">
										<tr>
											<th className="px-4 py-3 w-10 text-center"><button onClick={toggleSelectAll}>{selectedIds.length === students.length && students.length > 0 ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}</button></th>
											<th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">{t('students.table.id')}</th>
											{(!isSidebarOpen) ? (
												<><th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase text-indigo-500">{t('students.table.full_name_tj')}</th><th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">{t('students.table.full_name_ru')}</th><th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase text-indigo-500">{t('students.table.full_name_en')}</th></>
											) : (<th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">{t('students.table.full_name_local', { lang: i18n.language.toUpperCase() })}</th>)}
											<th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">{t('students.table.class')}</th>
											<th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">{t('students.table.login')}</th>
											<th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase">{t('students.table.password')}</th>
											<th className="px-4 py-3 text-center text-[10px] font-bold text-slate-400 uppercase">{t('students.table.status')}</th>
											<th className="px-4 py-3 text-right"></th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100">
										{students.map((s, i) => (
											<tr key={s.id} onClick={() => toggleSelection(s.id)} className={`cursor-pointer transition-colors group ${selectedIds.includes(s.id) ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}>
												<td className="px-4 py-3 text-center">{selectedIds.includes(s.id) ? <CheckSquare size={18} className="text-indigo-600 mx-auto" /> : <span className="text-xs font-bold text-slate-300">{i + 1}</span>}</td>
												<td className="px-4 py-3"><span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">{s.custom_id}</span></td>
												{(!isSidebarOpen) ? (
													<><td className="px-4 py-3 text-sm text-slate-600">{s.last_name_tj} {s.first_name_tj}</td><td className="px-4 py-3"><span className="font-bold text-slate-800 text-sm">{s.last_name_ru} {s.first_name_ru}</span></td><td className="px-4 py-3 text-sm text-slate-600">{s.last_name_en} {s.first_name_en}</td></>
												) : (
													<td className="px-4 py-3"><span className="font-bold text-slate-800 text-sm">{i18n.language === 'ru' && `${s.last_name_ru} ${s.first_name_ru}`}{i18n.language === 'tj' && `${s.last_name_tj || s.last_name_ru} ${s.first_name_tj || s.first_name_ru}`}{i18n.language === 'en' && `${s.last_name_en || s.last_name_ru} ${s.first_name_en || s.first_name_ru}`}</span></td>
												)}
												<td className="px-4 py-3"><span className="font-bold text-[10px] text-slate-500 bg-white border px-1.5 py-0.5 rounded-md">{s.class_name}</span></td>
												<td className="px-4 py-3"><span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">@{s.username}</span></td>
												<td className="px-4 py-3"><PasswordCell password={s.password} /></td>
												<td className="px-4 py-3"><OnlineStatus isOnline={s.is_online} lastLogin={s.last_login} /></td>
												<td className="px-4 py-3 text-right"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); openPasswordModal(s); }} className="p-1.5 text-slate-400 hover:text-orange-500 rounded-lg"><Key size={14} /></button><button onClick={(e) => { e.stopPropagation(); handleEditClick(s); }} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"><Edit2 size={14} /></button></div></td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
									{students.map(s => (
										<div key={s.id} onClick={() => toggleSelection(s.id)} className={`relative p-4 rounded-2xl border transition-all hover:shadow-lg flex flex-col items-center text-center ${selectedIds.includes(s.id) ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-white'}`}>
											<div className={`w-16 h-16 rounded-full mb-3 flex items-center justify-center text-2xl font-bold text-white shadow-md ${s.gender === 'male' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-pink-400 to-pink-600'}`}>{s.first_name_ru[0]}{s.last_name_ru[0]}</div>
											<h4 className="font-bold text-slate-800 text-sm truncate w-full">{s.last_name_ru} {s.first_name_ru}</h4>
											<p className="text-xs text-slate-400 mb-2">{s.class_name}</p>
											<div className="mt-auto flex gap-2 w-full justify-center"><button onClick={(e) => { e.stopPropagation(); openPasswordModal(s) }} className="p-2 rounded-full bg-orange-50 text-orange-500 hover:bg-orange-100"><Key size={14} /></button><button onClick={(e) => { e.stopPropagation(); handleEditClick(s) }} className="p-2 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100"><Edit2 size={14} /></button></div>
											{selectedIds.includes(s.id) && <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1"><Check size={12} /></div>}
										</div>
									))}
								</div>
							)
						)}
					</div>
				</div>

				<div className="absolute top-1/2 -translate-y-1/2 right-[320px] z-20" style={{ right: isSidebarOpen ? '305px' : '0px', transition: 'right 0.3s' }}>
					<button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-8 h-12 bg-white border border-slate-200 shadow-lg rounded-l-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:w-10 transition-all">
						{isSidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
					</button>
				</div>

				<AnimatePresence mode='wait'>
					{isSidebarOpen && (
						<motion.div initial={{ width: 0, opacity: 0, marginLeft: 0 }} animate={{ width: 320, opacity: 1, marginLeft: 24 }} exit={{ width: 0, opacity: 0, marginLeft: 0 }} className="flex-shrink-0 flex flex-col gap-4 overflow-hidden">
							<div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl p-5 flex flex-col h-[60vh] min-w-[320px]">
								<h3 className="font-black text-slate-800 flex items-center gap-2 mb-4"><SchoolIcon size={18} className="text-indigo-500" /> {t('students.sidebar.structure')}</h3>
								<SchoolSelect schools={schools} selectedId={selectedSchoolId} onSelect={setSelectedSchoolId} />
								{selectedSchoolId && (
									<div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
										{Object.entries(groupedClasses).map(([gradeStr, list]: any) => {
											const grade = Number(gradeStr);
											const isExpanded = expandedGrades.includes(grade);
											return (
												<div key={grade} className={`rounded-xl border transition-all ${selectedGradeLevel === grade ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
													<div onClick={() => { setSelectedGradeLevel(grade); setSelectedClassId(null); setSearchQuery(''); }} className="flex justify-between items-center cursor-pointer font-bold text-sm text-slate-700 p-3 hover:bg-white/50 rounded-xl transition-colors">
														<div className="flex items-center gap-2">
															<button onClick={(e) => toggleGradeAccordion(grade, e)} className="p-1 hover:bg-slate-200 rounded-md text-slate-400">{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
															<span>{t('students.sidebar.grade_group', { grade })}</span>
														</div>
														<span className="text-slate-400 text-xs bg-white px-2 py-0.5 rounded border border-slate-100 shadow-sm">{list.reduce((a: any, c: any) => a + c.students_count, 0)}</span>
													</div>
													<AnimatePresence>
														{isExpanded && (
															<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
																<div className="p-2 pt-0 space-y-1">
																	{list.map((c: any) => (
																		<button key={c.id} onClick={(e) => { e.stopPropagation(); setSelectedClassId(c.id); setSelectedGradeLevel(null); setSearchQuery(''); }} className={`w-full flex justify-between p-2 pl-9 rounded-lg text-sm font-bold transition-all ${selectedClassId === c.id ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
																			<span>{c.grade_level}-{c.section}</span><span className="text-xs bg-slate-200/50 px-1.5 rounded">{c.students_count}</span>
																		</button>
																	))}
																</div>
															</motion.div>
														)}
													</AnimatePresence>
												</div>
											);
										})}
									</div>
								)}
							</div>
							<div className="space-y-2 min-w-[320px]">
								<button onClick={handleImportClick} disabled={!selectedSchoolId} className="w-full py-4 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg flex items-center justify-center gap-2"><UploadCloud size={20} /> {t('students.sidebar.import_btn')}</button>
								<button onClick={() => handleExport('excel')} className="w-full py-4 rounded-[2rem] bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 font-bold shadow-sm flex items-center justify-center gap-3"><Download size={20} /> {t('students.sidebar.download_all_btn')}</button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			<AnimatePresence>
				{selectedIds.length > 0 && (
					<motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-8 left-0 right-0 mx-auto w-fit z-50 flex items-center gap-2 p-2 bg-slate-900 text-white rounded-full shadow-2xl pl-5 pr-2">
						<span className="font-bold text-sm mr-2">{selectedIds.length} {t('students.actions.selected')}</span>
						<div className="h-6 w-px bg-slate-700 mx-1"></div>
						<button onClick={() => setIsTransferModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-500 rounded-full font-bold text-xs transition-colors"><ArrowRightCircle size={14} /> {t('students.actions.transfer')}</button>

						{/* 🔥 ОБНОВЛЕННАЯ КНОПКА ГЕНЕРАЦИИ */}
						<button
							onClick={handleGenerateClick}
							className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 rounded-full font-bold text-xs transition-colors shadow-lg shadow-orange-500/30"
							title={t('students.actions.generate_pass')}
						>
							<Wand2 size={14} />
							<span className="hidden sm:inline">{t('students.actions.generate_pass')}</span>
						</button>

						<button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-500 rounded-full font-bold text-xs transition-colors"><FileText size={14} /> {t('students.actions.export_pass')}</button>
						<button onClick={() => handleExport('excel')} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-full font-bold text-xs transition-colors"><FileSpreadsheet size={14} /> Excel</button>
						<div className="h-6 w-px bg-slate-700 mx-1"></div>
						<button onClick={() => setIsDeleteModalOpen(true)} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-full font-bold text-xs flex items-center gap-2"><Trash2 size={14} /> {t('students.actions.delete')}</button>
						<button onClick={() => setSelectedIds([])} className="p-2 hover:bg-slate-800 rounded-full ml-1"><CloseIcon size={18} className="text-slate-400 hover:text-white" /></button>
					</motion.div>
				)}
			</AnimatePresence>

			{/* CREATE MODAL */}
			{isCreateModalOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)}>
					<div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
						<div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center text-xs font-bold text-slate-500">
							<div className="flex gap-4"><span className="flex items-center gap-1"><Building2 size={14} /> {activeSchool?.name.substring(0, 20)}...</span><span className="flex items-center gap-1 text-indigo-600"><Users size={14} /> {activeClass ? `${activeClass.grade_level}-${activeClass.section}` : t('students.modals.create.class_not_selected')}</span></div>
							<span className="bg-slate-200 px-2 py-1 rounded text-slate-600">ID: {editingStudent ? editingStudent.custom_id : t('students.modals.create.auto_id')}</span>
						</div>
						<div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white"><h3 className="text-2xl font-black flex items-center gap-2"><UserPlus size={24} /> {editingId ? t('students.modals.create.edit_title') : t('students.modals.create.new_title')}</h3></div>
						<div className="flex border-b border-slate-100">{['ru', 'tj', 'en'].map((lang) => (<button key={lang} onClick={() => setActiveTab(lang as any)} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === lang ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}>{lang.toUpperCase()}</button>))}</div>
						<form onSubmit={handleSaveSubmit} className="p-6 space-y-4">
							<div className="min-h-[140px]">
								{activeTab === 'ru' && (<div><div className="mb-4"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t('students.modals.create.last_name')} (RU)</label><input className="w-full px-4 py-3 rounded-xl bg-slate-50 border font-bold" value={formData.last_name_ru} onChange={e => setFormData({ ...formData, last_name_ru: e.target.value })} autoFocus /></div><div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t('students.modals.create.first_name')} (RU)</label><input className="w-full px-4 py-3 rounded-xl bg-slate-50 border font-bold" value={formData.first_name_ru} onChange={e => setFormData({ ...formData, first_name_ru: e.target.value })} /></div></div>)}
								{activeTab === 'tj' && (<div><div className="mb-4"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t('students.modals.create.last_name')} (TJ)</label><input className="w-full px-4 py-3 rounded-xl bg-slate-50 border font-bold" value={formData.last_name_tj} onChange={e => setFormData({ ...formData, last_name_tj: e.target.value })} /></div><div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t('students.modals.create.first_name')} (TJ)</label><input className="w-full px-4 py-3 rounded-xl bg-slate-50 border font-bold" value={formData.first_name_tj} onChange={e => setFormData({ ...formData, first_name_tj: e.target.value })} /></div></div>)}
								{activeTab === 'en' && (<div><div className="mb-4"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t('students.modals.create.last_name')} (EN)</label><input className="w-full px-4 py-3 rounded-xl bg-slate-50 border font-bold" value={formData.last_name_en} onChange={e => setFormData({ ...formData, last_name_en: e.target.value })} /></div><div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t('students.modals.create.first_name')} (EN)</label><input className="w-full px-4 py-3 rounded-xl bg-slate-50 border font-bold" value={formData.first_name_en} onChange={e => setFormData({ ...formData, first_name_en: e.target.value })} /></div></div>)}
							</div>
							<div className="mb-4"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t('students.modals.create.password_label')}</label><div className="relative"><input type={formData.showPassword ? "text" : "password"} className="w-full px-4 py-3 rounded-xl bg-slate-50 border font-bold outline-none pr-10" placeholder={editingId ? t('students.modals.create.password_placeholder_edit') : t('students.modals.create.password_placeholder_new')} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} /><button type="button" onClick={() => setFormData(prev => ({ ...prev, showPassword: !prev.showPassword }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors">{formData.showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div></div>
							<div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100"><div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t('students.table.class')}</label><select className="w-full px-4 py-3 rounded-xl bg-slate-50 border font-bold outline-none" value={formData.student_class} onChange={e => setFormData({ ...formData, student_class: e.target.value })} required><option value="">...</option>{classes.map(c => <option key={c.id} value={c.id}>{c.grade_level}-{c.section}</option>)}</select></div><div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t('students.modals.create.gender_label')}</label><div className="flex bg-slate-50 p-1 rounded-xl border"><button type="button" onClick={() => setFormData({ ...formData, gender: 'male' })} className={`flex-1 py-2 rounded-lg text-sm font-bold ${formData.gender === 'male' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{t('students.modals.create.gender_m')}</button><button type="button" onClick={() => setFormData({ ...formData, gender: 'female' })} className={`flex-1 py-2 rounded-lg text-sm font-bold ${formData.gender === 'female' ? 'bg-pink-500 text-white' : 'text-slate-500'}`}>{t('students.modals.create.gender_f')}</button></div></div></div>
							<div className="flex gap-3 mt-4"><button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50">{t('students.modals.create.cancel')}</button><button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg">{editingId ? t('students.modals.create.save') : t('students.modals.create.create')}</button></div>
						</form>
					</div>
				</div>
			)}

			{/* Transfer Modal */}
			{isTransferModalOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsTransferModalOpen(false)}>
					<div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-6 text-center" onClick={e => e.stopPropagation()}>
						<div className="w-16 h-16 bg-violet-50 text-violet-600 rounded-full flex items-center justify-center mx-auto mb-4"><ArrowRightCircle size={32} /></div>
						<h3 className="text-xl font-black text-slate-800">{t('students.modals.transfer.title')} ({selectedIds.length})</h3>
						<p className="text-sm text-slate-500 mb-6">{t('students.modals.transfer.subtitle')}</p>
						<div className="space-y-3 mb-6">
							<button onClick={() => setTransferType('class')} className={`w-full p-4 rounded-xl border-2 font-bold text-left transition-all ${transferType === 'class' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-100 hover:border-slate-300'}`}><span className="block text-sm">{t('students.modals.transfer.to_class')}</span></button>
							{transferType === 'class' && (<select className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none outline-none" value={targetClassId} onChange={e => setTargetClassId(e.target.value)}><option value="">{t('students.modals.transfer.select_class')}</option>{classes.map(c => <option key={c.id} value={c.id}>{c.grade_level}-{c.section}</option>)}</select>)}
							<button onClick={() => setTransferType('next_year')} className={`w-full p-4 rounded-xl border-2 font-bold text-left transition-all ${transferType === 'next_year' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-100 hover:border-slate-300'}`}><span className="block text-sm">{t('students.modals.transfer.next_year')}</span></button>
							<button onClick={() => setTransferType('archive')} className={`w-full p-4 rounded-xl border-2 font-bold text-left transition-all ${transferType === 'archive' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-100 hover:border-slate-300'}`}><span className="block text-sm">{t('students.modals.transfer.archive')}</span></button>
						</div>
						<button onClick={handleTransferSubmit} className="w-full py-3 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-lg">{t('students.modals.transfer.confirm')}</button>
					</div>
				</div>
			)}

			{/* Password Modal */}
			{isPasswordModalOpen && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md" onClick={() => setIsPasswordModalOpen(false)}>
					<div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
						<div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4"><Key size={32} /></div>
						<h3 className="text-xl font-black text-slate-800">{t('students.modals.password.title')}</h3>
						<p className="text-sm text-slate-500 mb-6">{passwordData.studentName}</p>
						<div className="relative mb-4"><input type={passwordData.isVisible ? "text" : "password"} className="w-full px-4 py-3 rounded-xl bg-slate-50 border font-mono font-bold text-center text-lg outline-none pr-10" value={passwordData.newPassword} onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} placeholder={t('students.modals.password.placeholder')} /><button onClick={() => setPasswordData(prev => ({ ...prev, isVisible: !prev.isVisible }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600">{passwordData.isVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
						<button onClick={handlePasswordReset} className="w-full py-3 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-lg">{t('students.modals.password.save')}</button>
					</div>
				</div>
			)}

			{/* Delete Modal */}
			<AnimatePresence>
				{isDeleteModalOpen && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => setIsDeleteModalOpen(false)}>
						<motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-6 text-center border-t-4 border-rose-500" onClick={e => e.stopPropagation()}>
							<div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"><AlertTriangle size={40} /></div>
							<h3 className="text-2xl font-black text-slate-800 mb-2">{t('students.modals.delete.title')}</h3>
							<p className="text-slate-500 font-medium mb-6 leading-relaxed">{t('students.modals.delete.desc_part1')} <span className="text-slate-900 font-bold bg-slate-100 px-1 rounded">{selectedIds.length}</span> {t('students.modals.delete.desc_part2')}<br /><span className="text-rose-500 font-bold text-xs uppercase tracking-wider block mt-2">{t('students.modals.delete.warning')}</span></p>
							<div className="flex gap-3">
								<button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">{t('students.modals.create.cancel')}</button>
								<button onClick={performDelete} disabled={isDeleting} className="flex-1 py-3.5 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2">{isDeleting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}<span>{t('students.modals.delete.btn_delete')}</span></button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* --- 🔥 МОДАЛКА ПОДТВЕРЖДЕНИЯ ГЕНЕРАЦИИ (Вместо alert) --- */}
			<AnimatePresence>
				{isGenerateConfirmOpen && (
					<motion.div
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
						onClick={() => setIsGenerateConfirmOpen(false)}
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
							className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center border-t-4 border-orange-500 relative overflow-hidden"
							onClick={e => e.stopPropagation()}
						>
							<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500"></div>

							<div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-orange-50/50">
								<Key size={36} />
							</div>

							<h3 className="text-2xl font-black text-slate-800 mb-3">{t('students.modals.generate.title')}</h3>
							<p className="text-slate-500 font-medium text-sm mb-8 leading-relaxed">
								{t('students.modals.generate.desc_part1')} <span className="text-slate-900 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{selectedIds.length}</span> {t('students.modals.generate.desc_part2')}
								<br />
								{t('students.modals.generate.warning')} <span className="text-red-500 font-bold">{t('students.modals.generate.desc_part3')}</span>
								<br /><br />
								{t('students.modals.generate.continue')}
							</p>

							<div className="flex gap-3">
								<button onClick={() => setIsGenerateConfirmOpen(false)} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
									{t('students.modals.create.cancel')}
								</button>
								<button onClick={performGeneratePasswords} className="flex-1 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg shadow-orange-500/30 transition-transform active:scale-95">
									{t('students.modals.generate.btn_generate')}
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* --- 🔥 УНИВЕРСАЛЬНОЕ УВЕДОМЛЕНИЕ (Success / Error) --- */}
			<AnimatePresence>
				{notification.isOpen && (
					<motion.div
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
						onClick={closeNotification}
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
							className={`bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 text-center border-t-4 relative overflow-hidden ${notification.type === 'success' ? 'border-emerald-500' : 'border-rose-500'}`}
							onClick={e => e.stopPropagation()}
						>
							<div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
								{notification.type === 'success' ? (
									<CheckCircle2 size={48} strokeWidth={3} className="drop-shadow-sm" />
								) : (
									<AlertTriangle size={48} strokeWidth={3} className="drop-shadow-sm" />
								)}
							</div>

							<h3 className={`text-3xl font-black mb-3 tracking-tight ${notification.type === 'success' ? 'text-emerald-900' : 'text-slate-800'}`}>
								{notification.title}
							</h3>

							<p className="text-slate-500 font-medium text-base mb-8 leading-relaxed">
								{notification.message}
							</p>

							<button
								onClick={closeNotification}
								className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-xl transition-transform hover:-translate-y-1 active:scale-95 ${notification.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30' : 'bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/30'}`}
							>
								{notification.type === 'success' ? t('students.messages.btn_cool') : t('students.messages.btn_understood')}
							</button>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* IMPORT WIZARD */}
			<ImportWizard
				isOpen={isImportWizardOpen}
				onClose={() => setIsImportWizardOpen(false)}
				schoolId={selectedSchoolId!}
				onSuccess={() => { fetchStructure(); fetchStudents(); }}
			/>

		</div>
	);
};

export default Students;