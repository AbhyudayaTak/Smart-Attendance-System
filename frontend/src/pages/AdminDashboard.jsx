import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:4000/api';

function StatTile({ title, value, subtitle, primary, icon, trend }) {
  if (primary) {
    return (
      <div
        style={{
          borderRadius: 16,
          padding: '1.3rem 1.4rem',
          background: 'linear-gradient(135deg, var(--color-primary), #ff7043)',
          color: '#fff',
          boxShadow: 'var(--shadow-soft)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.9rem', opacity: 0.92 }}>{title}</div>
            <div style={{ fontSize: '2.1rem', fontWeight: 700, marginTop: '0.25rem' }}>{value}</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.35rem', opacity: 0.9 }}>
              {trend && <span style={{ marginRight: '0.3rem' }}>↑</span>}
              {subtitle}
            </div>
          </div>
          {icon && (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
              }}
            >
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 16,
        padding: '1.2rem 1.3rem',
        background: '#ffffff',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>
            {title}
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 700 }}>{value}</div>
          <div style={{ fontSize: '0.8rem', color: trend ? '#2e7d32' : 'var(--color-muted)', marginTop: '0.25rem' }}>
            {trend && <span style={{ marginRight: '0.3rem' }}>↑</span>}
            {subtitle}
          </div>
        </div>
        {icon && (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(178, 34, 34, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              color: 'var(--color-primary)',
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const s = status.toLowerCase();
  let bg = 'rgba(56,142,60,0.12)';
  let color = '#2e7d32';
  if (s === 'late') {
    bg = 'rgba(255,152,0,0.12)';
    color = '#e65100';
  }
  if (s === 'absent') {
    bg = 'rgba(211,47,47,0.12)';
    color = '#c62828';
  }
  return (
    <span
      style={{
        padding: '0.25rem 0.85rem',
        borderRadius: 999,
        fontSize: '0.75rem',
        fontWeight: 600,
        background: bg,
        color,
      }}
    >
      {status}
    </span>
  );
}

function AttendanceBadge({ value }) {
  let bg = 'rgba(56,142,60,0.12)';
  let color = '#2e7d32';
  if (value < 80) {
    bg = 'rgba(255,152,0,0.12)';
    color = '#e65100';
  }
  if (value < 75) {
    bg = 'rgba(211,47,47,0.12)';
    color = '#c62828';
  }
  return (
    <span
      style={{
        padding: '0.2rem 0.7rem',
        borderRadius: 999,
        fontSize: '0.8rem',
        fontWeight: 600,
        background: bg,
        color,
      }}
    >
      {value}%
    </span>
  );
}

function QuickActionCard({ icon, title, description, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 16,
        padding: '1.2rem 1.4rem',
        background: '#ffffff',
        boxShadow: 'var(--shadow-soft)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-soft)';
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'rgba(178, 34, 34, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          color: 'var(--color-primary)',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{title}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{description}</div>
      </div>
    </div>
  );
}

function AdminDashboard({ token }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ totalStudents: 0, totalTeachers: 0, overallAttendance: 0, activeClasses: 0 });
  const [departments, setDepartments] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', studentId: '', role: 'student', department: '', password: '' });
  const [classes, setClasses] = useState([]);
  const [reports, setReports] = useState([]);
  const [reportType, setReportType] = useState('all'); // 'all', 'class-wise', 'students', 'teachers'
  const [classWiseAttendance, setClassWiseAttendance] = useState([]);
  const [studentsAttendance, setStudentsAttendance] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const adminName = localStorage.getItem('name') || 'Admin User';
  const adminEmail = localStorage.getItem('email') || 'admin@school.edu';

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  }, [token]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/departments`, { headers: { Authorization: `Bearer ${token}` } });
      setDepartments(res.data);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  }, [token]);

  const fetchRecentActivity = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/recent-activity?limit=20`, { headers: { Authorization: `Bearer ${token}` } });
      setRecentActivity(res.data);
    } catch (err) {
      console.error('Failed to load recent activity', err);
    }
  }, [token]);

  const fetchUsers = useCallback(async (search = '') => {
    try {
      const params = search ? { search } : {};
      const res = await axios.get(`${API_BASE}/admin/users`, { 
        params,
        headers: { Authorization: `Bearer ${token}` } 
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  }, [token]);

  const fetchUserDetails = async (userId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      setUserDetails(res.data);
    } catch (err) {
      setMessage('Failed to load user details');
      console.error('Failed to load user details', err);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId, updates) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.put(`${API_BASE}/admin/users/${userId}`, updates, { headers: { Authorization: `Bearer ${token}` } });
      setUserDetails(res.data);
      setMessage('User updated successfully');
      fetchUsers(searchQuery); // Refresh users list
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update user');
      console.error('Failed to update user', err);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    setLoading(true);
    setMessage('');
    try {
      await axios.post(`${API_BASE}/admin/users`, newUser, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('User created successfully');
      setShowAddUserModal(false);
      setNewUser({ name: '', email: '', studentId: '', role: 'student', department: '', password: '' });
      fetchUsers(searchQuery);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create user');
      console.error('Failed to create user', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await axios.delete(`${API_BASE}/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('User deleted successfully');
      setSelectedUser(null);
      setUserDetails(null);
      fetchUsers(searchQuery);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to delete user');
      console.error('Failed to delete user', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/classes`, { headers: { Authorization: `Bearer ${token}` } });
      setClasses(res.data);
    } catch (err) {
      console.error('Failed to load classes', err);
    }
  }, [token]);

  const fetchReports = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/reports`, { headers: { Authorization: `Bearer ${token}` } });
      setReports(res.data);
    } catch (err) {
      console.error('Failed to load reports', err);
    }
  }, [token]);

  const fetchClassWiseAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/reports/class-wise`, { headers: { Authorization: `Bearer ${token}` } });
      setClassWiseAttendance(res.data);
    } catch (err) {
      console.error('Failed to load class-wise attendance', err);
      setMessage('Failed to load class-wise attendance');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchStudentsAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/reports/students-attendance`, { headers: { Authorization: `Bearer ${token}` } });
      setStudentsAttendance(res.data);
    } catch (err) {
      console.error('Failed to load students attendance', err);
      setMessage('Failed to load students attendance');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchTeachersList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/reports/teachers`, { headers: { Authorization: `Bearer ${token}` } });
      setTeachersList(res.data);
    } catch (err) {
      console.error('Failed to load teachers list', err);
      setMessage('Failed to load teachers list');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats();
      fetchDepartments();
      fetchRecentActivity();
    } else if (activeTab === 'users') {
      fetchUsers(searchQuery);
    } else if (activeTab === 'classes') {
      fetchClasses();
    } else if (activeTab === 'reports') {
      fetchReports();
      if (reportType === 'class-wise') {
        fetchClassWiseAttendance();
      } else if (reportType === 'students') {
        fetchStudentsAttendance();
      } else if (reportType === 'teachers') {
        fetchTeachersList();
      }
    }
  }, [activeTab, fetchStats, fetchDepartments, fetchRecentActivity, fetchUsers, fetchClasses, fetchReports, fetchClassWiseAttendance, fetchStudentsAttendance, fetchTeachersList, searchQuery, reportType]);

  // Auto-refresh dashboard data
  useEffect(() => {
    if (activeTab === 'dashboard') {
      const interval = setInterval(() => {
        fetchStats();
        fetchRecentActivity();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchStats, fetchRecentActivity]);

  const formatTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : '';

  const renderMain = () => {
    if (activeTab === 'users') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{
              borderRadius: 16,
              background: '#ffffff',
              boxShadow: 'var(--shadow-soft)',
              padding: '1.6rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h3 style={{ margin: 0 }}>User Management</h3>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>+</span> Add User
              </button>
            </div>
            
            {/* Search Bar */}
            <div style={{ marginBottom: '1.2rem' }}>
              <input
                type="text"
                placeholder="Search by Name, Email, or Student ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchUsers(e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '0.7rem 1rem',
                  borderRadius: 12,
                  border: '1px solid #e0e0e0',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            {/* Users Table */}
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f0d6d0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead style={{ background: '#fff3ec' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Student ID</th>
                    <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Role</th>
                    <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Department</th>
                    <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>No users found</td></tr>
                  ) : (
                    users.map((user, i) => (
                      <tr 
                        key={user._id} 
                        style={{ background: i % 2 === 0 ? '#fffaf6' : '#ffffff', cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedUser(user);
                          fetchUserDetails(user._id);
                        }}
                      >
                        <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace' }}>{user.studentId || '-'}</td>
                        <td style={{ padding: '0.65rem 1rem' }}>{user.name}</td>
                        <td style={{ padding: '0.65rem 1rem' }}>{user.email}</td>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          <StatusPill status={user.role} />
                        </td>
                        <td style={{ padding: '0.65rem 1rem' }}>{user.department || '-'}</td>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'flex-start' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                                fetchUserDetails(user._id);
                              }}
                              style={{
                                background: 'var(--color-primary)',
                                color: '#fff',
                                border: 'none',
                                padding: '0.4rem 0.8rem',
                                borderRadius: 8,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteUser(user._id);
                              }}
                              style={{
                                background: '#c62828',
                                color: '#fff',
                                border: 'none',
                                padding: '0.4rem 0.8rem',
                                borderRadius: 8,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Edit Modal */}
          {selectedUser && userDetails && (
            <div 
              onClick={() => { setSelectedUser(null); setUserDetails(null); }}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'pointer' }}
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', maxWidth: 500, width: '95%', cursor: 'default' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>Edit User</h3>
                  <button onClick={() => { setSelectedUser(null); setUserDetails(null); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0.2rem' }}>×</button>
                </div>

                {message && (
                  <div style={{ marginBottom: '1rem', padding: '0.6rem', borderRadius: 8, background: message.includes('success') ? '#e8f5e9' : '#ffebee', color: message.includes('success') ? '#2e7d32' : '#c62828', fontSize: '0.85rem' }}>
                    {message}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Name</label>
                    <input
                      type="text"
                      value={userDetails.name}
                      onChange={(e) => setUserDetails({ ...userDetails, name: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Email</label>
                    <input
                      type="email"
                      value={userDetails.email}
                      onChange={(e) => setUserDetails({ ...userDetails, email: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Student ID</label>
                    <input
                      type="text"
                      value={userDetails.studentId || ''}
                      onChange={(e) => setUserDetails({ ...userDetails, studentId: e.target.value.toUpperCase() })}
                      placeholder="e.g., 2023UCP1665"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Role</label>
                    <select
                      value={userDetails.role}
                      onChange={(e) => {
                        // Only allow student -> teacher
                        if (userDetails.role === 'student' && e.target.value === 'teacher') {
                          setUserDetails({ ...userDetails, role: e.target.value });
                        } else if (userDetails.role !== 'student' || e.target.value === 'student') {
                          setUserDetails({ ...userDetails, role: e.target.value });
                        } else {
                          alert('Only students can be promoted to teachers');
                        }
                      }}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                    {userDetails.role === 'student' && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.3rem' }}>Note: Students can only be promoted to teachers</p>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Department</label>
                    <input
                      type="text"
                      value={userDetails.department || ''}
                      onChange={(e) => setUserDetails({ ...userDetails, department: e.target.value })}
                      placeholder="e.g., Computer Science"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={() => updateUser(userDetails._id, userDetails)}
                      disabled={loading}
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => {
                        deleteUser(userDetails._id);
                      }}
                      disabled={loading}
                      style={{ 
                        padding: '0.6rem', 
                        borderRadius: 8, 
                        border: '1px solid #c62828', 
                        background: '#fff', 
                        color: '#c62828',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => { setSelectedUser(null); setUserDetails(null); }}
                      style={{ flex: 1, padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add User Modal */}
          {showAddUserModal && (
            <div 
              onClick={() => { setShowAddUserModal(false); setMessage(''); }}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'pointer' }}
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', maxWidth: 500, width: '95%', cursor: 'default' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>Add New User</h3>
                  <button onClick={() => { setShowAddUserModal(false); setMessage(''); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0.2rem' }}>×</button>
                </div>

                {message && (
                  <div style={{ marginBottom: '1rem', padding: '0.6rem', borderRadius: 8, background: message.includes('success') ? '#e8f5e9' : '#ffebee', color: message.includes('success') ? '#2e7d32' : '#c62828', fontSize: '0.85rem' }}>
                    {message}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Name *</label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Email *</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Password *</label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Role *</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value, studentId: e.target.value === 'student' ? newUser.studentId : '' })}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {newUser.role === 'student' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Student ID *</label>
                      <input
                        type="text"
                        value={newUser.studentId}
                        onChange={(e) => setNewUser({ ...newUser, studentId: e.target.value.toUpperCase() })}
                        placeholder="e.g., 2023UCP1665"
                        style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Department</label>
                    <input
                      type="text"
                      value={newUser.department}
                      onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                      placeholder="e.g., Computer Science"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={createUser}
                      disabled={loading}
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                    >
                      {loading ? 'Creating...' : 'Create User'}
                    </button>
                    <button
                      onClick={() => { setShowAddUserModal(false); setMessage(''); }}
                      style={{ flex: 1, padding: '0.6rem', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'classes') {
      return (
        <div
          style={{
            borderRadius: 16,
            background: '#ffffff',
            boxShadow: 'var(--shadow-soft)',
            padding: '1.6rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 style={{ margin: 0 }}>Class Management</h3>
          </div>
          
          {classes.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '2rem' }}>No classes found</p>
          ) : (
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f0d6d0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead style={{ background: '#fff3ec' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Code</th>
                    <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Teacher</th>
                    <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Department</th>
                    <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Students</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls, i) => (
                    <tr key={cls._id} style={{ background: i % 2 === 0 ? '#fffaf6' : '#ffffff' }}>
                      <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>{cls.code}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>{cls.name}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>{cls.teacher?.name || '-'}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>{cls.department || '-'}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>{cls.students?.length || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'reports') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Report Type Selector */}
          <div
            style={{
              borderRadius: 16,
              background: '#ffffff',
              boxShadow: 'var(--shadow-soft)',
              padding: '1.6rem',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0' }}>Reports & Analytics</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Attendance Records', icon: '📋' },
                { id: 'class-wise', label: 'Class-wise Attendance', icon: '📚' },
                { id: 'students', label: 'Students Attendance', icon: '👥' },
                { id: 'teachers', label: 'Teachers List', icon: '👨‍🏫' },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setReportType(type.id);
                    if (type.id === 'class-wise') {
                      fetchClassWiseAttendance();
                    } else if (type.id === 'students') {
                      fetchStudentsAttendance();
                    } else if (type.id === 'teachers') {
                      fetchTeachersList();
                    }
                  }}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: 999,
                    border: reportType === type.id ? '2px solid var(--color-primary)' : '1px solid #e0e0e0',
                    background: reportType === type.id ? '#ffe3dd' : '#fff',
                    color: reportType === type.id ? 'var(--color-primary)' : '#333',
                    fontWeight: reportType === type.id ? 600 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* All Attendance Records */}
          {reportType === 'all' && (
            <div
              style={{
                borderRadius: 16,
                background: '#ffffff',
                boxShadow: 'var(--shadow-soft)',
                padding: '1.6rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h3 style={{ margin: 0 }}>All Attendance Records</h3>
                <button
                  onClick={() => {
                    const rows = [['Student ID', 'Name', 'Email', 'Department', 'Class', 'Session', 'Date', 'Time', 'Status']];
                    reports.forEach(row => {
                      rows.push([
                        row.student?.studentId || '-',
                        row.student?.name || '-',
                        row.student?.email || '-',
                        row.student?.department || '-',
                        row.class?.code || '-',
                        row.session?.title || '-',
                        formatDate(row.session?.scheduledStart),
                        formatTime(row.markedAt),
                        row.status,
                      ]);
                    });
                    const csv = rows.map(r => r.join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                  }}
                  className="btn"
                  style={{
                    border: '1px solid var(--color-primary)',
                    background: '#fff',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>↓</span> Export CSV
                </button>
              </div>

              {reports.length === 0 ? (
                <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '2rem' }}>No reports found</p>
              ) : (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f0d6d0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead style={{ background: '#fff3ec' }}>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Student ID</th>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Department</th>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Class</th>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Session</th>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Date</th>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Time</th>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((row, i) => (
                        <tr key={row._id} style={{ background: i % 2 === 0 ? '#fffaf6' : '#ffffff' }}>
                          <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace' }}>{row.student?.studentId || '-'}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{row.student?.name}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{row.student?.department || '-'}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{row.class?.code}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{row.session?.title || '-'}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{formatDate(row.session?.scheduledStart)}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{formatTime(row.markedAt)}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <StatusPill status={row.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Class-wise Attendance */}
          {reportType === 'class-wise' && (
            <div
              style={{
                borderRadius: 16,
                background: '#ffffff',
                boxShadow: 'var(--shadow-soft)',
                padding: '1.6rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h3 style={{ margin: 0 }}>Class-wise Attendance Statistics</h3>
                <button
                  onClick={() => {
                    const rows = [['Class Code', 'Class Name', 'Department', 'Teacher', 'Total Students', 'Total Sessions', 'Present', 'Late', 'Absent', 'Attendance %']];
                    classWiseAttendance.forEach(item => {
                      rows.push([
                        item.class.code,
                        item.class.name,
                        item.class.department || '-',
                        item.class.teacher?.name || '-',
                        item.statistics.totalStudents,
                        item.statistics.totalSessions,
                        item.statistics.totalPresent,
                        item.statistics.totalLate,
                        item.statistics.totalAbsent,
                        item.statistics.attendancePercentage + '%',
                      ]);
                    });
                    const csv = rows.map(r => r.join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `class_wise_attendance_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                  }}
                  className="btn"
                  style={{
                    border: '1px solid var(--color-primary)',
                    background: '#fff',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>↓</span> Export CSV
                </button>
              </div>

              {loading ? (
                <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '2rem' }}>Loading...</p>
              ) : classWiseAttendance.length === 0 ? (
                <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '2rem' }}>No class data found</p>
              ) : (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f0d6d0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead style={{ background: '#fff3ec' }}>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Class Code</th>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Class Name</th>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Department</th>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Teacher</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Students</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Sessions</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Present</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Late</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Absent</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Attendance %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classWiseAttendance.map((item, i) => (
                        <tr key={item.class._id} style={{ background: i % 2 === 0 ? '#fffaf6' : '#ffffff' }}>
                          <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>{item.class.code}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{item.class.name}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{item.class.department || '-'}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{item.class.teacher?.name || '-'}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>{item.statistics.totalStudents}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>{item.statistics.totalSessions}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: '#2e7d32', fontWeight: 600 }}>{item.statistics.totalPresent}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: '#e65100', fontWeight: 600 }}>{item.statistics.totalLate}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: '#c62828', fontWeight: 600 }}>{item.statistics.totalAbsent}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                            <AttendanceBadge value={item.statistics.attendancePercentage} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Students Attendance */}
          {reportType === 'students' && (
            <div
              style={{
                borderRadius: 16,
                background: '#ffffff',
                boxShadow: 'var(--shadow-soft)',
                padding: '1.6rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h3 style={{ margin: 0 }}>All Students Attendance Report</h3>
                <button
                  onClick={() => {
                    const rows = [['Student ID', 'Name', 'Email', 'Department', 'Total Sessions', 'Present', 'Late', 'Absent', 'Overall Attendance %']];
                    studentsAttendance.forEach(item => {
                      rows.push([
                        item.student.studentId || '-',
                        item.student.name,
                        item.student.email,
                        item.student.department || '-',
                        item.overall.totalSessions,
                        item.overall.present,
                        item.overall.late,
                        item.overall.absent,
                        item.overall.attendancePercentage + '%',
                      ]);
                    });
                    const csv = rows.map(r => r.join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `students_attendance_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                  }}
                  className="btn"
                  style={{
                    border: '1px solid var(--color-primary)',
                    background: '#fff',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>↓</span> Export CSV
                </button>
              </div>

              {loading ? (
                <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '2rem' }}>Loading...</p>
              ) : studentsAttendance.length === 0 ? (
                <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '2rem' }}>No student data found</p>
              ) : (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f0d6d0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead style={{ background: '#fff3ec' }}>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Student ID</th>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Email</th>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Department</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Total Sessions</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Present</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Late</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Absent</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Attendance %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsAttendance.map((item, i) => (
                        <tr key={item.student._id} style={{ background: i % 2 === 0 ? '#fffaf6' : '#ffffff' }}>
                          <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace' }}>{item.student.studentId || '-'}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{item.student.name}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{item.student.email}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{item.student.department || '-'}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>{item.overall.totalSessions}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: '#2e7d32', fontWeight: 600 }}>{item.overall.present}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: '#e65100', fontWeight: 600 }}>{item.overall.late}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: '#c62828', fontWeight: 600 }}>{item.overall.absent}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                            <AttendanceBadge value={item.overall.attendancePercentage} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Teachers List */}
          {reportType === 'teachers' && (
            <div
              style={{
                borderRadius: 16,
                background: '#ffffff',
                boxShadow: 'var(--shadow-soft)',
                padding: '1.6rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h3 style={{ margin: 0 }}>Teachers List & Statistics</h3>
                <button
                  onClick={() => {
                    const rows = [['Name', 'Email', 'Department', 'Total Classes', 'Total Students', 'Total Sessions', 'Present', 'Late', 'Absent', 'Attendance %']];
                    teachersList.forEach(item => {
                      rows.push([
                        item.teacher.name,
                        item.teacher.email,
                        item.teacher.department || '-',
                        item.statistics.totalClasses,
                        item.statistics.totalStudents,
                        item.statistics.totalSessions,
                        item.statistics.totalPresent,
                        item.statistics.totalLate,
                        item.statistics.totalAbsent,
                        item.statistics.attendancePercentage + '%',
                      ]);
                    });
                    const csv = rows.map(r => r.join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `teachers_list_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                  }}
                  className="btn"
                  style={{
                    border: '1px solid var(--color-primary)',
                    background: '#fff',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>↓</span> Export CSV
                </button>
              </div>

              {loading ? (
                <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '2rem' }}>Loading...</p>
              ) : teachersList.length === 0 ? (
                <p style={{ color: 'var(--color-muted)', textAlign: 'center', padding: '2rem' }}>No teachers found</p>
              ) : (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f0d6d0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead style={{ background: '#fff3ec' }}>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Email</th>
                        <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Department</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Classes</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Students</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Sessions</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Present</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Late</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Absent</th>
                        <th style={{ textAlign: 'center', padding: '0.7rem 1rem' }}>Attendance %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachersList.map((item, i) => (
                        <tr key={item.teacher._id} style={{ background: i % 2 === 0 ? '#fffaf6' : '#ffffff' }}>
                          <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>{item.teacher.name}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{item.teacher.email}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{item.teacher.department || '-'}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>{item.statistics.totalClasses}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>{item.statistics.totalStudents}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>{item.statistics.totalSessions}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: '#2e7d32', fontWeight: 600 }}>{item.statistics.totalPresent}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: '#e65100', fontWeight: 600 }}>{item.statistics.totalLate}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: '#c62828', fontWeight: 600 }}>{item.statistics.totalAbsent}</td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                            <AttendanceBadge value={item.statistics.attendancePercentage} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'settings') {
      const handleClearAttendance = async () => {
        const confirmed = window.confirm(
          '⚠️ WARNING: This will permanently delete ALL attendance records from ALL sessions.\n\n' +
          'This action cannot be undone. Are you absolutely sure you want to proceed?'
        );
        
        if (!confirmed) return;

        const doubleConfirm = window.confirm(
          'This is your final confirmation. All attendance data will be lost.\n\n' +
          'Click OK to proceed with deletion.'
        );

        if (!doubleConfirm) return;

        setLoading(true);
        setMessage('');
        try {
          await axios.delete(`${API_BASE}/admin/attendance/clear`, { 
            headers: { Authorization: `Bearer ${token}` } 
          });
          setMessage('All attendance records have been cleared successfully');
          // Refresh reports and stats
          fetchReports();
          fetchStats();
          if (reportType === 'class-wise') {
            fetchClassWiseAttendance();
          } else if (reportType === 'students') {
            fetchStudentsAttendance();
          } else if (reportType === 'teachers') {
            fetchTeachersList();
          }
        } catch (err) {
          setMessage(err.response?.data?.message || 'Failed to clear attendance records');
          console.error('Failed to clear attendance', err);
        } finally {
          setLoading(false);
        }
      };

      return (
        <div
          style={{
            borderRadius: 16,
            background: '#ffffff',
            boxShadow: 'var(--shadow-soft)',
            padding: '1.6rem',
          }}
        >
          <h3 style={{ margin: 0, marginBottom: '1.2rem' }}>System Settings</h3>
          
          {message && (
            <div style={{ 
              marginBottom: '1rem', 
              padding: '0.8rem', 
              borderRadius: 8, 
              background: message.includes('success') ? '#e8f5e9' : '#ffebee', 
              color: message.includes('success') ? '#2e7d32' : '#c62828', 
              fontSize: '0.9rem' 
            }}>
              {message}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ borderRadius: 12, border: '1px solid #f0d6d0', padding: '1.2rem', background: '#fffaf6' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#c62828' }}>⚠️ Danger Zone</h4>
              <p style={{ margin: '0 0 1rem 0', color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                Permanently delete all attendance records from all sessions. This action cannot be undone.
              </p>
              <button
                onClick={handleClearAttendance}
                disabled={loading}
                style={{
                  padding: '0.7rem 1.4rem',
                  borderRadius: 8,
                  border: '1px solid #c62828',
                  background: '#fff',
                  color: '#c62828',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Clearing...' : '🗑️ Clear All Attendance Records'}
              </button>
            </div>

            <div style={{ borderRadius: 12, border: '1px solid #e0e0e0', padding: '1.2rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0' }}>System Preferences</h4>
              <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                Configure system preferences, attendance rules, and notification settings.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Dashboard tab (default)
    return (
      <>
        {/* Header with title and actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Admin Dashboard
            </div>
            <div style={{ fontSize: '0.95rem', color: 'var(--color-muted)' }}>
              System overview and management
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button
              className="btn"
              style={{
                border: '1px solid var(--color-primary)',
                background: '#fff',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>↓</span> Export Report
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span>+</span> Add User
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '1rem',
          }}
        >
          <StatTile
            title="Total Students"
            value={stats.totalStudents}
            subtitle={`${departments.length} departments`}
            primary
            icon="👥"
          />
          <StatTile
            title="Total Teachers"
            value={stats.totalTeachers}
            subtitle={`Across ${departments.length} departments`}
            icon="📚"
          />
          <StatTile
            title="Overall Attendance"
            value={`${stats.overallAttendance}%`}
            subtitle="System wide"
            icon="📈"
          />
          <StatTile
            title="Active Classes"
            value={stats.activeClasses}
            subtitle="This semester"
            icon="📋"
          />
        </div>

        {/* Departments Overview */}
        <div
          style={{
            borderRadius: 16,
            background: '#ffffff',
            boxShadow: 'var(--shadow-soft)',
            padding: '1.6rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <h3 style={{ margin: 0 }}>Departments Overview</h3>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.9rem',
              }}
            >
              View All <span>→</span>
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            {departments.length === 0 ? (
              <p style={{ color: 'var(--color-muted)', padding: '1rem' }}>No departments found</p>
            ) : (
              departments.map((dept) => (
                <div
                  key={dept.name}
                  style={{
                    borderRadius: 12,
                    border: '1px solid #f1dfd9',
                    background: '#fffaf6',
                    padding: '1.1rem 1.2rem',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.8rem', fontSize: '1rem' }}>
                    {dept.name}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-muted)' }}>Students</span>
                      <span style={{ fontWeight: 500 }}>{dept.students}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-muted)' }}>Teachers</span>
                      <span style={{ fontWeight: 500 }}>{dept.teachers}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-muted)' }}>Attendance</span>
                      <AttendanceBadge value={dept.attendance} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '1rem',
          }}
        >
          <QuickActionCard
            icon="👥"
            title="Manage Users"
            description="Add, edit, or remove users"
            onClick={() => setActiveTab('users')}
          />
          <QuickActionCard
            icon="📚"
            title="Class Settings"
            description="Configure classes and subjects"
            onClick={() => setActiveTab('classes')}
          />
          <QuickActionCard
            icon="↓"
            title="Generate Reports"
            description="Export attendance data"
            onClick={() => setActiveTab('reports')}
          />
          <QuickActionCard
            icon="⚙"
            title="System Settings"
            description="Configure system preferences"
            onClick={() => setActiveTab('settings')}
          />
        </div>

        {/* Recent Attendance Activity */}
        <div
          style={{
            borderRadius: 16,
            background: '#ffffff',
            boxShadow: 'var(--shadow-soft)',
            padding: '1.6rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h3 style={{ margin: 0 }}>Recent Attendance Activity</h3>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                type="button"
                style={{
                  borderRadius: 999,
                  border: '1px solid var(--color-primary)',
                  background: '#fff',
                  color: 'var(--color-primary)',
                  padding: '0.4rem 1rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                <span>⚙</span> Filter
              </button>
              <button
                type="button"
                onClick={() => {
                  const rows = [['Student', 'Student ID', 'Class', 'Date', 'Time', 'Status']];
                  recentActivity.forEach(row => {
                    rows.push([
                      row.student?.name || '-',
                      row.student?.studentId || '-',
                      row.class?.code || '-',
                      formatDate(row.date),
                      formatTime(row.markedAt),
                      row.status,
                    ]);
                  });
                  const csv = rows.map(r => r.join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `attendance_activity_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                }}
                style={{
                  borderRadius: 999,
                  border: '1px solid #e0e0e0',
                  background: '#fff',
                  color: '#333',
                  padding: '0.4rem 1rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                <span>↓</span> Export CSV
              </button>
            </div>
          </div>
          <div
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #f0d6d0',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead style={{ background: '#fff3ec' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Student</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Student ID</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Class</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Time</th>
                  <th style={{ textAlign: 'left', padding: '0.7rem 1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>No recent activity</td></tr>
                ) : (
                  recentActivity.map((row, i) => (
                    <tr
                      key={row._id}
                      style={{ background: i % 2 === 0 ? '#fffaf6' : '#ffffff' }}
                    >
                      <td style={{ padding: '0.65rem 1rem' }}>{row.student?.name}</td>
                      <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace' }}>{row.student?.studentId || '-'}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>{row.class?.code}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>{formatDate(row.date)}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>{formatTime(row.markedAt)}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <StatusPill status={row.status} />
                      </td>
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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '230px minmax(0, 1fr)',
        gap: '1.6rem',
        width: '100%',
        alignItems: 'start',
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          borderRadius: 20,
          background: '#ffffff',
          boxShadow: 'var(--shadow-soft)',
          padding: '1.5rem 1.3rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.4rem',
        }}
      >
        {/* Logo / Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.5rem' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, var(--color-primary), #ff7043)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '1.1rem',
              fontWeight: 700,
            }}
          >
            📊
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>SmartAttend</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Admin Portal</div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {[
            { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
            { id: 'users', icon: '👤', label: 'Users' },
            { id: 'classes', icon: '📚', label: 'Classes' },
            { id: 'reports', icon: '📋', label: 'Reports' },
            { id: 'settings', icon: '⚙', label: 'Settings' },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '0.7rem',
                  width: '100%',
                  padding: '0.7rem 1rem',
                  borderRadius: 10,
                  border: 'none',
                  background: isActive ? '#ffe3dd' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : '#555',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, color 0.15s ease',
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ width: '20px', flexShrink: 0, display: 'inline-block', textAlign: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User info at bottom */}
        <div
          style={{
            borderTop: '1px solid #f0e0da',
            paddingTop: '1rem',
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.7rem',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary), #ff7043)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            {adminName.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {adminName}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {adminEmail}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {renderMain()}
      </section>
    </div>
  );
}

export default AdminDashboard;

