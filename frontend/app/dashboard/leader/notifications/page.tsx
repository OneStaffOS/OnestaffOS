"use client";

import { useState, useEffect } from 'react';
import axios from '@/lib/axios-config';
import Select from 'react-select';
import DashboardLayout from '../../../components/DashboardLayout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { SystemRole } from '@/lib/roles';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
export default function LeaderNotifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('ALL');
  const [positions, setPositions] = useState<any[]>([]);
  const [targetPositionIds, setTargetPositionIds] = useState<string[]>([]);
  const [teamEmployees, setTeamEmployees] = useState<any[]>([]);
  const [targetEmployeeIds, setTargetEmployeeIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [posRes, teamRes] = await Promise.all([
          axios.get('/organization-structure/positions'),
          axios.get('/employee-profile/team/profiles'),
        ]);
        setPositions(posRes.data || []);
        setTeamEmployees(teamRes.data || []);
      } catch (err) {
        // non-blocking: positions or team may be restricted for some roles
        console.warn('Failed to load positions or team employees', err);
      }
    };
    load();
  }, []);

  const submit = async () => {
    if (!title || !message) return alert('Title and message required');
    setSubmitting(true);
    try {
      const payload: any = { title, message, targetRole };
      // Explicitly set sendAt to now so messages are immediate
      payload.sendAt = new Date().toISOString();
      if (targetPositionIds && targetPositionIds.length > 0) payload.targetPositionIds = targetPositionIds;
      if (targetEmployeeIds && targetEmployeeIds.length > 0) payload.targetEmployeeIds = targetEmployeeIds;

      await axios.post('/notifications', payload);
      alert('Notification sent');
      setTitle(''); setMessage(''); setTargetPositionIds([]); setTargetEmployeeIds([]);
    } catch (err) {
      console.error('Create failed', err);
      alert('Failed to create notification');
    } finally { setSubmitting(false); }
  };

  return (
    <ProtectedRoute requiredRoles={[SystemRole.DEPARTMENT_EMPLOYEE,SystemRole.DEPARTMENT_HEAD, SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Post Notification" role="Leader">
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
          {/* Header */}
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            padding: '2.5rem',
            marginBottom: '2rem',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
          }}>
            <h1 style={{ color: 'white', fontSize: '2.5rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
               Post Announcement
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem', margin: '0.5rem 0 0 0' }}>
              Send notifications to your team, department, or entire organization
            </p>
          </div>

          {/* Form Container */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '2.5rem',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
          }}>
            {/* Title Field */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '1rem', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '0.75rem' 
              }}>
                 Title
              </label>
              <input 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter announcement title..." style={{
                  width: '100%',
                  padding: '0.875rem 1.25rem',
                  fontSize: '1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Message Field */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '1rem', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '0.75rem' 
              }}>
                 Message
              </label>
              <textarea 
                value={message} 
                onChange={e => setMessage(e.target.value)}
                placeholder="Enter your announcement message..." rows={6}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.25rem',
                  fontSize: '1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Target Role Field */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '1rem', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '0.75rem' 
              }}>
                 Target Role
              </label>
              <select 
                value={targetRole} 
                onChange={e => setTargetRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.25rem',
                  fontSize: '1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              >
                <option value="ALL">All Employees</option>
                <option value="EMPLOYEE">Employees</option>
                <option value="MANAGER">Managers</option>
              </select>
            </div>

            {/* Target Positions Field */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '1rem', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '0.75rem' 
              }}>
                 Target Positions (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <Select
                  isMulti
                  options={(positions || []).map(p => ({ value: p._id || p.id, label: p.title || p.name || `${p._id}` }))}
                  value={(positions || [])
                    .map(p => (p._id || p.id))
                    .filter(id => targetPositionIds.includes(id))
                    .map(id => ({ value: id, label: ((positions || []).find(p => (p._id || p.id) === id)?.title || id) }))}
                  onChange={(selected: any) => setTargetPositionIds((selected || []).map((s: any) => s.value))}
                  placeholder="Search and select positions..." styles={{
                    control: (base: any) => ({
                      ...base,
                      padding: '0.375rem 0.5rem',
                      fontSize: '1rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      boxShadow: 'none',
                      '&:hover': { borderColor: '#667eea' },
                      '&:focus-within': { borderColor: '#667eea' }
                    }),
                    multiValue: (base: any) => ({
                      ...base,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '6px',
                    }),
                    multiValueLabel: (base: any) => ({
                      ...base,
                      color: 'white',
                      fontWeight: '600'
                    }),
                    multiValueRemove: (base: any) => ({
                      ...base,
                      color: 'white',
                      '&:hover': { background: 'rgba(0,0,0,0.2)', color: 'white' }
                    })
                  }}
                />
              </div>
            </div>

            {/* Target Employees Field */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '1rem', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '0.75rem' 
              }}>
                 Target Employees (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <Select
                  isMulti
                  options={teamEmployees.map(emp => ({ value: emp._id || emp.id, label: emp.fullName || emp.displayName || `${emp._id}` }))}
                  value={teamEmployees
                    .map(emp => (emp._id || emp.id))
                    .filter(id => targetEmployeeIds.includes(id))
                    .map(id => ({ value: id, label: (teamEmployees.find(emp => (emp._id || emp.id) === id)?.fullName || id) }))}
                  onChange={(selected: any) => setTargetEmployeeIds((selected || []).map((s: any) => s.value))}
                  placeholder="Search and select employees..." styles={{
                    control: (base: any) => ({
                      ...base,
                      padding: '0.375rem 0.5rem',
                      fontSize: '1rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      boxShadow: 'none',
                      '&:hover': { borderColor: '#667eea' },
                      '&:focus-within': { borderColor: '#667eea' }
                    }),
                    multiValue: (base: any) => ({
                      ...base,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderRadius: '6px',
                    }),
                    multiValueLabel: (base: any) => ({
                      ...base,
                      color: 'white',
                      fontWeight: '600'
                    }),
                    multiValueRemove: (base: any) => ({
                      ...base,
                      color: 'white',
                      '&:hover': { background: 'rgba(0,0,0,0.2)', color: 'white' }
                    })
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={submit} 
                disabled={submitting}
                style={{
                  padding: '1rem 2.5rem',
                  background: submitting ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontSize: '1.05rem',
                  fontWeight: '600',
                  boxShadow: submitting ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.3s ease',
                  opacity: submitting ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                  }
                }}
              >
                {submitting ? 'Sending...' : 'Send Announcement'}
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}