import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import AuthTopBar from './components/AuthTopBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ATSAnalysisPage from './pages/ATSAnalysisPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import JobsPage from './pages/JobsPage.jsx';
import ApplicationsPage from './pages/ApplicationsPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ResumePage from './pages/ResumePage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import TailorResumePage from './pages/TailorResumePage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import CoverLetterPage from './pages/CoverLetterPage.jsx';
import InterviewPrepPage from './pages/InterviewPrepPage.jsx';

function ProtectedPage({ children }) {
  return (
    <ProtectedRoute>
      <Layout>
        <AuthTopBar />
        {children}
      </Layout>
    </ProtectedRoute>
  );
}

function PublicOnly({ children }) {
  const { isAuthenticated, loadingAuth } = useAuth();

  if (loadingAuth) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />

      <Route
        path="/signup"
        element={
          <PublicOnly>
            <SignupPage />
          </PublicOnly>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedPage>
            <DashboardPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/resumes"
        element={
          <ProtectedPage>
            <ResumePage />
          </ProtectedPage>
        }
      />

      <Route
        path="/ats"
        element={
          <ProtectedPage>
            <ATSAnalysisPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/tailor-resume"
        element={
          <ProtectedPage>
            <TailorResumePage />
          </ProtectedPage>
        }
      />

      <Route
        path="/jobs"
        element={
          <ProtectedPage>
            <JobsPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/applications"
        element={
          <ProtectedPage>
            <ApplicationsPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedPage>
            <ProfilePage />
          </ProtectedPage>
        }
      />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        }
      />

      <Route
        path="/cover-letter"
        element={
          <ProtectedPage>
            <CoverLetterPage/>
          </ProtectedPage>
        }/>

      <Route
        path="/interview-prep"
        element={
          <ProtectedPage>
            <InterviewPrepPage/>
          </ProtectedPage>
        }/>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}