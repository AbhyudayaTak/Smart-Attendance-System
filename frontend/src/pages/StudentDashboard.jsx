import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:4000/api';

function StatTile({ title, value, subtitle, primary }) {
  if (primary) {
    return (
      <div style={{ borderRadius: 16, padding: '1.3rem 1.4rem', background: 'linear-gradient(135deg, var(--color-primary), #ff7043)', color: '#fff', boxShadow: 'var(--shadow-soft)' }}>
        <div style={{ fontSize: '0.9rem', opacity: 0.92 }}>{title}</div>
        <div style={{ fontSize: '2.1rem', fontWeight: 700, marginTop: '0.25rem' }}>{value}</div>
        <div style={{ fontSize: '0.85rem', marginTop: '0.35rem', opacity: 0.9 }}>{subtitle}</div>
      </div>
    );
  }
  return (
    <div style={{ borderRadius: 16, padding: '1.2rem 1.3rem', background: '#ffffff', boxShadow: 'var(--shadow-soft)' }}>
      <div style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>{title}</div>
      <div style={{ fontSize: '1.7rem', fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>{subtitle}</div>
    </div>
  );
}

function StatusPill({ status }) {
  const s = status?.toLowerCase() || '';
  let bg = 'rgba(56,142,60,0.1)';
  let color = '#2e7d32';
  if (s === 'upcoming') { bg = 'rgba(33,150,243,0.12)'; color = '#1976d2'; }
  if (s === 'active' || s === 'ongoing') { bg = 'rgba(56,142,60,0.15)'; color = '#2e7d32'; }
  if (s === 'missed' || s === 'late') { bg = 'rgba(211,47,47,0.1)'; color = '#c62828'; }
  if (s === 'attended' || s === 'present') { bg = 'rgba(56,142,60,0.1)'; color = '#2e7d32'; }
  if (s === 'completed') { bg = 'rgba(120,120,120,0.1)'; color = '#666'; }
  return (
    <span style={{ padding: '0.2rem 0.85rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600, background: bg, color }}>{status}</span>
  );
}

function MiniCalendar({ sessions }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const hasSession = (day) => {
    if (!day || !sessions) return false;
    const date = new Date(currentYear, currentMonth, day);
    return sessions.some((s) => {
      const sessionDate = new Date(s.scheduledStart);
      return sessionDate.toDateString() === date.toDateString();
    });
  };

  const isToday = (day) => day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); } else setCurrentMonth(currentMonth - 1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}>‹</button>
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{monthNames[currentMonth]} {currentYear}</span>
        <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); } else setCurrentMonth(currentMonth + 1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', fontSize: '0.7rem' }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (<div key={i} style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '0.2rem' }}>{d}</div>))}
        {days.map((day, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '0.25rem', borderRadius: 4, background: isToday(day) ? 'var(--color-primary)' : hasSession(day) ? '#ffe3dd' : 'transparent', color: isToday(day) ? '#fff' : hasSession(day) ? 'var(--color-primary)' : 'inherit', fontWeight: isToday(day) || hasSession(day) ? 600 : 400 }}>{day || ''}</div>
        ))}
      </div>
    </div>
  );
}

function StudentDashboard({ token }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [classCode, setClassCode] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const studentName = localStorage.getItem('name') || 'Student';
  const studentEmail = localStorage.getItem('email') || 'student@school.edu';

  const fetchEnrolledClasses = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/classes/enrolled`, { headers: { Authorization: `Bearer ${token}` } });
      setEnrolledClasses(res.data);
    } catch (err) { console.error('Failed to fetch enrolled classes', err); }
  }, [token]);

  const fetchAllSessions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/classes/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      setAllSessions(res.data);
    } catch (err) { console.error('Failed to fetch sessions', err); }
  }, [token]);

  const fetchTodaySessions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/classes/today`, { headers: { Authorization: `Bearer ${token}` } });
      setTodaySessions(res.data);
    } catch (err) { console.error('Failed to fetch today sessions', err); }
  }, [token]);

  const fetchAttendanceHistory = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/attendance/student`, { headers: { Authorization: `Bearer ${token}` } });
      setAttendanceHistory(res.data);
    } catch (err) { console.error('Failed to fetch attendance history', err); }
  }, [token]);

  const refreshData = useCallback(() => {
    fetchEnrolledClasses();
    fetchAllSessions();
    fetchTodaySessions();
    fetchAttendanceHistory();
  }, [fetchEnrolledClasses, fetchAllSessions, fetchTodaySessions, fetchAttendanceHistory]);

  useEffect(() => { refreshData(); }, [refreshData]);

  // Refresh today's sessions every 30 seconds to check for active QRs
  useEffect(() => {
    const interval = setInterval(fetchTodaySessions, 30000);
    return () => clearInterval(interval);
  }, [fetchTodaySessions]);

  const joinClass = async () => {
    if (!classCode.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/classes/join`, { code: classCode.toUpperCase() }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage(res.data.message);
      setClassCode('');
      refreshData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to join class');
    } finally { setLoading(false); }
  };

  const markAttendance = async () => {
    if (!qrToken.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      let tokenValue = qrToken.trim();
      try {
        const parsed = JSON.parse(tokenValue);
        tokenValue = parsed.t || parsed.token || tokenValue;
      } catch { /* Not JSON */ }

      const res = await axios.post(`${API_BASE}/attendance/mark`, { token: tokenValue }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage(res.data.message);
      setQrToken('');
      refreshData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to mark attendance');
    } finally { setLoading(false); }
  };

  const formatTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : '';

  // Stats
  const classesTodayCount = todaySessions.length;
  const attendedCount = todaySessions.filter((s) => s.attendanceMarked).length;
  const activeSessions = todaySessions.filter((s) => s.hasActiveQR && !s.attendanceMarked).length;
  const presentDays = attendanceHistory.filter((a) => a.status === 'Present').length;
  const totalRecords = attendanceHistory.length;
  const attendanceRate = totalRecords > 0 ? Math.round((presentDays / totalRecords) * 100) : 0;

  const renderMain = () => {
    // Classes Tab - Show enrolled classes and their sessions
    if (activeTab === 'classes') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Join Class */}
          <div style={{ borderRadius: 16, background: '#ffffff', boxShadow: 'var(--shadow-soft)', padding: '1.6rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Join a Class</h3>
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <input type="text" placeholder="Enter class code (e.g. CS101)" value={classCode} onChange={(e) => setClassCode(e.target.value.toUpperCase())} style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
              <button className="btn btn-primary" onClick={joinClass} disabled={loading || !classCode.trim()}>
                {loading ? 'Joining...' : 'Join Class'}
              </button>
            </div>
            {message && <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--color-primary)' }}>{message}</div>}
          </div>

          {/* Enrolled Classes */}
          <div style={{ borderRadius: 16, background: '#ffffff', boxShadow: 'var(--shadow-soft)', padding: '1.6rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>My Classes</h3>
            {enrolledClasses.length === 0 ? (
              <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '2rem' }}>
                You haven't joined any classes yet. Enter a class code above to join.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {enrolledClasses.map((cls) => (
                  <div key={cls._id} style={{ borderRadius: 12, border: '1px solid #f1dfd9', background: '#fffaf6', padding: '1.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{cls.code}</div>
                        <div style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>{cls.name}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}>
                      Teacher: {cls.teacher?.name || 'N/A'}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.8rem', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ color: 'var(--color-muted)' }}>Today: </span>
                        <span style={{ fontWeight: 600 }}>{cls.todaySessions || 0}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-muted)' }}>Upcoming: </span>
                        <span style={{ fontWeight: 600 }}>{cls.upcomingSessions || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All Sessions */}
          <div style={{ borderRadius: 16, background: '#ffffff', boxShadow: 'var(--shadow-soft)', padding: '1.6rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>All Sessions</h3>
            {allSessions.length === 0 ? (
              <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '2rem' }}>No sessions available</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {allSessions.map((session) => (
                  <div key={session._id} style={{ padding: '1rem 1.2rem', borderRadius: 12, border: '1px solid #f1dfd9', background: '#fffaf6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 600 }}>{session.class?.code}</span>
                        <StatusPill status={session.attendanceMarked ? session.attendanceStatus : session.status} />
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#333' }}>{session.title || session.class?.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                        {formatDate(session.scheduledStart)} • {formatTime(session.scheduledStart)} - {formatTime(session.scheduledEnd)}
                      </div>
                    </div>
                    {session.hasActiveQR && !session.attendanceMarked && (
                      <div style={{ background: '#2e7d32', color: '#fff', padding: '0.3rem 0.8rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600 }}>
                        QR Active!
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Mark Attendance Tab
    if (activeTab === 'mark') {
      return (
        <div style={{ borderRadius: 16, background: '#ffffff', boxShadow: 'var(--shadow-soft)', overflow: 'hidden' }}>
          <div style={{ padding: '0.9rem 1.2rem', background: 'linear-gradient(135deg, var(--color-primary), #ff7043)', color: '#fff', fontWeight: 600 }}>
            Mark Attendance
          </div>
          <div style={{ padding: '1.6rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: '1.5rem' }}>
              {/* QR Token input */}
              <div style={{ borderRadius: 16, background: '#fff8f2', padding: '1.4rem 1.5rem' }}>
                <h3 style={{ margin: 0, marginBottom: '0.6rem', fontSize: '1.1rem' }}>Enter QR Token</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
                  Paste the token from your teacher's QR code to mark your attendance.
                </p>
                <textarea placeholder='Paste token or JSON (e.g., {"t":"abc123"})' value={qrToken} onChange={(e) => setQrToken(e.target.value)} style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: 12, border: '1px solid #ddd', fontSize: '0.9rem', minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }} />
                <button className="btn btn-primary" onClick={markAttendance} disabled={loading || !qrToken.trim()} style={{ marginTop: '0.8rem' }}>
                  {loading ? 'Marking...' : 'Mark Attendance'}
                </button>
                {message && <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--color-primary)' }}>{message}</div>}
              </div>

              {/* Active Sessions */}
              <div style={{ borderRadius: 16, background: '#ffffff', boxShadow: 'var(--shadow-soft)', padding: '1.4rem 1.5rem' }}>
                <h3 style={{ margin: 0, marginBottom: '0.8rem', fontSize: '1.1rem' }}>Active Sessions</h3>
                {todaySessions.filter(s => s.hasActiveQR && !s.attendanceMarked).length === 0 ? (
                  <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '1rem' }}>
                    No active QR codes right now
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    {todaySessions.filter(s => s.hasActiveQR && !s.attendanceMarked).map((session) => (
                      <div key={session._id} style={{ padding: '0.8rem', borderRadius: 12, background: 'rgba(56,142,60,0.08)', border: '1px solid rgba(56,142,60,0.2)' }}>
                        <div style={{ fontWeight: 600, color: '#2e7d32' }}>{session.class?.code}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{session.title || session.class?.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#2e7d32', marginTop: '0.3rem' }}>🟢 QR Active - Mark now!</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // History Tab
    if (activeTab === 'history') {
      return (
        <div style={{ borderRadius: 16, background: '#ffffff', boxShadow: 'var(--shadow-soft)', padding: '1.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>My Attendance History</h3>
            <button style={{ borderRadius: 999, border: '1px solid var(--color-primary)', background: '#fff', color: 'var(--color-primary)', padding: '0.35rem 0.9rem', fontSize: '0.8rem', cursor: 'pointer' }}>Filter</button>
          </div>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f0d6d0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead style={{ background: '#fff3ec' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Class</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Session</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Time</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceHistory.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>No attendance records yet</td></tr>
                ) : (
                  attendanceHistory.map((row, i) => (
                    <tr key={row._id} style={{ background: i % 2 === 0 ? '#fffaf6' : '#ffffff' }}>
                      <td style={{ padding: '0.55rem 1rem' }}>{row.class?.code || 'N/A'}</td>
                      <td style={{ padding: '0.55rem 1rem' }}>{row.session?.title || 'Session'}</td>
                      <td style={{ padding: '0.55rem 1rem' }}>{formatDate(row.markedAt)}</td>
                      <td style={{ padding: '0.55rem 1rem' }}>{formatTime(row.markedAt)}</td>
                      <td style={{ padding: '0.55rem 1rem' }}><StatusPill status={row.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Dashboard (default)
    return (
      <>
        {/* Welcome */}
        <div style={{ borderRadius: 16, background: '#ffffff', boxShadow: 'var(--shadow-soft)', padding: '1.3rem 1.6rem' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Welcome, {studentName}</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-muted)' }}>View your attendance summary and today's schedule.</div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) repeat(3,minmax(0,1fr))', gap: '1rem' }}>
          <StatTile title="Attendance rate" value={`${attendanceRate}%`} subtitle="Overall" primary />
          <StatTile title="Classes today" value={classesTodayCount} subtitle={`${attendedCount} attended`} />
          <StatTile title="Active QRs" value={activeSessions} subtitle="Mark now!" />
          <StatTile title="Enrolled classes" value={enrolledClasses.length} subtitle="Active courses" />
        </div>

        {/* Quick Actions + Today's Schedule */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: '1.5rem' }}>
          {/* Quick Actions */}
          <div style={{ borderRadius: 16, background: '#ffffff', boxShadow: 'var(--shadow-soft)', overflow: 'hidden' }}>
            <div style={{ padding: '0.9rem 1.2rem', background: 'linear-gradient(135deg, var(--color-primary), #ff7043)', color: '#fff', fontWeight: 600 }}>
              Quick Actions
            </div>
            <div style={{ padding: '1.6rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Mark attendance */}
              <div style={{ borderRadius: 16, background: '#faf3ee', border: '2px dashed #e0c9bf', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Mark Attendance</h4>
                <input type="text" placeholder="Paste QR token" value={qrToken} onChange={(e) => setQrToken(e.target.value)} style={{ padding: '0.5rem 0.7rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.85rem' }} />
                <button className="btn btn-primary" onClick={markAttendance} disabled={loading || !qrToken.trim()} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>Mark</button>
              </div>
              {/* Join class */}
              <div style={{ borderRadius: 16, background: '#fff8f2', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Join Class</h4>
                <input type="text" placeholder="Class code" value={classCode} onChange={(e) => setClassCode(e.target.value.toUpperCase())} style={{ padding: '0.5rem 0.7rem', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.85rem' }} />
                <button className="btn btn-primary" onClick={joinClass} disabled={loading || !classCode.trim()} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>Join</button>
              </div>
            </div>
            {message && <div style={{ padding: '0 1.6rem 1rem', fontSize: '0.85rem', color: 'var(--color-primary)' }}>{message}</div>}
          </div>

          {/* Today's schedule */}
          <div style={{ borderRadius: 16, background: '#ffffff', boxShadow: 'var(--shadow-soft)', padding: '1.4rem 1.5rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.8rem' }}>Today's Classes</h3>
            {todaySessions.length === 0 ? (
              <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '1rem' }}>No classes scheduled for today</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {todaySessions.map((session) => (
                  <div key={session._id} style={{ padding: '0.75rem 0.9rem', borderRadius: 12, border: '1px solid #f1dfd9', background: session.hasActiveQR && !session.attendanceMarked ? 'rgba(56,142,60,0.05)' : '#fffaf6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{session.class?.code} – {session.class?.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{formatTime(session.scheduledStart)} - {formatTime(session.scheduledEnd)}</div>
                      </div>
                      <StatusPill status={session.attendanceMarked ? (session.status === 'Late' ? 'Late' : 'Attended') : session.status} />
                    </div>
                    {session.hasActiveQR && !session.attendanceMarked && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#2e7d32', fontWeight: 600 }}>🟢 QR Active - Mark attendance now!</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '230px minmax(0, 1fr)', gap: '1.6rem', width: '100%', alignItems: 'start' }}>
      {/* Sidebar */}
      <aside style={{ borderRadius: 20, background: '#ffffff', boxShadow: 'var(--shadow-soft)', padding: '1.5rem 1.3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.5rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-primary), #ff7043)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>📚</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>SmartAttend</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Student Portal</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {[
            { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
            { id: 'classes', icon: '📚', label: 'Classes' },
            { id: 'mark', icon: '📷', label: 'Mark attendance' },
            { id: 'history', icon: '📋', label: 'My attendance' },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.7rem', width: '100%', padding: '0.7rem 1rem', borderRadius: 10, border: 'none', background: isActive ? '#ffe3dd' : 'transparent', color: isActive ? 'var(--color-primary)' : '#555', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.15s ease', boxSizing: 'border-box' }}>
                <span style={{ width: '20px', flexShrink: 0, textAlign: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Calendar */}
        <div style={{ borderTop: '1px solid #f0e0da', paddingTop: '1rem' }}>
          <h4 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>📅 Calendar</h4>
          <MiniCalendar sessions={allSessions} />
        </div>

        {/* Quick Join */}
        <div style={{ borderTop: '1px solid #f0e0da', paddingTop: '1rem' }}>
          <h4 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Quick Join</h4>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input type="text" placeholder="Code" value={classCode} onChange={(e) => setClassCode(e.target.value.toUpperCase())} style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #e0e0e0', fontSize: '0.8rem' }} />
            <button onClick={joinClass} disabled={!classCode.trim()} style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>Join</button>
          </div>
        </div>

        {/* User */}
        <div style={{ borderTop: '1px solid #f0e0da', paddingTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), #ff7043)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>{studentName.charAt(0)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{studentName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{studentEmail}</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {renderMain()}
      </section>
    </div>
  );
}

export default StudentDashboard;
