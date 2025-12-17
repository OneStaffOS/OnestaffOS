"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from '../../dashboard.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface InsuranceBracket {
  _id: string;
  name: string;
  minSalary: number;
  maxSalary: number;
  employeeRate: number;
  employerRate: number;
  status: 'draft' | 'approved' | 'rejected';
  createdBy?: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string };
  rejectedBy?: { firstName: string; lastName: string };
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
}

export default function InsuranceApprovalsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [brackets, setBrackets] = useState<InsuranceBracket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('draft');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Role-based access checks
  const isHRManager = user?.roles.includes(SystemRole.HR_MANAGER);
  const isSystemAdmin = user?.roles.includes(SystemRole.SYSTEM_ADMIN);

  async function loadBrackets() {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await axios.get('/payroll-configuration/insurance-brackets', { params });
      setBrackets(response.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBrackets();
  }, [statusFilter]);

  async function handleApprove(id: string) {
    if (!confirm('Are you sure you want to approve this insurance bracket?')) return;
    setProcessingId(id);
    setError(null);
    try {
      await axios.post(`/payroll-configuration/insurance-brackets/${id}/approve`);
      setSuccess('Insurance bracket approved successfully');
      await loadBrackets();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Are you sure you want to reject this insurance bracket?')) return;
    setProcessingId(id);
    setError(null);
    try {
      await axios.post(`/payroll-configuration/insurance-brackets/${id}/reject`);
      setSuccess('Insurance bracket rejected');
      await loadBrackets();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || String(e));
    } finally {
      setProcessingId(null);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 }}>✅ Approved</span>;
      case 'rejected':
        return <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 }}>❌ Rejected</span>;
      default:
        return <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 }}>⏳ Pending</span>;
    }
  };

  const pendingCount = brackets.filter(b => b.status === 'draft').length;

  return (
    <ProtectedRoute requiredRoles={[SystemRole.HR_MANAGER, SystemRole.SYSTEM_ADMIN]}>
      <DashboardLayout title="Insurance Bracket Approvals" role="Human Resources">
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          {/* Back Link */}
          <Link 
            href="/dashboard/hr" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: '#64748b', 
              fontSize: '14px', 
              textDecoration: 'none', 
              marginBottom: '20px' 
            }}
          >
            ← Back to HR Dashboard
          </Link>

          {/* Header */}
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>
              🛡️ Insurance Bracket Approvals
            </h1>
            <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>
              Review and approve insurance bracket configurations submitted by Payroll Specialists
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div style={{ 
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', 
              border: '1px solid #fecaca', 
              color: '#991b1b', 
              padding: '14px 18px', 
              borderRadius: '10px', 
              marginBottom: '20px' 
            }}>
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div style={{ 
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', 
              border: '1px solid #bbf7d0', 
              color: '#166534', 
              padding: '14px 18px', 
              borderRadius: '10px', 
              marginBottom: '20px' 
            }}>
              ✅ {success}
            </div>
          )}

          {/* Stats Summary */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px', 
            marginBottom: '24px' 
          }}>
            <div style={{ 
              background: 'white', 
              borderRadius: '12px', 
              padding: '20px', 
              border: '1px solid #e2e8f0',
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#f59e0b' }}>
                {brackets.filter(b => b.status === 'draft').length}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>Pending Approval</div>
            </div>
            <div style={{ 
              background: 'white', 
              borderRadius: '12px', 
              padding: '20px', 
              border: '1px solid #e2e8f0',
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#10b981' }}>
                {brackets.filter(b => b.status === 'approved').length}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>Approved</div>
            </div>
            <div style={{ 
              background: 'white', 
              borderRadius: '12px', 
              padding: '20px', 
              border: '1px solid #e2e8f0',
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#ef4444' }}>
                {brackets.filter(b => b.status === 'rejected').length}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>Rejected</div>
            </div>
          </div>

          {/* Filter */}
          <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Filter:</span>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ 
                padding: '8px 12px', 
                border: '1px solid #e2e8f0', 
                borderRadius: '6px', 
                fontSize: '13px',
                minWidth: '150px' 
              }}
            >
              <option value="draft">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Status</option>
            </select>
          </div>

          {/* Brackets List */}
          {loading ? (
            <Spinner message="Loading insurance brackets..." />
          ) : brackets.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px', 
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
              borderRadius: '12px', 
              border: '2px dashed #e2e8f0' 
            }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🛡️</span>
              <h3 style={{ fontSize: '18px', color: '#334155', margin: '0 0 8px 0' }}>
                No Insurance Brackets Found
              </h3>
              <p style={{ color: '#64748b', margin: 0 }}>
                {statusFilter === 'draft' 
                  ? 'No insurance brackets pending approval at this time.'
                  : 'No insurance brackets match the selected filter.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {brackets.map((bracket) => (
                <div 
                  key={bracket._id}
                  style={{ 
                    background: 'white', 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  {/* Header */}
                  <div style={{ 
                    padding: '16px 20px', 
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                        {bracket.name}
                      </h3>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                        Created by: {bracket.createdBy?.firstName} {bracket.createdBy?.lastName} on {formatDate(bracket.createdAt)}
                      </p>
                    </div>
                    {getStatusBadge(bracket.status)}
                  </div>

                  {/* Body */}
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                      gap: '16px' 
                    }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Salary Range</div>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>
                          {formatCurrency(bracket.minSalary)} - {formatCurrency(bracket.maxSalary)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Employee Rate</div>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>{bracket.employeeRate}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Employer Rate</div>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>{bracket.employerRate}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Total Contribution</div>
                        <div style={{ fontWeight: 500, color: '#3b82f6' }}>
                          {(bracket.employeeRate + bracket.employerRate).toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    {/* Approval Info */}
                    {bracket.status === 'approved' && bracket.approvedBy && (
                      <div style={{ 
                        marginTop: '16px', 
                        padding: '12px', 
                        background: '#f0fdf4', 
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: '#166534'
                      }}>
                        ✅ Approved by {bracket.approvedBy.firstName} {bracket.approvedBy.lastName}
                        {bracket.approvedAt && ` on ${formatDate(bracket.approvedAt)}`}
                      </div>
                    )}
                    {bracket.status === 'rejected' && bracket.rejectedBy && (
                      <div style={{ 
                        marginTop: '16px', 
                        padding: '12px', 
                        background: '#fef2f2', 
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: '#991b1b'
                      }}>
                        ❌ Rejected by {bracket.rejectedBy.firstName} {bracket.rejectedBy.lastName}
                        {bracket.rejectedAt && ` on ${formatDate(bracket.rejectedAt)}`}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {bracket.status === 'draft' && (
                    <div style={{ 
                      padding: '12px 20px', 
                      background: '#f8fafc', 
                      borderTop: '1px solid #e2e8f0',
                      display: 'flex',
                      gap: '12px',
                      justifyContent: 'flex-end'
                    }}>
                      <button
                        onClick={() => handleReject(bracket._id)}
                        disabled={processingId === bracket._id}
                        style={{
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          border: 'none',
                          borderRadius: '6px',
                          color: 'white',
                          fontWeight: 500,
                          fontSize: '13px',
                          cursor: processingId === bracket._id ? 'not-allowed' : 'pointer',
                          opacity: processingId === bracket._id ? 0.6 : 1,
                        }}
                      >
                        {processingId === bracket._id ? 'Processing...' : '❌ Reject'}
                      </button>
                      <button
                        onClick={() => handleApprove(bracket._id)}
                        disabled={processingId === bracket._id}
                        style={{
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          borderRadius: '6px',
                          color: 'white',
                          fontWeight: 500,
                          fontSize: '13px',
                          cursor: processingId === bracket._id ? 'not-allowed' : 'pointer',
                          opacity: processingId === bracket._id ? 0.6 : 1,
                        }}
                      >
                        {processingId === bracket._id ? 'Processing...' : '✅ Approve'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
