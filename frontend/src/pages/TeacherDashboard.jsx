import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:4000/api';

function StatTile({ title, value, subtitle, primary, icon }) {
  if (primary) {
    return (
      <div
        style={{
          borderRadius: 16,
          padding: '1.3rem 1.4rem',
          background: 'linear-gradient(135deg, var(--color-primary), #ff7043)',
          color: '#fff',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.9rem', opacity: 0.92 }}>{title}</div>
            <div style={{ fontSize: '2.1rem', fontWeight: 700, marginTop: '0.25rem' }}>{value}</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.35rem', opacity: 0.9 }}>{subtitle}</div>
          </div>
          {icon && (
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 16, padding: '1.2rem 1.3rem', background: '#ffffff', boxShadow: 'var(--shadow-soft)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>{title}</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 700 }}>{value}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>{subtitle}</div>
        </div>
        {icon && (
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(178, 34, 34, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'var(--color-primary)' }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const s = status?.toLowerCase() || '';
  let bg = 'rgba(56,142,60,0.12)';
  let color = '#2e7d32';
  if (s === 'late') { bg = 'rgba(255,152,0,0.12)'; color = '#e65100'; }
  if (s === 'ongoing' || s === 'active') { bg = 'rgba(56,142,60,0.15)'; color = '#2e7d32'; }
  if (s === 'upcoming' || s === 'scheduled') { bg = 'rgba(33,150,243,0.12)'; color = '#1976d2'; }
  if (s === 'completed') { bg = 'rgba(120,120,120,0.1)'; color = '#666'; }
  if (s === 'absent') { bg = 'rgba(211,47,47,0.1)'; color = '#c62828'; }
  return (
    <span style={{ padding: '0.25rem 0.85rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, background: bg, color }}>
      {status}
    </span>
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

function TeacherDashboard({ token }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [classes, setClasses] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [activeQRs, setActiveQRs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // New class form
  const [newClassName, setNewClassName] = useState('');
  const [newClassCode, setNewClassCode] = useState('');

  // New session form
  const [sessionClassId, setSessionClassId] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionStart, setSessionStart] = useState('');
  const [sessionEnd, setSessionEnd] = useState('');
  const [showSessionForm, setShowSessionForm] = useState(false);

  // QR generation
  const [selectedSessionForQR, setSelectedSessionForQR] = useState(null);
  const [qrDuration, setQrDuration] = useState(10);

  // Session attendance detail view
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);
  const [sessionAttendance, setSessionAttendance] = useState(null);

  // Class register view
  const [selectedClassForRegister, setSelectedClassForRegister] = useState(null);
  const [classRegister, setClassRegister] = useState(null);

  const teacherName = localStorage.getItem('name') || 'Teacher';
  const teacherEmail = localStorage.getItem('email') || 'teacher@school.edu';

  const fetchClasses = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/classes`, { headers: { Authorization: `Bearer ${token}` } });
        setClasses(res.data);
    } catch (err) { console.error('Failed to load classes', err); }
  }, [token]);

  const fetchAllSessions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      setAllSessions(res.data);
    } catch (err) { console.error('Failed to load sessions', err); }
  }, [token]);

  const fetchTodaySessions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/sessions/today`, { headers: { Authorization: `Bearer ${token}` } });
      setTodaySessions(res.data);
    } catch (err) { console.error('Failed to load today sessions', err); }
  }, [token]);

  const fetchTodayAttendance = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/attendance/today`, { headers: { Authorization: `Bearer ${token}` } });
      setTodayAttendance(res.data);
    } catch (err) { console.error('Failed to load today attendance', err); }
  }, [token]);

  const fetchActiveQRs = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/sessions/active-qr`, { headers: { Authorization: `Bearer ${token}` } });
      setActiveQRs(res.data);
    } catch (err) { console.error('Failed to load active QRs', err); }
  }, [token]);

  const fetchSessionAttendance = async (sessionId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/sessions/${sessionId}/attendance`, { headers: { Authorization: `Bearer ${token}` } });
      setSessionAttendance(res.data);
    } catch (err) {
      console.error('Failed to load session attendance', err);
      setMessage('Failed to load attendance details');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassRegister = async (classId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/classes/${classId}/register`, { headers: { Authorization: `Bearer ${token}` } });
      setClassRegister(res.data);
    } catch (err) {
      console.error('Failed to load class register', err);
      setMessage('Failed to load attendance register');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = useCallback(() => {
    fetchClasses();
    fetchAllSessions();
    fetchTodaySessions();
    fetchTodayAttendance();
    fetchActiveQRs();
  }, [fetchClasses, fetchAllSessions, fetchTodaySessions, fetchTodayAttendance, fetchActiveQRs]);

  useEffect(() => { refreshData(); }, [refreshData]);

  // Auto-refresh data every 5 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActiveQRs();
      fetchTodaySessions();
      fetchTodayAttendance();
      fetchAllSessions();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchActiveQRs, fetchTodaySessions, fetchTodayAttendance, fetchAllSessions]);

  const createClass = async () => {
    if (!newClassName || !newClassCode) return;
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/classes`, { name: newClassName, code: newClassCode }, { headers: { Authorization: `Bearer ${token}` } });
      setClasses((prev) => [...prev, res.data]);
      setNewClassName('');
      setNewClassCode('');
      setMessage('Class created successfully');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create class');
    }
  };

  const createSession = async () => {
    if (!sessionClassId || !sessionStart || !sessionEnd) {
      setMessage('Please fill all required fields');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await axios.post(`${API_BASE}/sessions`, {
        classId: sessionClassId,
        title: sessionTitle,
        scheduledStart: sessionStart,
        scheduledEnd: sessionEnd,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Session created successfully!');
      setShowSessionForm(false);
      setSessionClassId('');
      setSessionTitle('');
      setSessionStart('');
      setSessionEnd('');
      refreshData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const generateQR = async (sessionId) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/sessions/${sessionId}/generate-qr`, { durationMinutes: qrDuration }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('QR code generated!');
      setSelectedSessionForQR(null);
      refreshData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to generate QR');
    } finally {
      setLoading(false);
    }
  };

  const endQR = async (sessionId) => {
    try {
      await axios.put(`${API_BASE}/sessions/${sessionId}/end-qr`, {}, { headers: { Authorization: `Bearer ${token}` } });
      refreshData();
    } catch (err) {
      console.error('Failed to end QR', err);
    }
  };

  const formatTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : '';
  const formatDateTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleString() : '';

  // Check if session has started
  const hasSessionStarted = (session) => {
    if (!session || !session.scheduledStart) return false;
    const now = new Date();
    const startTime = new Date(session.scheduledStart);
    return now >= startTime;
  };

  // Check if session has ended
  const hasSessionEnded = (session) => {
    if (!session || !session.scheduledEnd) return false;
    const now = new Date();
    const endTime = new Date(session.scheduledEnd);
    return now > endTime;
  };

  // Stats
  const totalStudents = classes.reduce((acc, c) => acc + (c.students?.length || 0), 0);
  const todaySessionCount = todaySessions.length;
  const ongoingSessions = todaySessions.filter((s) => s.status === 'ongoing').length;
  const presentCount = todayAttendance.length;
  const activeQrCount = activeQRs.length;

  const renderMain = () => {
    // Sessions Tab - Create and manage sessions
    if (activeTab === 'sessions') {
  return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Create Session Form */}
          <div style={{ borderRadius: 16, background: '#ffffff', boxShadow: 'var(--shadow-soft)', padding: '1.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h3 style={{ margin: 0 }}>Sessions</h3>
              <button className="btn btn-primary" onClick={() => setShowSessionForm(!showSessionForm)}>
                {showSessionForm ? 'Cancel' : '+ New Session'}
              </button>
            </div>

            {showSessionForm && (
              <div style={{ background: '#fff8f2', borderRadius: 12, padding: '1.2rem', marginBottom: '1.2rem' }}>
                <h4 style={{ margin: '0 0 1rem 0' }}>Create New Session</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Class *</label>
                    <select value={sessionClassId} onChange={(e) => setSessionClassId(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd' }}>
            <option value="">Select class</option>
                      {classes.map((c) => (<option key={c._id} value={c._id}>{c.code} - {c.name}</option>))}
          </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Title (optional)</label>
                    <input type="text" value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} placeholder="e.g., Lecture 5" style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Start Time *</label>
                    <input type="datetime-local" value={sessionStart} onChange={(e) => setSessionStart(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>End Time *</label>
                    <input type="datetime-local" value={sessionEnd} onChange={(e) => setSessionEnd(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <button className="btn btn-primary" onClick={createSession} disabled={loading} style={{ marginTop: '1rem' }}>
                  {loading ? 'Creating...' : 'Create Session'}
                </button>
                {message && <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--color-primary)' }}>{message}</div>}
              </div>
            )}

            {/* Sessions List */}
            {allSessions.length === 0 ? (
              <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '2rem' }}>No sessions yet. Create your first session!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {allSessions.map((session) => (
                  <div 
                    key={session._id} 
                    style={{ padding: '1rem 1.2rem', borderRadius: 12, border: '1px solid #f1dfd9', background: '#fffaf6', cursor: (session.status === 'ongoing' || session.status === 'completed') ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (session.status === 'ongoing' || session.status === 'completed') {
                        setSelectedSessionDetail(session);
                        fetchSessionAttendance(session._id);
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontWeight: 600 }}>{session.class?.code}</span>
                          <StatusPill status={session.status} />
                          {(session.status === 'ongoing' || session.status === 'completed') && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>Click to view attendance</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#333' }}>{session.title || session.class?.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                          {formatDate(session.scheduledStart)} • {formatTime(session.scheduledStart)} - {formatTime(session.scheduledEnd)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexDirection: 'column', alignItems: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                        {session.activeQR ? (
                          <button onClick={() => endQR(session._id)} style={{ background: '#fff', border: '1px solid #c62828', color: '#c62828', padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer' }}>
                            End QR
                          </button>
                        ) : hasSessionEnded(session) ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontStyle: 'italic' }}>
                            Session ended
                          </span>
                        ) : hasSessionStarted(session) ? (
                          <button onClick={() => setSelectedSessionForQR(session)} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer' }}>
                            Generate QR
                          </button>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                            <button 
                              disabled 
                              style={{ 
                                background: '#e0e0e0', 
                                color: '#999', 
                                border: 'none', 
                                padding: '0.4rem 0.8rem', 
                                borderRadius: 8, 
                                fontSize: '0.8rem', 
                                cursor: 'not-allowed',
                                opacity: 0.6
                              }}
                            >
                              Generate QR
                            </button>
                            <span style={{ fontSize: '0.7rem', color: '#e65100', fontWeight: 500 }}>
                              Starts at {formatTime(session.scheduledStart)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {session.activeQR && (
                      <div style={{ marginTop: '0.8rem', padding: '0.8rem', background: '#fff', borderRadius: 8, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <img src={session.activeQR.qrDataUrl} alt="QR" style={{ width: 120, height: 120, borderRadius: 8 }} />
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.3rem' }}>
                          Expires: {formatTime(session.activeQR.expiresAt)} • {session.activeQR.attendees?.length || 0} scanned
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QR Generation Modal */}
          {selectedSessionForQR && (
            <div 
              onClick={() => setSelectedSessionForQR(null)}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'pointer' }}
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', maxWidth: 400, width: '90%', cursor: 'default' }}
              >
                <h3 style={{ margin: '0 0 1rem 0' }}>Generate QR Code</h3>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                  {selectedSessionForQR.class?.code} - {selectedSessionForQR.title || selectedSessionForQR.class?.name}
                </p>
                
                {!hasSessionStarted(selectedSessionForQR) && (
                  <div style={{ 
                    marginTop: '1rem', 
                    padding: '0.8rem', 
                    background: '#fff3e0', 
                    borderRadius: 8, 
                    border: '1px solid #ffb74d',
                    color: '#e65100',
                    fontSize: '0.85rem'
                  }}>
                    ⚠️ Cannot generate QR before session starts.<br />
                    Session starts at: {formatDateTime(selectedSessionForQR.scheduledStart)}
                  </div>
                )}

                {hasSessionEnded(selectedSessionForQR) && (
                  <div style={{ 
                    marginTop: '1rem', 
                    padding: '0.8rem', 
                    background: '#ffebee', 
                    borderRadius: 8, 
                    border: '1px solid #ef5350',
                    color: '#c62828',
                    fontSize: '0.85rem'
                  }}>
                    ❌ Session has ended. Cannot generate QR code.
                  </div>
                )}

                {hasSessionStarted(selectedSessionForQR) && !hasSessionEnded(selectedSessionForQR) && (
                  <>
                    <div style={{ marginTop: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>QR Duration (minutes)</label>
                      <input type="number" value={qrDuration} onChange={(e) => setQrDuration(parseInt(e.target.value) || 10)} min="1" max="60" style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      <button onClick={() => setSelectedSessionForQR(null)} style={{ flex: 1, padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                      <button onClick={() => generateQR(selectedSessionForQR._id)} disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>{loading ? 'Generating...' : 'Generate'}</button>
                    </div>
                  </>
                )}

                {(!hasSessionStarted(selectedSessionForQR) || hasSessionEnded(selectedSessionForQR)) && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button onClick={() => setSelectedSessionForQR(null)} style={{ flex: 1, padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Close</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Session Attendance Detail Modal */}
          {selectedSessionDetail && sessionAttendance && (
            <div 
              onClick={() => { setSelectedSessionDetail(null); setSessionAttendance(null); }}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'pointer' }}
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', maxWidth: 700, width: '95%', maxHeight: '85vh', overflow: 'auto', cursor: 'default' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.3rem 0' }}>Session Attendance</h3>
                    <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', margin: 0 }}>
                      {sessionAttendance.session?.class?.code} - {sessionAttendance.session?.title || 'Session'}
                    </p>
                    <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                      {formatDate(sessionAttendance.session?.scheduledStart)} • {formatTime(sessionAttendance.session?.scheduledStart)} - {formatTime(sessionAttendance.session?.scheduledEnd)}
                    </p>
                  </div>
                  <button onClick={() => { setSelectedSessionDetail(null); setSessionAttendance(null); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0.2rem' }}>×</button>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#e8f5e9', padding: '0.8rem', borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2e7d32' }}>{sessionAttendance.stats?.present || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: '#2e7d32' }}>Present</div>
                  </div>
                  <div style={{ background: '#fff3e0', padding: '0.8rem', borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e65100' }}>{sessionAttendance.stats?.late || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: '#e65100' }}>Late</div>
                  </div>
                  <div style={{ background: '#ffebee', padding: '0.8rem', borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c62828' }}>{sessionAttendance.stats?.absent || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: '#c62828' }}>Absent</div>
                  </div>
                  <div style={{ background: '#e3f2fd', padding: '0.8rem', borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1565c0' }}>{sessionAttendance.stats?.total || 0}</div>
                    <div style={{ fontSize: '0.75rem', color: '#1565c0' }}>Total</div>
                  </div>
                </div>

                {/* Attendance Table */}
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f0d6d0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ background: '#fff3ec' }}>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '0.6rem 0.8rem' }}>Student ID</th>
                        <th style={{ textAlign: 'left', padding: '0.6rem 0.8rem' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '0.6rem 0.8rem' }}>Email</th>
                        <th style={{ textAlign: 'left', padding: '0.6rem 0.8rem' }}>Time</th>
                        <th style={{ textAlign: 'left', padding: '0.6rem 0.8rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionAttendance.attendance?.map((row, i) => (
                        <tr key={row.student?._id || i} style={{ background: i % 2 === 0 ? '#fffaf6' : '#ffffff' }}>
                          <td style={{ padding: '0.55rem 0.8rem', fontFamily: 'monospace' }}>{row.student?.studentId || '-'}</td>
                          <td style={{ padding: '0.55rem 0.8rem' }}>{row.student?.name}</td>
                          <td style={{ padding: '0.55rem 0.8rem', color: 'var(--color-muted)' }}>{row.student?.email}</td>
                          <td style={{ padding: '0.55rem 0.8rem' }}>{row.markedAt ? formatTime(row.markedAt) : '-'}</td>
                          <td style={{ padding: '0.55rem 0.8rem' }}><StatusPill status={row.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Attendance Tab
    if (activeTab === 'attendance') {
      return (
        <div style={{ borderRadius: 16, background: '#ffffff', boxShadow: 'var(--shadow-soft)', padding: '1.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Today's Attendance</h3>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button 
                onClick={() => {
                  const rows = [['Student ID', 'Name', 'Class', 'Time', 'Status']];
                  todayAttendance.forEach(row => {
                    rows.push([row.student?.studentId || '-', row.student?.name, row.class?.code, formatTime(row.markedAt), row.status]);
                  });
                  const csv = rows.map(r => r.join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                }}
                style={{ borderRadius: 999, border: '1px solid #e0e0e0', background: '#fff', color: '#333', padding: '0.4rem 1rem', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Export CSV
              </button>
            </div>
          </div>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f0d6d0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead style={{ background: '#fff3ec' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Student ID</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Class</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Time</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {todayAttendance.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>No attendance records yet today</td></tr>
                ) : (
                  todayAttendance.map((row, i) => (
                    <tr key={row._id} style={{ background: i % 2 === 0 ? '#fffaf6' : '#ffffff' }}>
                      <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace' }}>{row.student?.studentId || '-'}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>{row.student?.name}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>{row.class?.code}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>{formatTime(row.markedAt)}</td>
                      <td style={{ padding: '0.65rem 1rem' }}><StatusPill status={row.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Register Tab - Class attendance register with chart
    if (activeTab === 'register') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Class Selection */}
          <div style={{ borderRadius: 16, background: '#ffffff', boxShadow: 'var(--shadow-soft)', padding: '1.6rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Attendance Register</h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Select a class to view the complete attendance register across all sessions.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {classes.map((cls) => (
                <button
                  key={cls._id}
                  onClick={() => { setSelectedClassForRegister(cls); fetchClassRegister(cls._id); }}
                  style={{
                    padding: '0.8rem 1.2rem',
                    borderRadius: 12,
                    border: selectedClassForRegister?._id === cls._id ? '2px solid var(--color-primary)' : '1px solid #e0e0e0',
                    background: selectedClassForRegister?._id === cls._id ? '#fff3ec' : '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '0.2rem',
                  }}
                >
                  <span style={{ fontWeight: 600, color: selectedClassForRegister?._id === cls._id ? 'var(--color-primary)' : '#333' }}>{cls.code}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{cls.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{cls.students?.length || 0} students</span>
                </button>
              ))}
              {classes.length === 0 && (
                <p style={{ color: 'var(--color-muted)' }}>No classes yet. Create a class first.</p>
              )}
            </div>
          </div>

          {/* Register Data */}
          {classRegister && (
            <div style={{ borderRadius: 16, background: '#ffffff', boxShadow: 'var(--shadow-soft)', padding: '1.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{classRegister.class?.code} - {classRegister.class?.name}</h3>
                  <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', margin: '0.3rem 0 0 0' }}>
                    {classRegister.class?.totalStudents} students • {classRegister.class?.totalSessions} sessions completed
                  </p>
                </div>
                <button 
                  onClick={() => {
                    // Export CSV
                    const rows = [['Student ID', 'Name', 'Email', 'Sessions Attended', 'Late', 'Absent', 'Attendance %']];
                    classRegister.students.forEach(s => {
                      rows.push([s.student.studentId || '-', s.student.name, s.student.email, s.sessionsAttended, s.sessionsLate, s.sessionsAbsent, s.attendancePercentage + '%']);
                    });
                    const csv = rows.map(r => r.join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${classRegister.class?.code}_attendance_register.csv`;
                    a.click();
                  }}
                  style={{ borderRadius: 999, border: '1px solid #e0e0e0', background: '#fff', color: '#333', padding: '0.5rem 1rem', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Export CSV
                </button>
              </div>

              {/* Attendance Chart */}
              {classRegister.students?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.95rem' }}>Attendance Overview</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {classRegister.students.map((s) => (
                      <div key={s.student._id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ width: '120px', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.student.name}>
                          {s.student.studentId || s.student.name?.split(' ')[0]}
                        </div>
                        <div style={{ flex: 1, height: 20, background: '#f5f5f5', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                          <div style={{ width: `${(s.sessionsAttended / (s.totalSessions || 1)) * 100}%`, background: '#4caf50', height: '100%' }} title={`Present: ${s.sessionsAttended}`} />
                          <div style={{ width: `${(s.sessionsLate / (s.totalSessions || 1)) * 100}%`, background: '#ff9800', height: '100%' }} title={`Late: ${s.sessionsLate}`} />
                          <div style={{ width: `${(s.sessionsAbsent / (s.totalSessions || 1)) * 100}%`, background: '#f44336', height: '100%' }} title={`Absent: ${s.sessionsAbsent}`} />
                        </div>
                        <div style={{ width: '50px', fontSize: '0.8rem', fontWeight: 600, textAlign: 'right' }}>
                          {s.attendancePercentage}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.8rem', fontSize: '0.75rem' }}>
                    <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#4caf50', borderRadius: 2, marginRight: 4 }} />Present</span>
                    <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#ff9800', borderRadius: 2, marginRight: 4 }} />Late</span>
                    <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#f44336', borderRadius: 2, marginRight: 4 }} />Absent</span>
                  </div>
                </div>
              )}

              {/* Detailed Table */}
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f0d6d0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ background: '#fff3ec' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.6rem 0.8rem' }}>Student ID</th>
                      <th style={{ textAlign: 'left', padding: '0.6rem 0.8rem' }}>Name</th>
                      <th style={{ textAlign: 'center', padding: '0.6rem 0.8rem' }}>Present</th>
                      <th style={{ textAlign: 'center', padding: '0.6rem 0.8rem' }}>Late</th>
                      <th style={{ textAlign: 'center', padding: '0.6rem 0.8rem' }}>Absent</th>
                      <th style={{ textAlign: 'center', padding: '0.6rem 0.8rem' }}>Total</th>
                      <th style={{ textAlign: 'center', padding: '0.6rem 0.8rem' }}>Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classRegister.students?.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>No students enrolled yet</td></tr>
                    ) : (
                      classRegister.students?.map((row, i) => (
                        <tr key={row.student._id} style={{ background: i % 2 === 0 ? '#fffaf6' : '#ffffff' }}>
                          <td style={{ padding: '0.55rem 0.8rem', fontFamily: 'monospace' }}>{row.student.studentId || '-'}</td>
                          <td style={{ padding: '0.55rem 0.8rem' }}>{row.student.name}</td>
                          <td style={{ padding: '0.55rem 0.8rem', textAlign: 'center', color: '#2e7d32', fontWeight: 600 }}>{row.sessionsAttended}</td>
                          <td style={{ padding: '0.55rem 0.8rem', textAlign: 'center', color: '#e65100', fontWeight: 600 }}>{row.sessionsLate}</td>
                          <td style={{ padding: '0.55rem 0.8rem', textAlign: 'center', color: '#c62828', fontWeight: 600 }}>{row.sessionsAbsent}</td>
                          <td style={{ padding: '0.55rem 0.8rem', textAlign: 'center' }}>{row.totalSessions}</td>
                          <td style={{ padding: '0.55rem 0.8rem', textAlign: 'center' }}>
                            <span style={{ 
                              padding: '0.2rem 0.6rem', 
                              borderRadius: 999, 
                              fontSize: '0.75rem', 
                              fontWeight: 600,
                              background: row.attendancePercentage >= 75 ? 'rgba(76,175,80,0.15)' : row.attendancePercentage >= 50 ? 'rgba(255,152,0,0.15)' : 'rgba(244,67,54,0.15)',
                              color: row.attendancePercentage >= 75 ? '#2e7d32' : row.attendancePercentage >= 50 ? '#e65100' : '#c62828',
                            }}>
                              {row.attendancePercentage}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>Loading...</div>
          )}
        </div>
      );
    }

    // Dashboard (default)
    return (
      <>
        {/* Welcome */}
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Welcome, {teacherName}</div>
          <div style={{ fontSize: '0.95rem', color: 'var(--color-muted)' }}>Manage your classes and track attendance</div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem' }}>
          <StatTile title="Today's Sessions" value={todaySessionCount} subtitle={`${ongoingSessions} ongoing`} primary icon="📅" />
          <StatTile title="Students Present" value={presentCount} subtitle={`Out of ${totalStudents} enrolled`} icon="👥" />
          <StatTile title="Active QR Codes" value={activeQrCount} subtitle="Currently active" icon="📱" />
          <StatTile title="Total Classes" value={classes.length} subtitle={`${totalStudents} students`} icon="📚" />
        </div>

        {/* Active QR Section + Today's Sessions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '1.5rem' }}>
          {/* Active QR */}
          <div style={{ borderRadius: 16, background: '#ffffff', boxShadow: 'var(--shadow-soft)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.4rem', background: 'linear-gradient(135deg, var(--color-primary), #ff7043)', color: '#fff', fontWeight: 600, fontSize: '1.1rem' }}>
              Active QR Codes
            </div>
            <div style={{ padding: '1.6rem' }}>
              {activeQRs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>
                  <div style={{ width: 100, height: 100, borderRadius: 12, background: '#f5f0eb', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e0d5ce', fontSize: '0.9rem' }}>
                    No Active QR
                  </div>
                  <p style={{ fontSize: '0.9rem' }}>Generate a QR from the Sessions tab</p>
                  <button onClick={() => setActiveTab('sessions')} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Go to Sessions</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {activeQRs.map((item) => (
                    <div key={item.qr._id} style={{ background: '#fffaf6', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{item.class?.code}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '0.8rem' }}>{item.sessionTitle}</div>
                      <img src={item.qr.qrDataUrl} alt="QR" style={{ width: 150, height: 150, borderRadius: 8, border: '4px solid #fff' }} />
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.5rem' }}>
                        Expires: {formatTime(item.qr.expiresAt)}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '0.3rem' }}>
                        {item.qr.attendeeCount} students scanned
                      </div>
                      <button onClick={() => endQR(item.sessionId)} style={{ marginTop: '0.5rem', background: '#fff', border: '1px solid #c62828', color: '#c62828', padding: '0.4rem 1rem', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer' }}>
                        End QR
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Today's Sessions */}
          <div style={{ borderRadius: 16, background: '#ffffff', boxShadow: 'var(--shadow-soft)', padding: '1.4rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Today's Sessions</h3>
              <button onClick={() => { setActiveTab('sessions'); setShowSessionForm(true); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.85rem' }}>+ Add</button>
            </div>
            {todaySessions.length === 0 ? (
              <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '1rem' }}>No sessions today</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {todaySessions.map((session) => (
                  <div key={session._id} style={{ padding: '0.9rem 1rem', borderRadius: 12, border: '1px solid #f1dfd9', background: '#fffaf6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                      <div style={{ fontWeight: 600 }}>{session.class?.code}</div>
                      <StatusPill status={session.status} />
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{session.title || session.class?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{formatTime(session.scheduledStart)} - {formatTime(session.scheduledEnd)}</span>
                      <span>{session.attendanceCount || 0}/{session.totalStudents || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
        )}
      </div>
        </div>

        {/* Today's Attendance Table */}
        <div style={{ borderRadius: 16, background: '#ffffff', boxShadow: 'var(--shadow-soft)', padding: '1.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Recent Attendance</h3>
            <button onClick={() => setActiveTab('attendance')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.85rem' }}>View all →</button>
          </div>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f0d6d0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead style={{ background: '#fff3ec' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Student</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Class</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Time</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {todayAttendance.slice(0, 5).length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>No attendance records yet</td></tr>
                ) : (
                  todayAttendance.slice(0, 5).map((row, i) => (
                    <tr key={row._id} style={{ background: i % 2 === 0 ? '#fffaf6' : '#ffffff' }}>
                      <td style={{ padding: '0.65rem 1rem' }}>{row.student?.name}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>{row.class?.code}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>{formatTime(row.markedAt)}</td>
                      <td style={{ padding: '0.65rem 1rem' }}><StatusPill status={row.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-primary), #ff7043)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>📊</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>SmartAttend</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Teacher Portal</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {[
            { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
            { id: 'sessions', icon: '📅', label: 'Sessions' },
            { id: 'attendance', icon: '👤', label: 'Attendance' },
            { id: 'register', icon: '📊', label: 'Register' },
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

        {/* Create Class */}
        <div style={{ borderTop: '1px solid #f0e0da', paddingTop: '1rem' }}>
          <h4 style={{ margin: 0, marginBottom: '0.8rem', fontSize: '0.9rem', fontWeight: 600 }}>Create New Class</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <input type="text" placeholder="Class name" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: '0.85rem' }} />
            <input type="text" placeholder="Code (e.g. CS101)" value={newClassCode} onChange={(e) => setNewClassCode(e.target.value.toUpperCase())} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: '0.85rem' }} />
            <button className="btn btn-primary" onClick={createClass} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>Save Class</button>
          </div>
        </div>

        {/* User */}
        <div style={{ borderTop: '1px solid #f0e0da', paddingTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), #ff7043)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>{teacherName.charAt(0)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{teacherName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{teacherEmail}</div>
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

export default TeacherDashboard;
