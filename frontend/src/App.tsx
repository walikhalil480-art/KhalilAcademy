import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { api } from './services/api';
import { setUser, setLoading } from './store/authSlice';
import { setNotifications } from './store/notificationSlice';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

import { LandingPage } from './pages/LandingPage';
import { CourseCatalogPage } from './pages/CourseCatalogPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ProfilePage } from './pages/ProfilePage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { LearningPlayerPage } from './pages/LearningPlayerPage';
import { QuizPlayerPage } from './pages/QuizPlayerPage';
import { AssignmentSubmitPage } from './pages/AssignmentSubmitPage';
import { CertificateViewPage } from './pages/CertificateViewPage';
import { CertificateVerifyPage } from './pages/CertificateVerifyPage';
import { StudentCertificatesPage } from './pages/StudentCertificatesPage';
import { InstructorDashboardPage } from './pages/InstructorDashboardPage';
import { CourseManagementPage } from './pages/CourseManagementPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export const App: React.FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const checkAuthSession = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            dispatch(setUser(res.data.user));

            try {
              const nRes = await api.get('/notifications');
              if (nRes.data.success) {
                dispatch(setNotifications({
                  notifications: nRes.data.notifications,
                  unreadCount: nRes.data.unreadCount,
                }));
              }
            } catch (nErr) {}
          }
        }
      } catch (err) {
        // Token invalid/expired handled by interceptor
      } finally {
        dispatch(setLoading(false));
      }
    };
    checkAuthSession();
  }, [dispatch]);

  return (
    <div className="min-h-screen flex flex-col bg-[#071326] text-[#F8FAFC] font-sans">
      <Navbar />
      
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/courses" element={<CourseCatalogPage />} />
          <Route path="/courses/:slug" element={<CourseDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/certificates/:id" element={<CertificateViewPage />} />
          <Route path="/certificates/verify/:id" element={<CertificateVerifyPage />} />
          <Route path="/verify/certificate/:id" element={<CertificateVerifyPage />} />
          <Route path="/verify/:id" element={<CertificateVerifyPage />} />

          {/* Authenticated Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/checkout/:courseId" element={<CheckoutPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/dashboard" element={<StudentDashboardPage />} />
            <Route path="/my-learning" element={<StudentDashboardPage />} />
            <Route path="/student/certificates" element={<StudentCertificatesPage />} />
            <Route path="/certificates" element={<StudentCertificatesPage />} />
            <Route path="/courses/:slug/learn" element={<LearningPlayerPage />} />
            <Route path="/courses/:slug/learn/:lessonId" element={<LearningPlayerPage />} />
            <Route path="/quizzes/:id" element={<QuizPlayerPage />} />
            <Route path="/assignments/:id" element={<AssignmentSubmitPage />} />
          </Route>

          {/* Instructor Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']} />}>
            <Route path="/instructor/dashboard" element={<InstructorDashboardPage />} />
            <Route path="/instructor/courses/:courseId/manage" element={<CourseManagementPage />} />
          </Route>

          {/* Admin Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;
