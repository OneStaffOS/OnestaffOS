/**
 * Employee Self-Service Profile View Page (Route: /profile)
 * US-E2-04: View full employee profile
 * US-E2-12: View profile picture and biography
 * BR 2a-r: Display all required personal and job data
 * Phase I: Self-Service Access
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { EmployeeProfile, EmployeeStatus } from '@/lib/types/employee-profile.types';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';

// Graduation types for qualifications
enum GraduationType {
  UNDERGRADE = 'UNDERGRADE',
  BACHELOR = 'BACHELOR',
  MASTER = 'MASTER',
  PHD = 'PHD',
  OTHER = 'OTHER',
}

interface Qualification {
  _id: string;
  establishmentName: string;
  graduationType: GraduationType;
}

interface PositionAssignment {
  _id: string;
  employeeProfileId: string;
  positionId: {
    _id: string;
    title: string;
    code: string;
  };
  departmentId: {
    _id: string;
    name: string;
    code: string;
  };
  startDate: string;
  endDate?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<PositionAssignment | null>(null);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Qualification modal state
  const [showQualificationModal, setShowQualificationModal] = useState(false);
  const [qualificationForm, setQualificationForm] = useState({
    establishmentName: '',
    graduationType: GraduationType.BACHELOR,
  });
  const [qualificationLoading, setQualificationLoading] = useState(false);
  const [qualificationError, setQualificationError] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchQualifications();
  }, []);

  useEffect(() => {
    if (profile?._id) {
      fetchCurrentAssignment();
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/employee-profile/my-profile');
      setProfile(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentAssignment = async () => {
    if (!profile?._id) return;
    try {
      const response = await axios.get(`/organization-structure/employees/${profile._id}/current-assignment`);
      setCurrentAssignment(response.data);
    } catch (err: any) {
      console.error('Failed to fetch current assignment:', err);
      // Don't set error, just log it
    }
  };

  const fetchQualifications = async () => {
    try {
      const response = await axios.get('/employee-profile/my-profile/qualifications');
      setQualifications(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch qualifications:', err);
    }
  };

  const handleAddQualification = async () => {
    if (!qualificationForm.establishmentName.trim()) {
      setQualificationError('Establishment name is required');
      return;
    }
    
    try {
      setQualificationLoading(true);
      setQualificationError('');
      await axios.post('/employee-profile/my-profile/qualifications', qualificationForm);
      await fetchQualifications();
      setShowQualificationModal(false);
      setQualificationForm({
        establishmentName: '',
        graduationType: GraduationType.BACHELOR,
      });
    } catch (err: any) {
      setQualificationError(err.response?.data?.message || 'Failed to add qualification');
    } finally {
      setQualificationLoading(false);
    }
  };

  const handleDeleteQualification = async (qualificationId: string) => {
    if (!confirm('Are you sure you want to delete this qualification?')) return;
    
    try {
      await axios.delete(`/employee-profile/my-profile/qualifications/${qualificationId}`);
      await fetchQualifications();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete qualification');
    }
  };

  const getGraduationTypeLabel = (type: GraduationType) => {
    const labels: Record<GraduationType, string> = {
      [GraduationType.UNDERGRADE]: 'Undergraduate',
      [GraduationType.BACHELOR]: "Bachelor's Degree",
      [GraduationType.MASTER]: "Master's Degree",
      [GraduationType.PHD]: 'PhD / Doctorate',
      [GraduationType.OTHER]: 'Other',
    };
    return labels[type] || type;
  };

  const handleUploadPhoto = () => {
    router.push('/profile/edit?section=photo');
  };

  const handleEditSection = (section: string) => {
    router.push(`/profile/edit?section=${section}`);
  };

  const handleRequestChange = () => {
    router.push('/profile/request-change');
  };

  const getStatusClass = (status: EmployeeStatus) => {
    switch (status) {
      case EmployeeStatus.ACTIVE:
        return 'statusActive';
      case EmployeeStatus.ON_LEAVE:
        return 'statusOnLeave';
      default:
        return 'statusSuspended';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Spinner fullScreen message="Loading profile..." />
      </ProtectedRoute>
    );
  }

  if (error || !profile) {
    return (
      <ProtectedRoute>
        <div style={{ 
          maxWidth: '1400px', 
          margin: '2rem auto', 
          padding: '0 1rem' 
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
            border: '2px solid #ef4444',
            color: '#dc2626',
            padding: '2rem',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
          }}>
            {error || 'Profile not found'}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const containerStyle = {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem 1rem',
  };

  const headerStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '2rem',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  };

  const cardStyle = {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '1.5rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  };

  const buttonStyle = {
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    border: 'none',
    fontWeight: '600' as const,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontSize: '0.95rem',
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    backdropFilter: 'blur(10px)',
  };

  const editButtonStyle = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    fontSize: '0.875rem',
    padding: '0.5rem 1rem',
  };

  return (
    <ProtectedRoute>
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', margin: '0 0 0.5rem' }}>
              👤 My Profile
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>
              View and manage your personal information
            </p>
          </div>
          <button 
            style={primaryButtonStyle}
            onClick={handleRequestChange}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            Request Change
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '350px 1fr',
            gap: '2rem',
          }}
          className="profile-grid"
        >
          {/* Profile Sidebar */}
          <div>
            <div style={{
              ...cardStyle,
              textAlign: 'center' as const,
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderLeft: '4px solid #3b82f6',
            }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.5rem' }}>
                <img 
                  src={profile.profilePictureUrl || profile.profilePicture || '/default-avatar.png'} 
                  alt="Profile"
                  style={{
                    width: '180px',
                    height: '180px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '6px solid white',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  }}
                />
                <button 
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '45px',
                    height: '45px',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
                    transition: 'transform 0.3s ease',
                  }}
                  onClick={handleUploadPhoto}
                  title="Update photo"
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  📷
                </button>
              </div>
              <h2 style={{ 
                fontSize: '1.75rem', 
                fontWeight: '700', 
                color: '#111827',
                margin: '0 0 0.5rem' 
              }}>
                {profile.firstName} {profile.lastName}
              </h2>
              <p style={{ 
                fontSize: '1.1rem', 
                color: '#3b82f6',
                fontWeight: '600',
                margin: '0 0 0.25rem' 
              }}>
                {currentAssignment?.positionId?.title || profile.primaryPositionId?.title || 'N/A'}
              </p>
              <p style={{ 
                fontSize: '0.95rem', 
                color: '#6b7280',
                margin: '0 0 1rem' 
              }}>
                ID: {profile.employeeNumber}
              </p>
              <div style={{
                display: 'inline-block',
                padding: '0.5rem 1.5rem',
                borderRadius: '50px',
                fontSize: '0.875rem',
                fontWeight: '600',
                background: profile.status === EmployeeStatus.ACTIVE 
                  ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' 
                  : profile.status === EmployeeStatus.ON_LEAVE
                  ? 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)'
                  : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                color: profile.status === EmployeeStatus.ACTIVE 
                  ? '#065f46' 
                  : profile.status === EmployeeStatus.ON_LEAVE
                  ? '#92400e'
                  : '#991b1b',
              }}>
                {profile.status.replace('_', ' ')}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div>
            {/* Personal Information */}
            <div style={cardStyle}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid #e5e7eb',
              }}>
                <h3 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700', 
                  color: '#111827',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <span>👤</span> Personal Information
                </h3>
                <button 
                  style={editButtonStyle}
                  onClick={() => handleRequestChange()}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  Request Change →
                </button>
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '1.5rem' 
              }}>
                <InfoItem label="Full Name" value={`${profile.firstName} ${profile.middleName || ''} ${profile.lastName}`} />
                <InfoItem label="Date of Birth" value={formatDate(profile.dateOfBirth)} />
                <InfoItem label="Gender" value={profile.gender} />
                <InfoItem label="Marital Status" value={profile.maritalStatus?.replace('_', ' ') || 'N/A'} />
                <InfoItem label="National ID" value={profile.nationalId} />
                <InfoItem label="Nationality" value={profile.nationality || 'N/A'} />
              </div>
            </div>

            {/* Contact Information */}
            <div style={cardStyle}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid #e5e7eb',
              }}>
                <h3 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700', 
                  color: '#111827',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <span>📧</span> Contact Information
                </h3>
                <button 
                  style={editButtonStyle}
                  onClick={() => handleEditSection('contact')}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  Edit →
                </button>
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '1.5rem' 
              }}>
                <InfoItem label="Work Email" value={profile.workEmail || 'N/A'} />
                <InfoItem label="Google Account" value={profile.googleAccountEmail || 'N/A'} />
                <InfoItem label="Personal Email" value={profile.personalEmail || 'N/A'} />
                <InfoItem label="Mobile Phone" value={profile.mobilePhone || 'N/A'} />
                {profile.address && (
                  <InfoItem 
                    label="Address" 
                    value={[
                      profile.address.street,
                      profile.address.city,
                      profile.address.country
                    ].filter(Boolean).join(', ') || 'N/A'} 
                  />
                )}
              </div>
            </div>

            {/* Employment Information */}
            <div style={cardStyle}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid #e5e7eb',
              }}>
                <h3 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700', 
                  color: '#111827',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <span>💼</span> Employment Information
                </h3>
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '1.5rem' 
              }}>
                <InfoItem 
                  label="Position" 
                  value={currentAssignment?.positionId?.title || profile.primaryPositionId?.title || 'N/A'} 
                />
                <InfoItem 
                  label="Department" 
                  value={currentAssignment?.departmentId?.name || profile.primaryDepartmentId?.name || 'N/A'} 
                />
                <InfoItem label="Date of Hire" value={formatDate(profile.dateOfHire)} />
                <InfoItem label="Contract Type" value={profile.contractType?.replace('_', ' ') || 'N/A'} />
                <InfoItem 
                  label="Pay Grade" 
                  value={(profile as any).payGradeId?.grade || profile.payGrade || 'N/A'} 
                />
                {(profile as any).supervisorPositionId && (
                  <InfoItem 
                    label="Supervisor Position" 
                    value={(profile as any).supervisorPositionId?.title || 'N/A'} 
                  />
                )}
              </div>
            </div>

            {/* Bank Information */}
            {((profile as any).bankName || (profile as any).bankAccountNumber) && (
              <div style={cardStyle}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                  paddingBottom: '1rem',
                  borderBottom: '2px solid #e5e7eb',
                }}>
                  <h3 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '700', 
                    color: '#111827',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <span>🏦</span> Bank Information
                  </h3>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '1.5rem' 
                }}>
                  {(profile as any).bankName && (
                    <InfoItem label="Bank Name" value={(profile as any).bankName} />
                  )}
                  {(profile as any).bankAccountNumber && (
                    <InfoItem label="Account Number" value={(profile as any).bankAccountNumber} />
                  )}
                </div>
              </div>
            )}

            {/* Biography */}
            {profile.biography && (
              <div style={cardStyle}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                  paddingBottom: '1rem',
                  borderBottom: '2px solid #e5e7eb',
                }}>
                  <h3 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '700', 
                    color: '#111827',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <span>📝</span> Biography
                  </h3>
                  <button 
                    style={editButtonStyle}
                    onClick={() => handleEditSection('biography')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    Edit →
                  </button>
                </div>
                <p style={{ 
                  color: '#4b5563', 
                  lineHeight: '1.7', 
                  fontSize: '1rem',
                  margin: 0 
                }}>
                  {profile.biography}
                </p>
              </div>
            )}

            {/* Emergency Contact */}
            {profile.emergencyContact && (
              <div style={cardStyle}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                  paddingBottom: '1rem',
                  borderBottom: '2px solid #e5e7eb',
                }}>
                  <h3 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '700', 
                    color: '#111827',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <span>🚨</span> Emergency Contact
                  </h3>
                  <button 
                    style={editButtonStyle}
                    onClick={() => handleEditSection('emergency')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    Edit →
                  </button>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '1.5rem' 
                }}>
                  <InfoItem label="Name" value={profile.emergencyContact.name} />
                  <InfoItem label="Relationship" value={profile.emergencyContact.relationship} />
                  <InfoItem label="Phone" value={profile.emergencyContact.phone} />
                  {profile.emergencyContact.email && (
                    <InfoItem label="Email" value={profile.emergencyContact.email} />
                  )}
                </div>
              </div>
            )}

            {/* Education */}
            {profile.education && profile.education.length > 0 && (
              <div style={cardStyle}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                  paddingBottom: '1rem',
                  borderBottom: '2px solid #e5e7eb',
                }}>
                  <h3 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '700', 
                    color: '#111827',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <span>🎓</span> Education
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '1.25rem' }}>
                  {profile.education.map((edu, index) => (
                    <div 
                      key={index} 
                      style={{
                        padding: '1.25rem',
                        background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                        borderRadius: '12px',
                        borderLeft: '4px solid #3b82f6',
                      }}
                    >
                      <div style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: '700', 
                        color: '#111827',
                        marginBottom: '0.5rem' 
                      }}>
                        {edu.degree}
                      </div>
                      <div style={{ 
                        fontSize: '1rem', 
                        color: '#3b82f6',
                        fontWeight: '600',
                        marginBottom: '0.5rem' 
                      }}>
                        {edu.institution}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                        {edu.fieldOfStudy} • Graduated {edu.graduationYear}
                        {edu.gpa && ` • GPA: ${edu.gpa}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Qualifications */}
            <div style={cardStyle}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid #e5e7eb',
              }}>
                <h3 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700', 
                  color: '#111827',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <span>📜</span> Qualifications
                </h3>
                <button 
                  style={editButtonStyle}
                  onClick={() => setShowQualificationModal(true)}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  + Add Qualification
                </button>
              </div>
              {qualifications.length === 0 ? (
                <div style={{ 
                  textAlign: 'center' as const, 
                  padding: '2rem', 
                  color: '#6b7280',
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '12px',
                }}>
                  <p style={{ margin: 0, fontSize: '1rem' }}>
                    No qualifications added yet. Click &quot;+ Add Qualification&quot; to add your certifications and degrees.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '1.25rem' }}>
                  {qualifications.map((qual) => (
                    <div 
                      key={qual._id} 
                      style={{
                        padding: '1.25rem',
                        background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                        borderRadius: '12px',
                        borderLeft: '4px solid #eab308',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ 
                          fontSize: '1.1rem', 
                          fontWeight: '700', 
                          color: '#111827',
                          marginBottom: '0.5rem' 
                        }}>
                          {qual.establishmentName}
                        </div>
                        <div style={{ 
                          fontSize: '0.9rem', 
                          color: '#ca8a04',
                          fontWeight: '600',
                        }}>
                          {getGraduationTypeLabel(qual.graduationType)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteQualification(qual._id)}
                        style={{
                          background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Performance History */}
            {profile.appraisals && profile.appraisals.length > 0 && (
              <div style={cardStyle}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                  paddingBottom: '1rem',
                  borderBottom: '2px solid #e5e7eb',
                }}>
                  <h3 style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '700', 
                    color: '#111827',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <span>⭐</span> Performance History
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '1.25rem' }}>
                  {profile.appraisals.map((appraisal) => (
                    <div 
                      key={appraisal._id} 
                      style={{
                        padding: '1.25rem',
                        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                        borderRadius: '12px',
                        borderLeft: '4px solid #10b981',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '1.1rem', 
                          fontWeight: '700', 
                          color: '#111827',
                          marginBottom: '0.5rem' 
                        }}>
                          {appraisal.type}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                          {formatDate(appraisal.date)} • Reviewed by {appraisal.reviewer}
                        </div>
                        {appraisal.comments && (
                          <div style={{ marginTop: '0.75rem', color: '#4b5563', lineHeight: '1.6' }}>
                            {appraisal.comments}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontSize: '2rem',
                        fontWeight: '700',
                        color: '#10b981',
                        marginLeft: '1rem',
                      }}>
                        {appraisal.score}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Qualification Modal */}
      {showQualificationModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          }}>
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              color: '#111827',
              margin: '0 0 1.5rem',
            }}>
              📜 Add Qualification
            </h3>
            
            {qualificationError && (
              <div style={{
                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                border: '2px solid #ef4444',
                color: '#dc2626',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
              }}>
                {qualificationError}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem',
              }}>
                Establishment Name *
              </label>
              <input
                type="text"
                value={qualificationForm.establishmentName}
                onChange={(e) => setQualificationForm({ ...qualificationForm, establishmentName: e.target.value })}
                placeholder="e.g., Harvard University, AWS, Google"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  transition: 'border-color 0.3s ease',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem',
              }}>
                Graduation Type *
              </label>
              <select
                value={qualificationForm.graduationType}
                onChange={(e) => setQualificationForm({ ...qualificationForm, graduationType: e.target.value as GraduationType })}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  transition: 'border-color 0.3s ease',
                  outline: 'none',
                  background: 'white',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              >
                <option value={GraduationType.UNDERGRADE}>Undergraduate</option>
                <option value={GraduationType.BACHELOR}>Bachelor&apos;s Degree</option>
                <option value={GraduationType.MASTER}>Master&apos;s Degree</option>
                <option value={GraduationType.PHD}>PhD / Doctorate</option>
                <option value={GraduationType.OTHER}>Other</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowQualificationModal(false);
                  setQualificationForm({ establishmentName: '', graduationType: GraduationType.BACHELOR });
                  setQualificationError('');
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  background: 'white',
                  color: '#374151',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                Cancel
              </button>
              <button
                onClick={handleAddQualification}
                disabled={qualificationLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: qualificationLoading 
                    ? '#9ca3af' 
                    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  fontWeight: '600',
                  cursor: qualificationLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  if (!qualificationLoading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {qualificationLoading ? 'Adding...' : 'Add Qualification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

// Helper component for info items
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ 
        fontSize: '0.875rem', 
        fontWeight: '600', 
        color: '#6b7280',
        marginBottom: '0.5rem',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
      }}>
        {label}
      </div>
      <div style={{ 
        fontSize: '1rem', 
        color: '#111827',
        fontWeight: '500',
      }}>
        {value}
      </div>
    </div>
  );
}
