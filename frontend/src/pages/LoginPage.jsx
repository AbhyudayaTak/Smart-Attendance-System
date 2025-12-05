import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'http://localhost:4000/api';

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
      // Store studentId if present
      if (res.data.studentId) {
        localStorage.setItem('studentId', res.data.studentId);
      }
      onLogin(res.data);
      if (res.data.role === 'admin') {
        navigate('/admin');
      } else if (res.data.role === 'teacher') {
        navigate('/teacher');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemo = async () => {
    setError('');
    setLoading(true);
    try {
      const seedRes = await axios.post(`${API_BASE}/admin/seed`);
      const creds = seedRes.data.users;
      setEmail(creds.teacher.email);
      setPassword(creds.teacher.password);
    } catch (e) {
      setError('Failed to load demo accounts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="two-column">
      <div className="card-surface">
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Welcome back</h2>
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem',
            maxWidth: '420px',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: 999,
                border: '1px solid #ddd',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 0.9rem',
                  paddingRight: '2.5rem',
                  borderRadius: 999,
                  border: '1px solid #ddd',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  color: 'var(--color-muted)',
                  fontSize: '0.9rem',
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>
          {error && (
            <div style={{ color: '#b22222', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ minWidth: '200px' }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
        <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--color-muted)' }}>
          Don&apos;t have an account?{' '}
          <a href="/signup" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            Sign up
          </a>
        </div>
        <button
          type="button"
          className="btn"
          style={{ marginTop: '0.75rem', background: '#ffe3dd' }}
          onClick={handleUseDemo}
        >
          Use demo accounts
        </button>
      </div>
      <div className="card-surface" style={{ background: 'linear-gradient(150deg,#ffe3dd,#fff8f2)' }}>
        <h3 style={{ marginTop: 0 }}>How it works</h3>
        <ol style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#5a3b3b' }}>
          <li>Teacher generates a time-limited QR code for the class.</li>
          <li>Students scan the QR using the in-browser camera widget.</li>
          <li>Backend validates the token and records timestamped attendance.</li>
          <li>Teachers and admins view daily/monthly reports and export CSV.</li>
        </ol>
      </div>
    </div>
  );
}

export default LoginPage;


