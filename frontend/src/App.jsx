import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import './App.css';
import AppShell from './components/AppShell.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import TestPage from './pages/TestPage.jsx';

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [name, setName] = useState(localStorage.getItem('name'));

  const login = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('name', data.name);
    setToken(data.token);
    setRole(data.role);
    setName(data.name);
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setRole(null);
    setName(null);
  };

  return { token, role, name, login, logout };
}

function ProtectedRoute({ children, token, role, allow }) {
  if (!token) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(role)) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const auth = useAuth();

  return (
    <AppShell name={auth.name} role={auth.role} onLogout={auth.logout}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage onLogin={auth.login} />} />
        <Route path="/signup" element={<SignupPage onSignup={auth.login} />} />
        <Route
          path="/teacher"
          element={
            <ProtectedRoute token={auth.token} role={auth.role} allow={['teacher']}>
              <TeacherDashboard token={auth.token} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student"
          element={
            <ProtectedRoute token={auth.token} role={auth.role} allow={['student']}>
              <StudentDashboard token={auth.token} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute token={auth.token} role={auth.role} allow={['admin']}>
              <AdminDashboard token={auth.token} />
            </ProtectedRoute>
          }
        />
        <Route path="/test" element={<TestPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AppShell>
  );
}

export default App;