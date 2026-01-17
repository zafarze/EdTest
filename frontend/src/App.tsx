import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import RoadmapPage from './pages/student/RoadmapPage';
import FacultiesPage from './pages/student/FacultiesPage';

// --- КОМПОНЕНТЫ ---
import Login from './components/Login';
import ExamPage from './components/ExamPage';
import AdminDashboard from './components/AdminDashboard';
import Layout from './components/Layout'; // Admin Layout
import Management from './components/Management';
import Settings from './components/Settings';

// 🔥 ИМПОРТ НОВОГО ЛАЙАУТА СТУДЕНТА
import StudentLayout from './components/student_layout/StudentLayout';

// --- СТРАНИЦЫ УПРАВЛЕНИЯ (MANAGE) ---
import SchoolYears from './pages/manage/SchoolYears';
import Quarters from './pages/manage/Quarters';
import Schools from './pages/manage/Schools';
import Classes from './pages/manage/Classes';
import Subjects from './pages/manage/Subjects';
import QuestionCounts from './pages/manage/QuestionCounts';
import Topics from './pages/manage/Topics';
import QuestionBank from './pages/manage/QuestionBank';
import Tests from './pages/manage/Tests';
import Booklets from './pages/manage/booklets/Booklets';
import BookletPreview from './pages/manage/booklets/BookletPreview';

import Students from './pages/manage/Students';
import Users from './pages/manage/Users';
import Permissions from './pages/manage/Permissions';
import Cleanup from './pages/manage/Cleanup';

// --- СТРАНИЦЫ (PAGES) ---
import Upload from './pages/Upload';
import Analytics from './pages/Analytics';
import AnalyticsAI from './pages/AnalyticsAI';

// Результаты
import GlobalMonitoring from './pages/AllResults';
import ResultsPage from './pages/Results';

// 🔥 НОВЫЕ СТРАНИЦЫ МОНИТОРИНГА
import MonitoringRating from './pages/monitoring/MonitoringRating';
import MonitoringPerformance from './pages/monitoring/MonitoringPerformance';
import MonitoringComparison from './pages/monitoring/MonitoringComparison';
import MonitoringJournal from './pages/monitoring/MonitoringJournal';

// 🔥 ИМПОРТ КАБИНЕТА УЧЕНИКА
import StudentDashboard from './pages/student/StudentDashboard';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const navigate = useNavigate();

  // Сохраняем токен при изменении
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  // 🔥 Функция выхода
  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');     // Чистим роль
    localStorage.removeItem('user');          // Чистим данные юзера
    localStorage.removeItem('schoolSettings'); // Чистим настройки школы
    navigate('/login');
  };

  // Защита маршрутов
  const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    if (!token) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  // 🔥 УМНЫЙ РЕДИРЕКТ (ГЛАВНАЯ ЛОГИКА)
  const RootRedirect = () => {
    if (!token) return <Navigate to="/login" replace />;

    // Получаем роль, которую сохранили при входе
    const role = localStorage.getItem('user_role');

    if (role === 'student') {
      return <Navigate to="/student" replace />;
    }

    // Для admin, teacher, director, deputy и т.д.
    return <Navigate to="/admin" replace />;
  };

  return (
    <Routes>
      {/* 1. ЛОГИН */}
      <Route path="/login" element={<Login setToken={setToken} />} />

      {/* 2. ГЛАВНАЯ (Умный редирект) */}
      <Route path="/" element={<RootRedirect />} />

      {/* 3. 🔥 КАБИНЕТ УЧЕНИКА (C НОВЫМ ЛАЙАУТОМ) */}
      <Route path="/student" element={
        <ProtectedRoute>
          {/* Оборачиваем в StudentLayout, передаем logout туда */}
          <StudentLayout onLogout={logout}>
            <StudentDashboard />
          </StudentLayout>
        </ProtectedRoute>
      } />

      {/* Здесь можно добавить будущие роуты ученика, например: */}
      {/* <Route path="/student/exams" element={<ProtectedRoute><StudentLayout onLogout={logout}><StudentExams /></StudentLayout></ProtectedRoute>} /> */}


      {/* 4. ДАШБОРД АДМИНА */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <Layout onLogout={logout}>
            <AdminDashboard />
          </Layout>
        </ProtectedRoute>
      } />

      {/* 5. ЗАГРУЗКА */}
      <Route path="/admin/upload" element={
        <ProtectedRoute>
          <Layout onLogout={logout}>
            <Upload />
          </Layout>
        </ProtectedRoute>
      } />

      {/* 6. РЕЗУЛЬТАТЫ */}
      <Route path="/admin/results" element={
        <ProtectedRoute>
          <Layout onLogout={logout}>
            <GlobalMonitoring />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/manage/results/:examId" element={
        <ProtectedRoute>
          <Layout onLogout={logout}>
            <ResultsPage />
          </Layout>
        </ProtectedRoute>
      } />

      {/* 7. АНАЛИТИКА */}
      <Route path="/admin/statistics" element={
        <ProtectedRoute>
          <Layout onLogout={logout}>
            <Analytics />
          </Layout>
        </ProtectedRoute>
      } />

      {/* 8. AI ИНСАЙТЫ */}
      <Route path="/admin/analysis" element={
        <ProtectedRoute>
          <Layout onLogout={logout}>
            <AnalyticsAI />
          </Layout>
        </ProtectedRoute>
      } />

      {/* 9. МОНИТОРИНГ */}
      <Route path="/admin/monitoring/rating" element={
        <ProtectedRoute>
          <Layout onLogout={logout}>
            <MonitoringRating />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/monitoring/performance" element={
        <ProtectedRoute>
          <Layout onLogout={logout}>
            <MonitoringPerformance />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/monitoring/comparison" element={
        <ProtectedRoute>
          <Layout onLogout={logout}>
            <MonitoringComparison />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/monitoring/journal" element={
        <ProtectedRoute>
          <Layout onLogout={logout}>
            <MonitoringJournal />
          </Layout>
        </ProtectedRoute>
      } />

      {/* 10. УПРАВЛЕНИЕ (Главная плитка) */}
      <Route path="/admin/management" element={
        <ProtectedRoute>
          <Layout onLogout={logout}>
            <Management />
          </Layout>
        </ProtectedRoute>
      } />

      {/* 11. НАСТРОЙКИ */}
      <Route path="/admin/settings" element={
        <ProtectedRoute>
          <Layout onLogout={logout}>
            <Settings />
          </Layout>
        </ProtectedRoute>
      } />

      {/* 12. ВНУТРЕННИЕ СТРАНИЦЫ УПРАВЛЕНИЯ (CRUD) */}
      <Route path="/admin/manage/years" element={<ProtectedRoute><Layout onLogout={logout}><SchoolYears /></Layout></ProtectedRoute>} />
      <Route path="/admin/manage/quarters" element={<ProtectedRoute><Layout onLogout={logout}><Quarters /></Layout></ProtectedRoute>} />
      <Route path="/admin/manage/schools" element={<ProtectedRoute><Layout onLogout={logout}><Schools /></Layout></ProtectedRoute>} />
      <Route path="/admin/manage/classes" element={<ProtectedRoute><Layout onLogout={logout}><Classes /></Layout></ProtectedRoute>} />
      <Route path="/admin/manage/subjects" element={<ProtectedRoute><Layout onLogout={logout}><Subjects /></Layout></ProtectedRoute>} />
      <Route path="/admin/manage/question-counts" element={<ProtectedRoute><Layout onLogout={logout}><QuestionCounts /></Layout></ProtectedRoute>} />
      <Route path="/admin/manage/topics" element={<ProtectedRoute><Layout onLogout={logout}><Topics /></Layout></ProtectedRoute>} />
      <Route path="/admin/manage/questions" element={<ProtectedRoute><Layout onLogout={logout}><QuestionBank /></Layout></ProtectedRoute>} />
      <Route path="/admin/manage/tests" element={<ProtectedRoute><Layout onLogout={logout}><Tests /></Layout></ProtectedRoute>} />
      <Route path="/admin/manage/booklets" element={<ProtectedRoute><Layout onLogout={logout}><Booklets /></Layout></ProtectedRoute>} />

      <Route path="/admin/manage/students" element={<ProtectedRoute><Layout onLogout={logout}><Students /></Layout></ProtectedRoute>} />
      <Route path="/admin/manage/users" element={<ProtectedRoute><Layout onLogout={logout}><Users /></Layout></ProtectedRoute>} />
      <Route path="/admin/manage/permissions" element={<ProtectedRoute><Layout onLogout={logout}><Permissions /></Layout></ProtectedRoute>} />
      <Route path="/admin/manage/cleanup" element={<ProtectedRoute><Layout onLogout={logout}><Cleanup /></Layout></ProtectedRoute>} />

      {/* 13. СТРАНИЦА ЭКЗАМЕНА */}
      <Route path="/exam/:id" element={
        <ProtectedRoute>
          <ExamPage />
        </ProtectedRoute>
      } />

      {/* Превью буклета */}
      <Route path="/admin/manage/booklets/preview/:id" element={<ProtectedRoute><BookletPreview /></ProtectedRoute>} />

      {/* 14. 404 - Редирект на умную главную */}
      <Route path="*" element={<RootRedirect />} />

      {/* 13. КАБИНЕТ УЧЕНИКА */}
      <Route path="/student" element={
        <ProtectedRoute>
          <StudentLayout onLogout={logout}>
            <StudentDashboard />
          </StudentLayout>
        </ProtectedRoute>
      } />

      {/* 🔥 НОВЫЕ РОУТЫ */}
      <Route path="/student/roadmap" element={
        <ProtectedRoute>
          <StudentLayout onLogout={logout}>
            <RoadmapPage />
          </StudentLayout>
        </ProtectedRoute>
      } />

      <Route path="/student/faculties" element={
        <ProtectedRoute>
          <StudentLayout onLogout={logout}>
            <FacultiesPage />
          </StudentLayout>
        </ProtectedRoute>
      } />
    </Routes>

  );
}

export default App;