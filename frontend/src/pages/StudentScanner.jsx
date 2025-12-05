import { useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:4000/api';

function StudentScanner({ token }) {
  const [rawInput, setRawInput] = useState('');
  const [status, setStatus] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinStatus, setJoinStatus] = useState('');

  // This is a simplified “scanner” where the student pastes the decoded token JSON or token string.
  const handleSubmit = async (e) => {
    e.preventDefault();
    let tokenValue = rawInput.trim();
    try {
      // accept either raw token or JSON like {"t":"..."}
      if (tokenValue.startsWith('{')) {
        const parsed = JSON.parse(tokenValue);
        tokenValue = parsed.t;
      }
    } catch {
      // ignore parse error, will send raw string
    }
    if (!tokenValue) {
      setStatus('Please paste a valid token or QR payload.');
      return;
    }
    setStatus('Sending to server...');
    try {
      const res = await axios.post(
        `${API_BASE}/attendance/mark`,
        { token: tokenValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus(res.data.message || 'Attendance marked');
    } catch (err) {
      setStatus(err.response?.data?.message || 'Failed to mark attendance');
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setJoinStatus('Enter a class code.');
      return;
    }
    setJoinStatus('Joining class...');
    try {
      const res = await axios.post(
        `${API_BASE}/classes/join`,
        { code: joinCode.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setJoinStatus(res.data.message || 'Joined class successfully');
    } catch (err) {
      setJoinStatus(err.response?.data?.message || 'Failed to join class');
    }
  };

  return (
    <div className="two-column">
      <div className="card-surface">
        <h2 style={{ marginTop: 0 }}>Student check-in</h2>
        <p style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--color-muted)' }}>
          In a real deployment, this uses your camera to scan the QR. For this college demo,
          you can paste the token or JSON payload shown under the teacher’s QR.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            rows={4}
            placeholder='Paste QR payload here, e.g. {"t":"..."}'
            style={{ padding: '0.75rem', borderRadius: 12, border: '1px solid #ddd', resize: 'vertical' }}
          />
          <button className="btn btn-primary" type="submit">
            Mark attendance
          </button>
        </form>
        {status && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#5a3b3b' }}>
            {status}
          </div>
        )}
      </div>
      <div className="card-surface" style={{ background: '#fff8f2' }}>
        <h3 style={{ marginTop: 0 }}>Join class with code</h3>
        <form
          onSubmit={handleJoinClass}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}
        >
          <input
            type="text"
            placeholder="Enter class code (e.g. CSE101)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            style={{ padding: '0.55rem 0.75rem', borderRadius: 999, border: '1px solid #ddd' }}
          />
          <button className="btn btn-primary" type="submit">
            Join class
          </button>
        </form>
        {joinStatus && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#5a3b3b' }}>
            {joinStatus}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentScanner;


