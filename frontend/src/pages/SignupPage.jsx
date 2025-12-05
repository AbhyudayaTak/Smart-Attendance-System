import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'http://localhost:4000/api';

function SignupPage({ onSignup }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!/^[0-9]{4}[A-Z]{2,4}[0-9]{3,5}$/i.test(studentId)) {
      setError('Invalid Student ID format (e.g., 2023UCP1665)');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/signup`, {
        name,
        email,
        studentId: studentId.toUpperCase(),
        password,
      });
      // auto-login as student
      localStorage.setItem('studentId', res.data.studentId);
      onSignup(res.data);
      navigate('/student');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="two-column">
      <div className="card-surface">
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Create your account</h2>
        <p style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--color-muted)' }}>
          Sign up as a <b>Student</b>. Admins can later upgrade your role to Teacher or Admin.
        </p>
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
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              Student ID
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.toUpperCase())}
              placeholder="e.g., 2023UCP1665"
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
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              Password
            </label>
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
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              Confirm password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
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
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>
        </form>
      </div>
      <div className="card-surface" style={{ background: 'linear-gradient(150deg,#ffe3dd,#fff8f2)' }}>
        <h3 style={{ marginTop: 0 }}>After signing up</h3>
        <ol style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#5a3b3b' }}>
          <li>You&apos;ll be logged in as a student by default.</li>
          <li>Join your classes using the class code your teacher shares.</li>
          <li>Admins can later upgrade your account to Teacher or Admin.</li>
        </ol>
      </div>
    </div>
  );
}

export default SignupPage;


