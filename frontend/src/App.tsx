import { Routes, Route } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { CandidateDashboard } from '@/pages/CandidateDashboard';
import { UploadCvPage } from '@/pages/UploadCvPage';
import { JobsListPage } from '@/pages/JobsListPage';
import { RecruiterDashboard } from '@/pages/RecruiterDashboard';
import { PostJobPage } from '@/pages/PostJobPage';
import { AdminAnalyticsPage } from '@/pages/AdminAnalyticsPage';
import { AgentDashboard } from '@/pages/AgentDashboard';

export const App = () => {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Candidate routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['CANDIDATE', 'ADMIN']}>
              <CandidateDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute allowedRoles={['CANDIDATE', 'ADMIN']}>
              <UploadCvPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs"
          element={
            <ProtectedRoute>
              <JobsListPage />
            </ProtectedRoute>
          }
        />

        {/* Recruiter routes */}
        <Route
          path="/recruiter"
          element={
            <ProtectedRoute allowedRoles={['RECRUITER', 'ADMIN']}>
              <RecruiterDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/new"
          element={
            <ProtectedRoute allowedRoles={['RECRUITER', 'ADMIN']}>
              <PostJobPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/agent"
          element={
            <ProtectedRoute allowedRoles={['RECRUITER', 'ADMIN']}>
              <AgentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminAnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <div className="container" style={{ textAlign: 'center', padding: 60 }}>
              <h1>404</h1>
              <p className="muted">Page not found.</p>
            </div>
          }
        />
      </Routes>
    </>
  );
};
