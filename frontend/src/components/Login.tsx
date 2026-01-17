import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Loader2, Sparkles, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
	setToken: (token: string) => void;
}

const Login = ({ setToken }: LoginProps) => {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();

	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	// --- 3D Эффект ---
	const x = useMotionValue(0);
	const y = useMotionValue(0);
	const rotateX = useTransform(y, [-100, 100], [5, -5]);
	const rotateY = useTransform(x, [-100, 100], [-5, 5]);

	// Частицы
	const [particles, setParticles] = useState<{ x: number; y: number; delay: number; duration: number }[]>([]);

	useEffect(() => {
		// ЧИСТИМ СТАРЫЕ ДАННЫЕ ПРИ ВХОДЕ
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		localStorage.removeItem('user_role'); // 🔥 Чистим роль
		localStorage.removeItem('schoolSettings');

		const newParticles = Array.from({ length: 15 }).map(() => ({
			x: Math.random() * 100,
			y: Math.random() * 100,
			delay: Math.random() * 5,
			duration: 10 + Math.random() * 20,
		}));
		setParticles(newParticles);
	}, []);

	const handleMouseMove = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		const rect = event.currentTarget.getBoundingClientRect();
		const width = rect.width;
		const height = rect.height;
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;
		const xPct = mouseX / width - 0.5;
		const yPct = mouseY / height - 0.5;
		x.set(xPct * 200);
		y.set(yPct * 200);
	};

	const handleMouseLeave = () => {
		x.set(0); y.set(0);
	};

	// 🔥 ВОТ ЗДЕСЬ ОБНОВЛЕННАЯ ЛОГИКА
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');

		try {
			// 1. ПОЛУЧАЕМ ТОКЕН
			const response = await axios.post('http://127.0.0.1:8000/auth/jwt/create/', {
				username,
				password
			});

			const newToken = response.data.access;
			setToken(newToken);
			localStorage.setItem('token', newToken);

			// 2. ЗАГРУЖАЕМ ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
			try {
				const meResponse = await axios.get('http://127.0.0.1:8000/auth/users/me/', {
					headers: { Authorization: `JWT ${newToken}` }
				});

				const userData = meResponse.data;
				localStorage.setItem('user', JSON.stringify(userData));

				// 🔥 3. ВАЖНО: ОПРЕДЕЛЯЕМ И СОХРАНЯЕМ РОЛЬ
				const userRole = userData.profile?.role || 'student';
				localStorage.setItem('user_role', userRole);

				// 4. СОХРАНЯЕМ ДАННЫЕ О ШКОЛЕ
				if (userData.profile && userData.profile.school) {
					const schoolSettings = {
						name: userData.profile.school.name,
						logo: userData.profile.school.logo
					};
					localStorage.setItem('schoolSettings', JSON.stringify(schoolSettings));
				} else {
					localStorage.removeItem('schoolSettings');
				}

				// 5. УВЕДОМЛЯЕМ САЙДБАР ОБ ИЗМЕНЕНИЯХ
				window.dispatchEvent(new Event('schoolDataChanged'));

				// 🔥 6. УМНЫЙ РЕДИРЕКТ
				if (userRole === 'student') {
					navigate('/student'); // Ученики -> в свой кабинет
				} else {
					navigate('/admin');   // Админы/Учителя -> в админку
				}

			} catch (userError) {
				console.warn("Ошибка загрузки профиля", userError);
				// Если ошибка профиля, но токен есть — кидаем в админку как fallback
				navigate('/admin');
			}

		} catch (err) {
			console.error("Login error:", err);
			setError(t('auth.error_generic') || "Ошибка входа. Проверьте данные.");
			setIsLoading(false);
		}
	};

	const changeLanguage = (lng: string) => {
		i18n.changeLanguage(lng);
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-700">
			{/* ФОН (Твой оригинальный код) */}
			<div className="absolute inset-0 z-0 opacity-[0.3] animate-grid-flow pointer-events-none" style={{ backgroundImage: 'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(to right, #6366f1 1px, transparent 1px)', backgroundSize: '50px 50px', maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)', WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)' }}></div>
			<div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
				<div className="absolute top-[10%] left-[10%] w-[600px] h-[600px] bg-purple-400/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob"></div>
				<div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-indigo-300/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"></div>
				<div className="absolute -bottom-[10%] left-[30%] w-[700px] h-[700px] bg-pink-300/20 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-4000"></div>
			</div>

			{/* КАРТОЧКА (Твой оригинальный 3D код) */}
			<motion.div className="relative w-full max-w-[400px] mx-4 p-0 perspective-1000 z-10" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", duration: 0.8 }} style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
				<div className="absolute inset-6 bg-white/40 blur-3xl rounded-full -z-10"></div>
				<div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-white/60 relative overflow-hidden group">

					{/* Языки */}
					<div className="flex justify-center mb-4 sm:mb-0 sm:absolute sm:top-6 sm:right-6 z-20 relative">
						<div className="bg-white/50 backdrop-blur-md p-1 rounded-xl flex items-center gap-1 shadow-sm border border-white/50">
							{['ru', 'tj', 'en'].map((lang) => (
								<button key={lang} onClick={() => changeLanguage(lang)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all duration-200 ${i18n.language === lang ? 'bg-white text-indigo-600 shadow-md scale-105 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}>{lang}</button>
							))}
						</div>
					</div>

					<div className="relative z-10 flex flex-col items-center text-center">
						<motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.2 }} className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-indigo-100 to-white rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-inner border border-white">
							<span className="text-4xl sm:text-5xl filter drop-shadow-md transform hover:scale-110 transition-transform cursor-pointer">🚀</span>
						</motion.div>

						<motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mb-2">{t('auth.welcome_title')}</motion.h1>
						<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-slate-500 font-bold text-xs max-w-[200px] leading-relaxed mb-6 sm:mb-8">{t('auth.welcome_subtitle')}</motion.p>

						<AnimatePresence>
							{error && (
								<motion.div initial={{ opacity: 0, height: 0, mb: 0 }} animate={{ opacity: 1, height: 'auto', marginBottom: 24 }} exit={{ opacity: 0, height: 0, mb: 0 }} className="w-full bg-red-50/80 backdrop-blur-sm text-red-500 text-xs font-bold py-3 rounded-xl border border-red-100 flex items-center justify-center gap-2 overflow-hidden">
									<span className="text-lg">⚠️</span> {error}
								</motion.div>
							)}
						</AnimatePresence>

						<form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-5">
							<div className="text-left group">
								<label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1.5 transition-colors group-focus-within:text-indigo-500">{t('auth.username')}</label>
								<div className={`typing-container relative transform transition-all duration-300 focus-within:scale-[1.02] ${username ? 'has-value' : ''}`}>
									<input type="text" className="w-full bg-white/60 border-2 border-slate-100 rounded-2xl px-5 py-3 sm:py-4 text-slate-800 font-bold text-sm placeholder:text-transparent focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm typing-placeholder" placeholder="zafar" value={username} onChange={(e) => setUsername(e.target.value)} />
								</div>
							</div>

							<div className="text-left group">
								<label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1.5 transition-colors group-focus-within:text-indigo-500">{t('auth.password')}</label>
								<div className="relative transform transition-all duration-300 focus-within:scale-[1.02]">
									<input type={showPassword ? "text" : "password"} className="w-full bg-white/60 border-2 border-slate-100 rounded-2xl px-5 py-3 sm:py-4 text-slate-800 font-bold text-sm focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm pr-12" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
									<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500 transition-colors p-1">
										{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
									</button>
								</div>
							</div>

							<motion.button type="submit" disabled={isLoading} whileHover={{ scale: 1.03, boxShadow: "0 15px 35px -10px rgba(99, 102, 241, 0.4)" }} whileTap={{ scale: 0.98 }} className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black py-3 sm:py-4 rounded-2xl shadow-xl shadow-indigo-200 transition-all relative overflow-hidden group">
								<div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300 rounded-2xl"></div>
								<span className="relative z-10 flex items-center justify-center gap-2">
									{isLoading ? <><Loader2 className="animate-spin" size={20} /><span>{t('auth.logging_in')}</span></> : <><span>{t('auth.login_btn')}</span><Sparkles size={18} className="animate-pulse" /></>}
								</span>
							</motion.button>
						</form>
					</div>
				</div>
				<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-center text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase mt-8 absolute bottom-[-50px] w-full">{t('auth.copyright')}</motion.p>
			</motion.div>
		</div>
	);
};

export default Login;