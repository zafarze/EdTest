import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next'; // 1. Импорт хука
import {
	Globe,
	GraduationCap,
	Shield,
	Bell,
	Palette,
	Save,
	Check,
	Moon,
	Sun,
	Smartphone,
	Mail,
	Lock,
	Server,
	Clock,
	AlertTriangle,
	UploadCloud
} from 'lucide-react';

// --- КОМПОНЕНТЫ UI (Внутренние) ---

const Toggle = ({ label, checked, onChange, description }: any) => (
	<div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
		<div className="pr-4">
			<h4 className="text-sm font-bold text-slate-700">{label}</h4>
			{description && <p className="text-xs text-slate-400 font-medium mt-0.5">{description}</p>}
		</div>
		<button
			onClick={() => onChange(!checked)}
			className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${checked ? 'bg-indigo-500' : 'bg-slate-200'}`}
		>
			<div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
		</button>
	</div>
);

const InputField = ({ label, icon: Icon, type = "text", placeholder, value, onChange }: any) => (
	<div className="space-y-1.5">
		<label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
		<div className="relative group">
			<div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
				<Icon size={18} />
			</div>
			<input
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-300 placeholder:font-medium"
			/>
		</div>
	</div>
);

const SelectField = ({ label, icon: Icon, options, value, onChange }: any) => (
	<div className="space-y-1.5">
		<label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
		<div className="relative group">
			<div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
				<Icon size={18} />
			</div>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer"
			>
				{options.map((opt: any) => (
					<option key={opt.value} value={opt.value}>{opt.label}</option>
				))}
			</select>
			<div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
			</div>
		</div>
	</div>
);

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
const Settings = () => {
	const { t } = useTranslation(); // 2. Инициализация хука
	const [activeTab, setActiveTab] = useState('general');
	const [isSaving, setIsSaving] = useState(false);

	// --- MOCK STATE ---
	const [siteName, setSiteName] = useState('GAT Premium Platform');
	const [language, setLanguage] = useState('ru');
	const [timezone, setTimezone] = useState('dushanbe');
	const [gradingSystem, setGradingSystem] = useState('100');
	const [passMark, setPassMark] = useState(60);
	const [currentYear, setCurrentYear] = useState('2024-2025');
	const [maintenanceMode, setMaintenanceMode] = useState(false);
	const [allowRegistration, setAllowRegistration] = useState(false);
	const [force2FA, setForce2FA] = useState(false);
	const [emailAlerts, setEmailAlerts] = useState(true);
	const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
	const [telegramBotToken, setTelegramBotToken] = useState('');
	const [theme, setTheme] = useState('light');
	const [primaryColor, setPrimaryColor] = useState('indigo');

	const handleSave = () => {
		setIsSaving(true);
		setTimeout(() => {
			setIsSaving(false);
		}, 1500);
	};

	const tabs = [
		{ id: 'general', label: t('settings_page.tabs.general'), icon: Globe },
		{ id: 'academic', label: t('settings_page.tabs.academic'), icon: GraduationCap },
		{ id: 'security', label: t('settings_page.tabs.security'), icon: Shield },
		{ id: 'notifications', label: t('settings_page.tabs.notifications'), icon: Bell },
		{ id: 'appearance', label: t('settings_page.tabs.appearance'), icon: Palette },
	];

	return (
		<div className="w-full pb-10">

			{/* ЗАГОЛОВОК */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
				<div>
					<h1 className="text-3xl font-black text-slate-800 tracking-tight">{t('settings_page.title')}</h1>
					<p className="text-slate-500 font-medium text-sm mt-1">{t('settings_page.subtitle')}</p>
				</div>

				<button
					onClick={handleSave}
					disabled={isSaving}
					className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
				>
					{isSaving ? (
						<>
							<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
							<span>{t('settings_page.saving')}</span>
						</>
					) : (
						<>
							<Save size={18} />
							<span>{t('settings_page.save_btn')}</span>
						</>
					)}
				</button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

				{/* --- МЕНЮ (Tabs) --- */}
				<div className="lg:col-span-3">
					<div className="bg-white/60 backdrop-blur-xl border border-white/60 shadow-xl shadow-slate-200/50 rounded-2xl p-2 sticky top-24">
						{tabs.map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 relative overflow-hidden group ${activeTab === tab.id
									? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
									: 'text-slate-500 hover:bg-white hover:text-slate-800'
									}`}
							>
								<tab.icon size={18} className={activeTab === tab.id ? 'text-indigo-200' : 'text-slate-400 group-hover:text-indigo-500'} />
								<span className="relative z-10">{tab.label}</span>
								{activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute inset-0 bg-indigo-600 z-0" />}
							</button>
						))}
					</div>
				</div>

				{/* --- КОНТЕНТ --- */}
				<div className="lg:col-span-9">
					<AnimatePresence mode="wait">
						<motion.div
							key={activeTab}
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.2 }}
							className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl shadow-slate-200/50 rounded-[2rem] p-6 md:p-8 relative overflow-hidden"
						>
							<div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 -z-10"></div>

							{/* === TAB 1: ОБЩИЕ === */}
							{activeTab === 'general' && (
								<div className="space-y-8">
									<div className="flex items-center gap-4 mb-6">
										<div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600"><Globe size={24} /></div>
										<div>
											<h3 className="text-xl font-black text-slate-800">{t('settings_page.general.title')}</h3>
											<p className="text-sm text-slate-500 font-medium">{t('settings_page.general.subtitle')}</p>
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<InputField
											label={t('settings_page.general.platform_name')}
											icon={Smartphone}
											value={siteName}
											onChange={setSiteName}
											placeholder="GAT Platform"
										/>
										<SelectField
											label={t('settings_page.general.language')}
											icon={Globe}
											value={language}
											onChange={setLanguage}
											options={[
												{ value: 'ru', label: 'Русский' },
												{ value: 'tj', label: 'Тоҷикӣ' },
												{ value: 'en', label: 'English' }
											]}
										/>
										<SelectField
											label={t('settings_page.general.timezone')}
											icon={Clock}
											value={timezone}
											onChange={setTimezone}
											options={[
												{ value: 'dushanbe', label: '(GMT+05:00) Dushanbe' },
												{ value: 'tashkent', label: '(GMT+05:00) Tashkent' },
												{ value: 'moscow', label: '(GMT+03:00) Moscow' }
											]}
										/>
									</div>

									<div className="border-t border-slate-100 pt-6">
										<label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">{t('settings_page.general.logo_label')}</label>
										<div className="flex items-center gap-6">
											<div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
												<UploadCloud size={24} />
											</div>
											<div>
												<button className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors">{t('settings_page.general.upload_btn')}</button>
												<p className="text-xs text-slate-400 mt-2">{t('settings_page.general.upload_desc')}</p>
											</div>
										</div>
									</div>
								</div>
							)}

							{/* === TAB 2: УЧЕБНЫЕ === */}
							{activeTab === 'academic' && (
								<div className="space-y-8">
									<div className="flex items-center gap-4 mb-6">
										<div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600"><GraduationCap size={24} /></div>
										<div>
											<h3 className="text-xl font-black text-slate-800">{t('settings_page.academic.title')}</h3>
											<p className="text-sm text-slate-500 font-medium">{t('settings_page.academic.subtitle')}</p>
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
										<SelectField
											label={t('settings_page.academic.current_year')}
											icon={Clock}
											value={currentYear}
											onChange={setCurrentYear}
											options={[
												{ value: '2024-2025', label: '2024 - 2025' },
												{ value: '2023-2024', label: '2023 - 2024' },
											]}
										/>
										<SelectField
											label={t('settings_page.academic.grading_system')}
											icon={Check}
											value={gradingSystem}
											onChange={setGradingSystem}
											options={[
												{ value: '100', label: '100 (Max)' },
												{ value: '5', label: '5 (CIS)' },
												{ value: 'letters', label: 'A-F (USA)' },
											]}
										/>
									</div>

									<div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
										<div className="flex justify-between items-center mb-4">
											<label className="text-sm font-bold text-slate-700">{t('settings_page.academic.pass_mark')}</label>
											<span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg text-xs font-bold">{passMark}%</span>
										</div>
										<input
											type="range"
											min="0" max="100"
											value={passMark}
											onChange={(e) => setPassMark(Number(e.target.value))}
											className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
										/>
										<p className="text-xs text-slate-400 mt-2 font-medium">{t('settings_page.academic.pass_mark_desc')}</p>
									</div>
								</div>
							)}

							{/* === TAB 3: БЕЗОПАСНОСТЬ === */}
							{activeTab === 'security' && (
								<div className="space-y-8">
									<div className="flex items-center gap-4 mb-6">
										<div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600"><Shield size={24} /></div>
										<div>
											<h3 className="text-xl font-black text-slate-800">{t('settings_page.security.title')}</h3>
											<p className="text-sm text-slate-500 font-medium">{t('settings_page.security.subtitle')}</p>
										</div>
									</div>

									<div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3 mb-6">
										<AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
										<div>
											<h4 className="text-sm font-bold text-amber-800">{t('settings_page.security.maintenance_title')}</h4>
											<p className="text-xs text-amber-600 mt-1 font-medium leading-relaxed">
												{t('settings_page.security.maintenance_desc')}
											</p>
										</div>
										<div className="ml-auto">
											<Toggle checked={maintenanceMode} onChange={setMaintenanceMode} label="" />
										</div>
									</div>

									<div className="space-y-1">
										<Toggle
											label={t('settings_page.security.allow_reg')}
											description={t('settings_page.security.allow_reg_desc')}
											checked={allowRegistration}
											onChange={setAllowRegistration}
										/>
										<Toggle
											label={t('settings_page.security.force_2fa')}
											description={t('settings_page.security.force_2fa_desc')}
											checked={force2FA}
											onChange={setForce2FA}
										/>
									</div>
								</div>
							)}

							{/* === TAB 4: УВЕДОМЛЕНИЯ === */}
							{activeTab === 'notifications' && (
								<div className="space-y-8">
									<div className="flex items-center gap-4 mb-6">
										<div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600"><Bell size={24} /></div>
										<div>
											<h3 className="text-xl font-black text-slate-800">{t('settings_page.notifications.title')}</h3>
											<p className="text-sm text-slate-500 font-medium">{t('settings_page.notifications.subtitle')}</p>
										</div>
									</div>

									<Toggle
										label={t('settings_page.notifications.email_alerts')}
										checked={emailAlerts}
										onChange={setEmailAlerts}
										description={t('settings_page.notifications.email_desc')}
									/>

									{emailAlerts && (
										<motion.div
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: 'auto' }}
											className="bg-slate-50 rounded-2xl p-6 border border-slate-100 grid gap-4 overflow-hidden"
										>
											<h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
												<Server size={16} className="text-slate-400" /> {t('settings_page.notifications.smtp_title')}
											</h4>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<InputField label="SMTP Host" icon={Server} value={smtpHost} onChange={setSmtpHost} />
												<InputField label="Port" icon={Server} placeholder="587" value="587" onChange={() => { }} />
												<InputField label="Username" icon={Mail} placeholder="admin@gat.tj" value="" onChange={() => { }} />
												<InputField label="Password" icon={Lock} type="password" placeholder="••••••" value="" onChange={() => { }} />
											</div>
										</motion.div>
									)}

									<div className="pt-4 border-t border-slate-100">
										<InputField
											label={t('settings_page.notifications.telegram_token')}
											icon={Lock}
											placeholder="123456:ABC-DEF..."
											value={telegramBotToken}
											onChange={setTelegramBotToken}
										/>
										<p className="text-xs text-slate-400 mt-2 ml-1">{t('settings_page.notifications.telegram_desc')}</p>
									</div>
								</div>
							)}

							{/* === TAB 5: ВНЕШНИЙ ВИД === */}
							{activeTab === 'appearance' && (
								<div className="space-y-8">
									<div className="flex items-center gap-4 mb-6">
										<div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600"><Palette size={24} /></div>
										<div>
											<h3 className="text-xl font-black text-slate-800">{t('settings_page.appearance.title')}</h3>
											<p className="text-sm text-slate-500 font-medium">{t('settings_page.appearance.subtitle')}</p>
										</div>
									</div>

									<div>
										<label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-4">{t('settings_page.appearance.theme_label')}</label>
										<div className="grid grid-cols-3 gap-4">
											{[
												{ id: 'light', label: t('settings_page.appearance.themes.light'), icon: Sun },
												{ id: 'dark', label: t('settings_page.appearance.themes.dark'), icon: Moon },
												{ id: 'system', label: t('settings_page.appearance.themes.system'), icon: Smartphone },
											].map(opt => (
												<button
													key={opt.id}
													onClick={() => setTheme(opt.id)}
													className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${theme === opt.id
														? 'border-indigo-500 bg-indigo-50 text-indigo-700'
														: 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-white hover:border-slate-200'
														}`}
												>
													<opt.icon size={24} />
													<span className="text-sm font-bold">{opt.label}</span>
												</button>
											))}
										</div>
									</div>

									<div className="pt-4">
										<label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-4">{t('settings_page.appearance.accent_color')}</label>
										<div className="flex gap-4">
											{['indigo', 'emerald', 'rose', 'amber', 'blue'].map(color => (
												<button
													key={color}
													onClick={() => setPrimaryColor(color)}
													className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${primaryColor === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
														}`}
													style={{ backgroundColor: `var(--color-${color}-500)` }}
												>
													<div className={`w-10 h-10 rounded-full bg-${color}-500`}></div>
													{primaryColor === color && <Check className="text-white absolute" size={16} />}
												</button>
											))}
										</div>
									</div>
								</div>
							)}

						</motion.div>
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
};

export default Settings;