import React, { useState } from 'react';
import StudentSidebar from './StudentSidebar';
import StudentHeader from './StudentHeader';

interface LayoutProps {
	children: React.ReactNode;
	onLogout: () => void;
}

const StudentLayout: React.FC<LayoutProps> = ({ children, onLogout }) => {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	return (
		<div className="min-h-screen bg-slate-50 relative font-sans text-slate-900 overflow-x-hidden">

			{/* 🔥 ФОНОВЫЕ ЭФФЕКТЫ (КАК В АДМИНКЕ) */}
			<div className="fixed top-0 -left-4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob pointer-events-none -z-10"></div>
			<div className="fixed top-0 -right-4 w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 pointer-events-none -z-10"></div>
			<div className="fixed -bottom-8 left-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000 pointer-events-none -z-10"></div>
			<div className="fixed inset-0 opacity-[0.03] pointer-events-none -z-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

			{/* САЙДБАР */}
			<StudentSidebar
				isOpen={isMobileMenuOpen}
				isCollapsed={isCollapsed}
				toggleCollapse={() => setIsCollapsed(!isCollapsed)}
				closeMobile={() => setIsMobileMenuOpen(false)}
				logout={onLogout}
			/>

			{/* ОСНОВНОЙ КОНТЕНТ */}
			<main className={`
                min-h-screen flex flex-col transition-all duration-300 relative z-10
                ${isCollapsed ? 'lg:ml-[7rem]' : 'lg:ml-[18rem]'} 
                ml-0
            `}>
				<div className="sticky top-0 z-40 px-0">
					<StudentHeader
						onLogout={onLogout}
						onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
					/>
				</div>

				<div className="flex-1 px-4 sm:px-8 pb-8 animate-fade-in-up mt-4">
					{children}
				</div>
			</main>
		</div>
	);
};

export default StudentLayout;