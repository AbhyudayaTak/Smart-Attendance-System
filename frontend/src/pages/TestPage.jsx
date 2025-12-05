import { useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:4000/api';

function TestPage() {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState({ total: 0, passed: 0, failed: 0 });

  // Test helper functions
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const addResult = (testId, testName, status, message, details = {}) => {
    setTestResults(prev => {
      // Check if result with this testId already exists
      const existingIndex = prev.findIndex(r => r.id === testId);
      
      if (existingIndex >= 0) {
        // Update existing result
        const updated = [...prev];
        updated[existingIndex] = {
          id: testId,
          name: testName,
          status,
          message,
          details,
          timestamp: updated[existingIndex].timestamp || new Date().toLocaleTimeString()
        };
        return updated;
      } else {
        // Add new result
        return [...prev, {
          id: testId,
          name: testName,
          status,
          message,
          details,
          timestamp: new Date().toLocaleTimeString()
        }];
      }
    });
  };

  // Test Cases
  const testCases = {
    // Positive Tests
    async testUserSignup() {
      const testId = 'TC_POS_001';
      addResult(testId, 'User Registration', 'running', 'Testing user signup...');
      
      try {
        const testEmail = `test_${Date.now()}@example.com`;
        const testStudentId = `2023UCP${Math.floor(Math.random() * 10000)}`;
        
        const response = await axios.post(`${API_BASE}/auth/signup`, {
          name: 'Test User',
          email: testEmail,
          studentId: testStudentId,
          password: 'TestPass123'
        });

        if (response.status === 201 && response.data.token) {
          addResult(testId, 'User Registration', 'pass', 'User registered successfully', {
            email: testEmail,
            studentId: testStudentId
          });
          return { success: true, token: response.data.token, email: testEmail };
        } else {
          addResult(testId, 'User Registration', 'fail', 'Registration failed - unexpected response');
          return { success: false };
        }
      } catch (error) {
        addResult(testId, 'User Registration', 'fail', 
          `Registration failed: ${error.response?.data?.message || error.message}`);
        return { success: false };
      }
    },

    async testUserLogin(email, password) {
      const testId = 'TC_POS_001_LOGIN';
      addResult(testId, 'User Login', 'running', 'Testing user login...');
      
      try {
        const response = await axios.post(`${API_BASE}/auth/login`, {
          email,
          password
        });

        if (response.status === 200 && response.data.token) {
          addResult(testId, 'User Login', 'pass', 'Login successful', {
            role: response.data.role
          });
          return { success: true, token: response.data.token, role: response.data.role };
        } else {
          addResult(testId, 'User Login', 'fail', 'Login failed - unexpected response');
          return { success: false };
        }
      } catch (error) {
        addResult(testId, 'User Login', 'fail', 
          `Login failed: ${error.response?.data?.message || error.message}`);
        return { success: false };
      }
    },

    async testInvalidLogin() {
      const testId = 'TC_NEG_001';
      addResult(testId, 'Invalid Login Credentials', 'running', 'Testing invalid login...');
      
      try {
        await axios.post(`${API_BASE}/auth/login`, {
          email: 'nonexistent@example.com',
          password: 'WrongPassword123'
        });
        addResult(testId, 'Invalid Login Credentials', 'fail', 'Login should have failed but succeeded');
        return { success: false };
      } catch (error) {
        if (error.response?.status === 401) {
          addResult(testId, 'Invalid Login Credentials', 'pass', 'Correctly rejected invalid credentials');
          return { success: true };
        } else {
          addResult(testId, 'Invalid Login Credentials', 'fail', 
            `Unexpected error: ${error.message}`);
          return { success: false };
        }
      }
    },

    async testInvalidStudentIdFormat() {
      const testId = 'TC_NEG_002';
      addResult(testId, 'Invalid Student ID Format', 'running', 'Testing invalid student ID...');
      
      try {
        await axios.post(`${API_BASE}/auth/signup`, {
          name: 'Test User',
          email: `test_${Date.now()}@example.com`,
          studentId: 'INVALID123',
          password: 'TestPass123'
        });
        addResult(testId, 'Invalid Student ID Format', 'fail', 'Signup should have failed but succeeded');
        return { success: false };
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message?.includes('Student ID')) {
          addResult(testId, 'Invalid Student ID Format', 'pass', 'Correctly rejected invalid student ID format');
          return { success: true };
        } else {
          addResult(testId, 'Invalid Student ID Format', 'fail', 
            `Unexpected error: ${error.message}`);
          return { success: false };
        }
      }
    },


    async testExpiredQR(studentToken) {
      const testId = 'TC_NEG_003';
      addResult(testId, 'Expired QR Code', 'running', 'Testing expired QR code...');
      
      try {
        // Use a fake expired token
        await axios.post(`${API_BASE}/attendance/mark`, {
          token: 'expired-token-12345'
        }, {
          headers: { Authorization: `Bearer ${studentToken}` }
        });
        addResult(testId, 'Expired QR Code', 'fail', 'Should have rejected expired QR code');
        return { success: false };
      } catch (error) {
        if (error.response?.status === 404 || error.response?.status === 400) {
          addResult(testId, 'Expired QR Code', 'pass', 'Correctly rejected expired/invalid QR code');
          return { success: true };
        } else {
          addResult(testId, 'Expired QR Code', 'fail', 
            `Unexpected error: ${error.message}`);
          return { success: false };
        }
      }
    },

    async testUnauthorizedAccess() {
      const testId = 'TC_NEG_007';
      addResult(testId, 'Unauthorized Access', 'running', 'Testing unauthorized route access...');
      
      try {
        await axios.get(`${API_BASE}/classes`, {
          headers: { Authorization: 'Bearer invalid-token' }
        });
        addResult(testId, 'Unauthorized Access', 'fail', 'Should have rejected invalid token');
        return { success: false };
      } catch (error) {
        if (error.response?.status === 401) {
          addResult(testId, 'Unauthorized Access', 'pass', 'Correctly rejected unauthorized access');
          return { success: true };
        } else {
          addResult(testId, 'Unauthorized Access', 'fail', 
            `Unexpected error: ${error.message}`);
          return { success: false };
        }
      }
    },

  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setSummary({ total: 0, passed: 0, failed: 0 });

    let passed = 0;
    let failed = 0;
    let studentToken = null;

    try {
      // Test 1: User Signup
      const signupResult = await testCases.testUserSignup();
      if (signupResult.success) {
        passed++;
        studentToken = signupResult.token;
      } else {
        failed++;
      }
      await delay(500);

      // Test 2: User Login (if signup succeeded, test login)
      if (signupResult.success) {
        const loginResult = await testCases.testUserLogin(signupResult.email, 'TestPass123');
        if (loginResult.success) {
          passed++;
        } else {
          failed++;
        }
        await delay(500);
      }

      // Test 3: Invalid Login
      const invalidLoginResult = await testCases.testInvalidLogin();
      if (invalidLoginResult.success) {
        passed++;
      } else {
        failed++;
      }
      await delay(500);

      // Test 4: Invalid Student ID
      const invalidIdResult = await testCases.testInvalidStudentIdFormat();
      if (invalidIdResult.success) {
        passed++;
      } else {
        failed++;
      }
      await delay(500);

      // Test 5: Unauthorized Access
      const unauthorizedResult = await testCases.testUnauthorizedAccess();
      if (unauthorizedResult.success) {
        passed++;
      } else {
        failed++;
      }
      await delay(500);


      // Test 9: Join Class
      if (studentToken && testClassCode) {
        const joinResult = await testCases.testJoinClass(studentToken, testClassCode);
        if (joinResult.success) {
          passed++;
        } else {
          failed++;
        }
        await delay(500);
      }

      // Test 10: Mark Attendance
      if (studentToken && qrToken) {
        const attendanceResult = await testCases.testMarkAttendance(studentToken, qrToken);
        if (attendanceResult.success) {
          passed++;
        } else {
          failed++;
        }
        await delay(500);
      }

      // Test 11: Expired QR
      if (studentToken) {
        const expiredResult = await testCases.testExpiredQR(studentToken);
        if (expiredResult.success) {
          passed++;
        } else {
          failed++;
        }
        await delay(500);
      }


    } catch (error) {
      addResult('TEST_SUITE', 'Test Suite', 'fail', 
        `Test suite error: ${error.message}`);
    }

    setSummary({
      total: passed + failed,
      passed,
      failed
    });
    setIsRunning(false);
  };

  const clearResults = () => {
    setTestResults([]);
    setSummary({ total: 0, passed: 0, failed: 0 });
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0' }}>Automated Test Suite</h1>
        <p style={{ color: 'var(--color-muted)', margin: 0 }}>
          Run automated tests to verify system functionality
        </p>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={runAllTests}
          disabled={isRunning}
          style={{
            padding: '0.8rem 1.5rem',
            borderRadius: 8,
            border: 'none',
            background: isRunning ? '#ccc' : 'var(--color-primary)',
            color: '#fff',
            fontWeight: 600,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
          }}
        >
          {isRunning ? '🔄 Running Tests...' : '▶️ Run All Tests'}
        </button>
        <button
          onClick={clearResults}
          disabled={isRunning}
          style={{
            padding: '0.8rem 1.5rem',
            borderRadius: 8,
            border: '1px solid #ddd',
            background: '#fff',
            color: '#333',
            fontWeight: 600,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
          }}
        >
          🗑️ Clear Results
        </button>
      </div>

      {/* Summary */}
      {summary.total > 0 && (
        <div style={{
          borderRadius: 12,
          padding: '1rem 1.5rem',
          background: '#fff',
          boxShadow: 'var(--shadow-soft)',
          marginBottom: '1rem',
          display: 'flex',
          gap: '1.5rem',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>
              Total Tests
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{summary.total}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>
              Passed
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2e7d32' }}>
              {summary.passed}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>
              Failed
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c62828' }}>
              {summary.failed}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>
              Success Rate
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0}%
            </div>
          </div>
        </div>
      )}

      {/* Test Results */}
      <div style={{
        borderRadius: 12,
        background: '#fff',
        boxShadow: 'var(--shadow-soft)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '0.6rem 1rem',
          background: '#fff3ec',
          borderBottom: '1px solid #f0d6d0',
          fontWeight: 600,
          fontSize: '0.9rem',
        }}>
          Test Results
        </div>
        <div style={{ maxHeight: 'none', overflowY: 'visible' }}>
          {testResults.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
              No tests run yet. Click "Run All Tests" to start.
            </div>
          ) : (
            testResults.map((result, index) => (
              <div
                key={index}
                style={{
                  padding: '0.5rem 1rem',
                  borderBottom: '1px solid #f0f0f0',
                  background: index % 2 === 0 ? '#fffaf6' : '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: result.status === 'pass' ? '#4caf50' : 
                                result.status === 'fail' ? '#f44336' : '#ff9800',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    flexShrink: 0,
                  }}>
                    {result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⟳'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.1rem' }}>
                      {result.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)' }}>
                      {result.id} • {result.timestamp}
                    </div>
                  </div>
                  <div style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: 999,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    background: result.status === 'pass' ? 'rgba(76,175,80,0.15)' : 
                                result.status === 'fail' ? 'rgba(244,67,54,0.15)' : 'rgba(255,152,0,0.15)',
                    color: result.status === 'pass' ? '#2e7d32' : 
                           result.status === 'fail' ? '#c62828' : '#e65100',
                    flexShrink: 0,
                  }}>
                    {result.status.toUpperCase()}
                  </div>
                </div>
                <div style={{ 
                  marginTop: '0.3rem', 
                  padding: '0.4rem 0.6rem',
                  background: '#f9f9f9',
                  borderRadius: 4,
                  fontSize: '0.8rem',
                  lineHeight: 1.4,
                }}>
                  {result.message}
                  {Object.keys(result.details).length > 0 && (
                    <div style={{ marginTop: '0.3rem', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                      {Object.entries(result.details).map(([key, value]) => (
                        <span key={key} style={{ marginRight: '0.8rem' }}>
                          <strong>{key}:</strong> {value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        borderRadius: 12,
        background: '#fff8f2',
        border: '1px solid #ffe3dd',
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>📋 Test Instructions</h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#5a3b3b', lineHeight: 1.8 }}>
          <li>Ensure the backend server is running on port 4000</li>
          <li>Ensure MongoDB is connected and running</li>
          <li>Some tests require demo accounts (admin@example.com, teacher@example.com)</li>
          <li>Tests will create temporary test data (users, classes, sessions)</li>
          <li>Review test results for any failures and check console for details</li>
        </ul>
      </div>
    </div>
  );
}

export default TestPage;

