'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios-config';
import Spinner from '@/app/components/Spinner';
import styles from './applications.module.css';
import { SystemRole } from '@/lib/roles';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Department {
  _id: string;
  name: string;
  code: string;
}

interface Application {
  _id: string;
  candidateId?: {
    _id: string;
    firstName: string;
    lastName: string;
    personalEmail: string;
    mobilePhone?: string;
  } | null;
  requisitionId?: {
    _id: string;
    requisitionId: string;
    location?: string;
    templateId?: {
      title: string;
      department?: string | any;
    };
  } | null;
  status: string;
  currentStage: string;
  appliedAt?: string;
  createdAt?: string;
  resumeUrl?: string;
  coverLetter?: string;
  isReferral?: boolean;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [rejectionData, setRejectionData] = useState({
    reason: '',
    customMessage: '',
  });

  // Stage management modal
  const [showStageModal, setShowStageModal] = useState(false);
  const [stageApplication, setStageApplication] = useState<Application | null>(null);
  const [newStage, setNewStage] = useState('');

  // Interview scheduling modal
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewApplication, setInterviewApplication] = useState<Application | null>(null);
  const [interviewData, setInterviewData] = useState({
    stage: '',
    method: 'video',
    timeSlots: [''],
    videoLink: '',
    panel: [] as string[],
  });
  const [hrEmployees, setHrEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // View interviews modal
  const [showViewInterviewsModal, setShowViewInterviewsModal] = useState(false);
  const [viewInterviewsApplication, setViewInterviewsApplication] = useState<Application | null>(null);
  const [applicationInterviews, setApplicationInterviews] = useState<any[]>([]);

  // Feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackInterview, setFeedbackInterview] = useState<any>(null);
  const [feedbackData, setFeedbackData] = useState({ score: 0, comments: '' });
  const [existingFeedback, setExistingFeedback] = useState<any[]>([]);

  // Referral modal
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralApplication, setReferralApplication] = useState<Application | null>(null);

  // Create Offer modal
  const [showCreateOfferModal, setShowCreateOfferModal] = useState(false);
  const [offerApplication, setOfferApplication] = useState<Application | null>(null);
  const [offerData, setOfferData] = useState({
    role: '',
    grossSalary: 0,
    signingBonus: 0,
    benefits: [''],
    conditions: '',
    insurances: '',
    content: '',
    deadline: '',
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');

  useEffect(() => {
    fetchDepartments();
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/organization-structure/departments');
      setDepartments(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Failed to fetch departments:', err);
      setDepartments([]);
    }
  };

  const fetchHREmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await axios.get('/employee-profile');
      const allEmployees = response.data;
      
      // Fetch roles for each employee and filter for HR staff
      const hrStaff = [];
      for (const emp of allEmployees) {
        try {
          const rolesRes = await axios.get(`/employee-profile/${emp._id}/roles`);
          const roles = rolesRes.data.roles || [];
          
          // Check if employee has any HR role
          const hasHRRole = roles.some((role: string) => 
            role === SystemRole.HR_MANAGER || role === SystemRole.HR_ADMIN || role === SystemRole.HR_EMPLOYEE
          );
          
          if (hasHRRole) {
            hrStaff.push(emp);
          }
        } catch (err) {
          // If no roles found, skip this employee
          continue;
        }
      }
      
      setHrEmployees(hrStaff);
    } catch (err: any) {
      console.error('Failed to fetch HR employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/recruitment/applications');
      setApplications(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentName = (departmentId?: any): string => {
    if (!departmentId) return 'N/A';
    const deptIdString = String(departmentId);
    const department = departments.find(dept => dept._id === deptIdString);
    return department?.name || 'N/A';
  };

  const getJobTitle = (requisition: any): string => {
    return requisition?.templateId?.title || 'N/A';
  };

  const getDepartmentFromRequisition = (requisition: any): string => {
    const dept = requisition?.templateId?.department;
    if (!dept) return 'N/A';
    
    // If department is already a string (department name), return it
    if (typeof dept === 'string') return dept;
    
    // If it's an ObjectId, look it up in departments array
    return getDepartmentName(dept);
  };

  const handleRejectClick = (application: Application) => {
    setSelectedApplication(application);
    setSelectedApplications([]);
    setShowRejectModal(true);
  };

  const handleBulkRejectClick = () => {
    if (selectedApplications.length === 0) {
      alert('Please select applications to reject');
      return;
    }
    setSelectedApplication(null);
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    setError('');
    setSuccess('');

    try {
      if (selectedApplication) {
        // Single rejection
        const payload = {
          reason: rejectionData.reason,
          customMessage: rejectionData.customMessage,
        };

        await axios.post(`/recruitment/applications/${selectedApplication._id}/reject`, payload);
        setSuccess('Application rejected successfully');
      } else {
        // Bulk rejection
        const payload = {
          applicationIds: selectedApplications,
          rejection: {
            reason: rejectionData.reason,
            customMessage: rejectionData.customMessage,
          },
        };

        await axios.post('/recruitment/applications/bulk-reject', payload);
        setSuccess(`${selectedApplications.length} applications rejected successfully`);
        setSelectedApplications([]);
      }

      setShowRejectModal(false);
      fetchApplications();
      resetRejectionForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject application(s)');
    }
  };

  const resetRejectionForm = () => {
    setRejectionData({
      reason: '',
      customMessage: '',
    });
  };

  const handleMoveToNextStage = (application: Application) => {
    setStageApplication(application);
    // Determine next stage
    const currentStage = application.currentStage;
    let nextStage = '';
    
    switch (currentStage) {
      case 'screening':
        nextStage = 'department_interview';
        break;
      case 'department_interview':
        nextStage = 'hr_interview';
        break;
      case 'hr_interview':
        nextStage = 'offer';
        break;
      default:
        nextStage = currentStage;
    }
    
    setNewStage(nextStage);
    setShowStageModal(true);
  };

  const handleStageUpdate = async () => {
    if (!stageApplication || !newStage) return;
    
    setError('');
    setSuccess('');

    try {
      const payload = {
        currentStage: newStage,
        status: newStage === 'offer' ? 'offer' : 'in_process',
      };

      await axios.patch(`/recruitment/applications/${stageApplication._id}/status`, payload);
      setSuccess(`Application moved to ${newStage.replace('_', ' ')} stage`);
      setShowStageModal(false);
      fetchApplications();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update application stage');
    }
  };

  const getNextStageName = (currentStage: string): string => {
    switch (currentStage) {
      case 'screening':
        return 'Department Interview';
      case 'department_interview':
        return 'HR Interview';
      case 'hr_interview':
        return 'Offer';
      default:
        return 'Next Stage';
    }
  };

  const canMoveToNextStage = (application: Application): boolean => {
    return application.status !== 'REJECTED' && 
           application.status !== 'HIRED' &&
           application.currentStage !== 'offer';
  };

  const handleScheduleInterview = (application: Application) => {
    setInterviewApplication(application);
    setInterviewData({
      stage: application.currentStage,
      method: 'video',
      timeSlots: [''],
      videoLink: '',
      panel: [],
    });
    fetchHREmployees();
    setShowInterviewModal(true);
  };

  const handleViewInterviews = async (application: Application) => {
    setViewInterviewsApplication(application);
    try {
      const response = await axios.get(`/recruitment/applications/${application._id}/interviews-with-feedback`);
      setApplicationInterviews(response.data);
      setShowViewInterviewsModal(true);
    } catch (err: any) {
      setError('Failed to fetch interview slots');
    }
  };

  const handleProvideFeedback = async (interview: any) => {
    setFeedbackInterview(interview);
    setFeedbackData({ score: 0, comments: '' });
    setShowFeedbackModal(true);
    
    // Fetch existing feedback
    try {
      const response = await axios.get(`/recruitment/interviews/${interview._id}/feedback`);
      setExistingFeedback(response.data);
    } catch (err: any) {
      console.error('Failed to fetch feedback:', err);
      setExistingFeedback([]);
    }
  };

  const handleProvideFeedbackForApplication = async (application: Application) => {
    // Fetch interviews for this application
    try {
      const response = await axios.get(`/recruitment/applications/${application._id}/interviews-with-feedback`);
      const interviews = response.data;
      
      // Find a confirmed interview (scheduled or completed)
      const confirmedInterview = interviews.find(
        (int: any) => int.candidateFeedback === 'CONFIRMED' && 
        (int.status === 'scheduled' || int.status === 'completed')
      );
      
      if (!confirmedInterview) {
        setError('No confirmed interview found for this application');
        return;
      }
      
      handleProvideFeedback(confirmedInterview);
    } catch (err: any) {
      setError('Failed to fetch interviews for feedback');
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackInterview) return;
    
    if (feedbackData.score < 0 || feedbackData.score > 100) {
      setError('Score must be between 0 and 100');
      return;
    }

    setError('');
    setSuccess('');

    try {
      await axios.post(`/recruitment/interviews/${feedbackInterview._id}/feedback`, {
        score: feedbackData.score,
        comments: feedbackData.comments,
      });

      setSuccess('Feedback submitted successfully');
      
      // Refresh existing feedback to show the newly submitted feedback
      const response = await axios.get(`/recruitment/interviews/${feedbackInterview._id}/feedback`);
      setExistingFeedback(response.data);
      
      // Reset form but keep modal open to show submitted feedback
      setFeedbackData({ score: 0, comments: '' });
      
      // Refresh interviews list if viewing interviews
      if (viewInterviewsApplication) {
        const interviewsResponse = await axios.get(`/recruitment/applications/${viewInterviewsApplication._id}/interviews-with-feedback`);
        setApplicationInterviews(interviewsResponse.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit feedback');
    }
  };

  const addTimeSlot = () => {
    setInterviewData(prev => ({
      ...prev,
      timeSlots: [...prev.timeSlots, ''],
    }));
  };

  const removeTimeSlot = (index: number) => {
    setInterviewData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.filter((_, i) => i !== index),
    }));
  };

  const updateTimeSlot = (index: number, value: string) => {
    setInterviewData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.map((slot, i) => i === index ? value : slot),
    }));
  };

  const togglePanelMember = (employeeId: string) => {
    setInterviewData(prev => ({
      ...prev,
      panel: prev.panel.includes(employeeId)
        ? prev.panel.filter(id => id !== employeeId)
        : [...prev.panel, employeeId],
    }));
  };

  const handleTagAsReferral = async (application: Application) => {
    setReferralApplication(application);
    setShowReferralModal(true);
  };

  const handleReferralSubmit = async () => {
    if (!referralApplication) return;

    try {
      await axios.post(`/recruitment/applications/${referralApplication._id}/tag-referral`, {});
      setSuccess('Candidate tagged as referral successfully');
      setShowReferralModal(false);
      setReferralApplication(null);
      fetchApplications(); // Refresh to show updated list
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to tag as referral');
    }
  };

  const handleRemoveReferral = async (application: Application) => {
    if (!confirm('Remove referral tag from this candidate?')) return;

    try {
      await axios.delete(`/recruitment/applications/${application._id}/referral-tag`);
      setSuccess('Referral tag removed successfully');
      fetchApplications(); // Refresh to show updated list
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove referral tag');
    }
  };

  const handleCreateOfferClick = (application: Application) => {
    setOfferApplication(application);
    
    // Pre-fill with application data
    const jobTitle = application.requisitionId?.templateId?.title || '';
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 14); // 2 weeks from now
    
    setOfferData({
      role: jobTitle,
      grossSalary: 0,
      signingBonus: 0,
      benefits: ['Health Insurance', 'Dental Insurance', 'Vision Insurance', '401(k) Matching', 'Paid Time Off'],
      conditions: 'Employment is contingent upon successful background check and reference verification.',
      insurances: 'Full medical, dental, and vision coverage',
      content: `We are pleased to offer you the position of ${jobTitle}. Your anticipated start date will be discussed upon acceptance of this offer.`,
      deadline: defaultDeadline.toISOString().split('T')[0],
    });
    
    setShowCreateOfferModal(true);
  };

  const handleCreateOfferSubmit = async () => {
    if (!offerApplication) return;

    setError('');
    setSuccess('');

    // Validation
    if (!offerData.role || !offerData.grossSalary || !offerData.deadline) {
      setError('Please fill in all required fields (Role, Salary, Deadline)');
      return;
    }

    if (offerData.grossSalary <= 0) {
      setError('Salary must be greater than 0');
      return;
    }

    try {
      const payload = {
        applicationId: offerApplication._id,
        candidateId: offerApplication.candidateId?._id,
        role: offerData.role,
        grossSalary: offerData.grossSalary,
        signingBonus: offerData.signingBonus || undefined,
        benefits: offerData.benefits.filter(b => b.trim() !== ''),
        conditions: offerData.conditions || undefined,
        insurances: offerData.insurances || undefined,
        content: offerData.content,
        deadline: new Date(offerData.deadline),
      };

      await axios.post('/recruitment/offers', payload);
      setSuccess('Job offer created successfully!');
      setShowCreateOfferModal(false);
      setOfferApplication(null);
      fetchApplications(); // Refresh
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create offer');
    }
  };

  const addBenefit = () => {
    setOfferData({
      ...offerData,
      benefits: [...offerData.benefits, ''],
    });
  };

  const removeBenefit = (index: number) => {
    setOfferData({
      ...offerData,
      benefits: offerData.benefits.filter((_, i) => i !== index),
    });
  };

  const updateBenefit = (index: number, value: string) => {
    const newBenefits = [...offerData.benefits];
    newBenefits[index] = value;
    setOfferData({
      ...offerData,
      benefits: newBenefits,
    });
  };

  const handleInterviewSubmit = async () => {
    if (!interviewApplication) return;

    setError('');
    setSuccess('');

    // Validate time slots
    const validSlots = interviewData.timeSlots.filter(slot => slot.trim() !== '');
    if (validSlots.length === 0) {
      setError('Please add at least one time slot');
      return;
    }

    try {
      await axios.post(`/recruitment/applications/${interviewApplication._id}/schedule-interview`, {
        stage: interviewData.stage,
        method: interviewData.method,
        timeSlots: validSlots,
        videoLink: interviewData.videoLink || undefined,
        panel: interviewData.panel.length > 0 ? interviewData.panel : undefined,
      });

      setSuccess('Interview invitation sent successfully');
      setShowInterviewModal(false);
      setInterviewData({
        stage: '',
        method: 'video',
        timeSlots: [''],
        videoLink: '',
        panel: [],
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to schedule interview');
    }
  };

  const toggleApplicationSelection = (id: string) => {
    setSelectedApplications(prev =>
      prev.includes(id) ? prev.filter(appId => appId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const filteredApps = getFilteredApplications();
    const allIds = filteredApps.map(app => app._id);
    setSelectedApplications(allIds);
  };

  const deselectAll = () => {
    setSelectedApplications([]);
  };

  const getFilteredApplications = () => {
    return applications.filter(app => {
      const statusMatch = statusFilter === 'all' || app.status === statusFilter;
      const stageMatch = stageFilter === 'all' || app.currentStage === stageFilter;
      return statusMatch && stageMatch;
    });
  };

  const getStatusBadgeClass = (status: string) => {
    const statusClasses: { [key: string]: string } = {
      SUBMITTED: styles.statusSubmitted,
      IN_PROCESS: styles.statusInProcess,
      OFFER: styles.statusOffer,
      HIRED: styles.statusHired,
      REJECTED: styles.statusRejected,
    };
    return statusClasses[status] || styles.statusDefault;
  };

  const filteredApplications = getFilteredApplications();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Application Management</h1>
        <p>Review and manage candidate applications</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.actions}>
        <div className={styles.filters}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="IN_PROCESS">In Process</option>
            <option value="OFFER">Offer</option>
            <option value="HIRED">Hired</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Stages</option>
            <option value="screening">Screening</option>
            <option value="department_interview">Department Interview</option>
            <option value="hr_interview">HR Interview</option>
            <option value="offer">Offer</option>
          </select>
        </div>

        <div className={styles.bulkActions}>
          {selectedApplications.length > 0 && (
            <>
              <span className={styles.selectedCount}>
                {selectedApplications.length} selected
              </span>
              <button onClick={deselectAll} className={styles.deselectButton}>
                Deselect All
              </button>
              <button onClick={handleBulkRejectClick} className={styles.bulkRejectButton}>
                Reject Selected
              </button>
            </>
          )}
          {selectedApplications.length === 0 && filteredApplications.length > 0 && (
            <button onClick={selectAll} className={styles.selectAllButton}>
              Select All
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <Spinner message="Loading applications..." />
      ) : (
        <div className={styles.applicationsTable}>
          {filteredApplications.length === 0 ? (
            <div className={styles.noData}>No applications found</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className={styles.checkboxColumn}>
                    <input
                      type="checkbox"
                      checked={
                        selectedApplications.length === filteredApplications.length &&
                        filteredApplications.length > 0
                      }
                      onChange={() =>
                        selectedApplications.length === filteredApplications.length
                          ? deselectAll()
                          : selectAll()
                      }
                    />
                  </th>
                  <th>Candidate</th>
                  <th>Position</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Stage</th>
                  <th>Applied</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => (
                  <tr key={app._id}>
                    <td className={styles.checkboxColumn}>
                      <input
                        type="checkbox"
                        checked={selectedApplications.includes(app._id)}
                        onChange={() => toggleApplicationSelection(app._id)}
                      />
                    </td>
                    <td>
                      <div className={styles.candidateInfo}>
                        <strong>
                          {app.candidateId ? `${app.candidateId.firstName} ${app.candidateId.lastName}` : 'N/A'}
                          {app.isReferral && <span className={styles.referralBadge}>⭐ Referral</span>}
                        </strong>
                        <small>{app.candidateId?.personalEmail || 'No email'}</small>
                      </div>
                    </td>
                    <td>{getJobTitle(app.requisitionId)}</td>
                    <td>{getDepartmentFromRequisition(app.requisitionId)}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusBadgeClass(app.status)}`}>
                        {app.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={styles.stageBadge}>
                        {app.currentStage.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{new Date(app.appliedAt || app.createdAt || '').toLocaleDateString()}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        {canMoveToNextStage(app) && (
                          <button
                            onClick={() => handleMoveToNextStage(app)}
                            className={styles.nextStageButton}
                            title={`Move to ${getNextStageName(app.currentStage)}`}
                          >
                            → {getNextStageName(app.currentStage)}
                          </button>
                        )}
                        {(app.currentStage === 'department_interview' || app.currentStage === 'hr_interview') && 
                         app.status !== 'REJECTED' && app.status !== 'HIRED' && (
                          <>
                            <button
                              onClick={() => handleScheduleInterview(app)}
                              className={styles.scheduleButton}
                              title="Schedule Interview"
                            >
                              📅 Schedule
                            </button>
                            <button
                              onClick={() => handleViewInterviews(app)}
                              className={styles.viewSlotsButton}
                              title="View Interview Slots"
                            >
                              👁️ View Slots
                            </button>
                            <button
                              onClick={() => handleProvideFeedbackForApplication(app)}
                              className={styles.provideFeedbackButton}
                              title="Provide Interview Feedback & Score"
                            >
                              📝 Feedback
                            </button>
                          </>
                        )}
                        {app.currentStage === 'offer' && app.status === 'PENDING' && (
                          <button
                            onClick={() => handleCreateOfferClick(app)}
                            className={styles.createOfferButton}
                            title="Create job offer for this candidate"
                          >
                            💼 Create Offer
                          </button>
                        )}
                        {app.status !== 'REJECTED' && app.status !== 'HIRED' && (
                          <>
                            <button
                              onClick={() => handleRejectClick(app)}
                              className={styles.rejectButton}
                            >
                              Reject
                            </button>
                            {app.isReferral ? (
                              <button
                                onClick={() => handleRemoveReferral(app)}
                                className={styles.removeReferralButton}
                                title="Remove referral tag"
                              >
                                ⭐ Remove Referral
                              </button>
                            ) : (
                              <button
                                onClick={() => handleTagAsReferral(app)}
                                className={styles.tagReferralButton}
                                title="Tag as referral"
                              >
                                ⭐ Tag Referral
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create Offer Modal */}
      {showCreateOfferModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateOfferModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>
              Create Job Offer
              {offerApplication && offerApplication.candidateId && (
                <span> - {offerApplication.candidateId.firstName} {offerApplication.candidateId.lastName}</span>
              )}
            </h2>

            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label htmlFor="role">Position/Role <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  id="role"
                  value={offerData.role}
                  onChange={(e) => setOfferData({ ...offerData, role: e.target.value })}
                  placeholder="e.g., Senior Software Engineer"
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="grossSalary">Annual Gross Salary ($) <span className={styles.required}>*</span></label>
                  <input
                    type="number"
                    id="grossSalary"
                    value={offerData.grossSalary}
                    onChange={(e) => setOfferData({ ...offerData, grossSalary: parseFloat(e.target.value) })}
                    placeholder="e.g., 120000"
                    min="0"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="signingBonus">Signing Bonus ($)</label>
                  <input
                    type="number"
                    id="signingBonus"
                    value={offerData.signingBonus}
                    onChange={(e) => setOfferData({ ...offerData, signingBonus: parseFloat(e.target.value) })}
                    placeholder="e.g., 10000"
                    min="0"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Benefits</label>
                {offerData.benefits.map((benefit, index) => (
                  <div key={index} className={styles.benefitRow}>
                    <input
                      type="text"
                      value={benefit}
                      onChange={(e) => updateBenefit(index, e.target.value)}
                      placeholder="e.g., Health Insurance"
                    />
                    {offerData.benefits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBenefit(index)}
                        className={styles.removeBenefitButton}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addBenefit} className={styles.addBenefitButton}>
                  + Add Benefit
                </button>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="insurances">Insurance Coverage</label>
                <input
                  type="text"
                  id="insurances"
                  value={offerData.insurances}
                  onChange={(e) => setOfferData({ ...offerData, insurances: e.target.value })}
                  placeholder="e.g., Full medical, dental, and vision coverage"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="conditions">Terms & Conditions</label>
                <textarea
                  id="conditions"
                  value={offerData.conditions}
                  onChange={(e) => setOfferData({ ...offerData, conditions: e.target.value })}
                  rows={3}
                  placeholder="e.g., Employment is contingent upon background check..."
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="content">Offer Letter Content <span className={styles.required}>*</span></label>
                <textarea
                  id="content"
                  value={offerData.content}
                  onChange={(e) => setOfferData({ ...offerData, content: e.target.value })}
                  rows={6}
                  placeholder="Enter the main offer letter content..."
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="deadline">Response Deadline <span className={styles.required}>*</span></label>
                <input
                  type="date"
                  id="deadline"
                  value={offerData.deadline}
                  onChange={(e) => setOfferData({ ...offerData, deadline: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button onClick={handleCreateOfferSubmit} className={styles.submitButton}>
                Create Offer
              </button>
              <button
                onClick={() => {
                  setShowCreateOfferModal(false);
                  setOfferApplication(null);
                }}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>
              {selectedApplication
                ? `Reject Application - ${selectedApplication.candidateId ? `${selectedApplication.candidateId.firstName} ${selectedApplication.candidateId.lastName}` : 'Candidate'}`
                : `Reject ${selectedApplications.length} Application(s)`}
            </h2>

            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label htmlFor="reason">Rejection Reason (Optional)</label>
                <input
                  type="text"
                  id="reason"
                  value={rejectionData.reason}
                  onChange={(e) =>
                    setRejectionData({ ...rejectionData, reason: e.target.value })
                  }
                  placeholder="e.g., Qualifications, Experience, Culture Fit"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="customMessage">Custom Message (Optional)</label>
                <textarea
                  id="customMessage"
                  value={rejectionData.customMessage}
                  onChange={(e) =>
                    setRejectionData({ ...rejectionData, customMessage: e.target.value })
                  }
                  rows={8}
                  placeholder="Enter a personalized rejection message (or leave blank for default message)..."
                />
                <small>
                  If left blank, a default professional rejection message will be sent to the candidate.
                </small>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button onClick={handleRejectSubmit} className={styles.confirmRejectButton}>
                Confirm Rejection
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  resetRejectionForm();
                }}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage Management Modal */}
      {showStageModal && stageApplication && (
        <div className={styles.modalOverlay} onClick={() => setShowStageModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Move Application to Next Stage</h2>
            
            <div className={styles.modalContent}>
              <div className={styles.stageInfo}>
                <p>
                  <strong>Candidate:</strong> {stageApplication.candidateId ? `${stageApplication.candidateId.firstName} ${stageApplication.candidateId.lastName}` : 'N/A'}
                </p>
                <p>
                  <strong>Position:</strong> {getJobTitle(stageApplication.requisitionId)}
                </p>
                <p>
                  <strong>Current Stage:</strong> <span className={styles.currentStage}>{stageApplication.currentStage.replace('_', ' ')}</span>
                </p>
                <p>
                  <strong>Next Stage:</strong> <span className={styles.nextStage}>{newStage.replace('_', ' ')}</span>
                </p>
              </div>

              <div className={styles.stageDescription}>
                <h4>What happens next?</h4>
                <ul>
                  {newStage === 'department_interview' && (
                    <>
                      <li>Application will be forwarded to department for interview</li>
                      <li>Candidate will be notified of the progression</li>
                      <li>Interview scheduling can be initiated</li>
                    </>
                  )}
                  {newStage === 'hr_interview' && (
                    <>
                      <li>Application will move to HR interview stage</li>
                      <li>HR team will conduct final interview</li>
                      <li>Candidate will be notified to schedule HR interview</li>
                    </>
                  )}
                  {newStage === 'offer' && (
                    <>
                      <li>Application will move to offer stage</li>
                      <li>Offer letter can be prepared and sent</li>
                      <li>Candidate will be notified of offer status</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button onClick={handleStageUpdate} className={styles.confirmButton}>
                Confirm Move to {newStage.replace('_', ' ')}
              </button>
              <button
                onClick={() => setShowStageModal(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview Scheduling Modal */}
      {showInterviewModal && interviewApplication && (
        <div className={styles.modalOverlay} onClick={() => setShowInterviewModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Schedule Interview</h2>
            <div className={styles.modalContent}>
              <div className={styles.applicationInfo}>
                <p>
                  <strong>Candidate:</strong>{' '}
                  {interviewApplication.candidateId
                    ? `${interviewApplication.candidateId.firstName} ${interviewApplication.candidateId.lastName}`
                    : 'N/A'}
                </p>
                <p>
                  <strong>Position:</strong> {getJobTitle(interviewApplication.requisitionId)}
                </p>
                <p>
                  <strong>Current Stage:</strong>{' '}
                  {interviewApplication.currentStage.replace(/_/g, ' ')}
                </p>
              </div>

              <div className={styles.formGroup}>
                <label>Interview Method</label>
                <select
                  value={interviewData.method}
                  onChange={(e) =>
                    setInterviewData({ ...interviewData, method: e.target.value })
                  }
                  className={styles.select}
                >
                  <option value="video">Video Call</option>
                  <option value="onsite">On-site</option>
                  <option value="phone">Phone</option>
                </select>
              </div>

              {interviewData.method === 'video' && (
                <div className={styles.formGroup}>
                  <label>Video Link (Optional)</label>
                  <input
                    type="url"
                    value={interviewData.videoLink}
                    onChange={(e) =>
                      setInterviewData({ ...interviewData, videoLink: e.target.value })
                    }
                    placeholder="https://meet.google.com/..."
                    className={styles.input}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Available Time Slots</label>
                <p className={styles.hint}>
                  Add multiple time slots for the candidate to choose from
                </p>
                {interviewData.timeSlots.map((slot, index) => (
                  <div key={index} className={styles.timeSlotRow}>
                    <input
                      type="datetime-local"
                      value={slot}
                      onChange={(e) => updateTimeSlot(index, e.target.value)}
                      className={styles.input}
                    />
                    {interviewData.timeSlots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTimeSlot(index)}
                        className={styles.removeSlotButton}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTimeSlot}
                  className={styles.addSlotButton}
                >
                  + Add Time Slot
                </button>
              </div>

              <div className={styles.formGroup}>
                <label>Interview Panel Members</label>
                <p className={styles.hint}>
                  Select HR employees who will interview the candidate
                </p>
                {loadingEmployees ? (
                  <div className={styles.loadingPanel}>Loading panel members...</div>
                ) : (
                  <div className={styles.panelSelection}>
                    {hrEmployees.length === 0 ? (
                      <p className={styles.noEmployees}>No HR employees found</p>
                    ) : (
                      hrEmployees.map((employee) => (
                        <div key={employee._id} className={styles.panelMember}>
                          <label className={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={interviewData.panel.includes(employee._id)}
                              onChange={() => togglePanelMember(employee._id)}
                            />
                            <div className={styles.employeeInfo}>
                              <span className={styles.employeeName}>
                                {employee.firstName} {employee.lastName}
                              </span>
                              <span className={styles.employeeRole}>
                                {employee.role?.replace(/_/g, ' ') || 'HR Staff'}
                              </span>
                            </div>
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {interviewData.panel.length > 0 && (
                  <div className={styles.selectedPanelCount}>
                    {interviewData.panel.length} panel member{interviewData.panel.length > 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalActions}>
              <button onClick={handleInterviewSubmit} className={styles.confirmButton}>
                Send Interview Invitation
              </button>
              <button
                onClick={() => setShowInterviewModal(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Interviews Modal */}
      {showViewInterviewsModal && viewInterviewsApplication && (
        <div className={styles.modalOverlay} onClick={() => setShowViewInterviewsModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Interview Slots</h2>
            <div className={styles.modalContent}>
              <div className={styles.applicationInfo}>
                <p>
                  <strong>Candidate:</strong>{' '}
                  {viewInterviewsApplication.candidateId
                    ? `${viewInterviewsApplication.candidateId.firstName} ${viewInterviewsApplication.candidateId.lastName}`
                    : 'N/A'}
                </p>
                <p>
                  <strong>Position:</strong> {getJobTitle(viewInterviewsApplication.requisitionId)}
                </p>
              </div>

              {applicationInterviews.length === 0 ? (
                <p className={styles.noInterviews}>No interview slots scheduled yet.</p>
              ) : (
                <div className={styles.interviewsList}>
                  {applicationInterviews.map((interview) => (
                    <div
                      key={interview._id}
                      className={`${styles.interviewItem} ${
                        interview.candidateFeedback === 'CONFIRMED' ? styles.confirmedInterview : ''
                      } ${interview.status === 'cancelled' ? styles.cancelledInterview : ''}`}
                    >
                      <div className={styles.interviewDetails}>
                        <div className={styles.interviewDateTime}>
                          📆 {new Date(interview.scheduledDate).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className={styles.interviewMethod}>
                          Method: {interview.method.charAt(0).toUpperCase() + interview.method.slice(1)}
                        </div>
                        {interview.videoLink && (
                          <div className={styles.interviewLink}>
                            Link: <a href={interview.videoLink} target="_blank" rel="noopener noreferrer">{interview.videoLink}</a>
                          </div>
                        )}
                        <div className={styles.interviewStatus}>
                          Status: {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                        </div>
                        
                        {/* Display Panel Members */}
                        {interview.panel && interview.panel.length > 0 && (
                          <div className={styles.panelInfo}>
                            <strong>Panel Members:</strong>
                            <div className={styles.panelList}>
                              {interview.panel.map((member: any, idx: number) => {
                                const hasFeedback = interview.feedback?.some(
                                  (f: any) => f.interviewerId?._id === member._id
                                );
                                return (
                                  <div key={idx} className={styles.panelMemberItem}>
                                    <span className={styles.memberName}>
                                      {member.firstName} {member.lastName}
                                    </span>
                                    {hasFeedback ? (
                                      <span className={styles.feedbackSubmitted}>✓ Scored</span>
                                    ) : (
                                      <span className={styles.feedbackPending}>⏳ Pending</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Display average score if feedback exists */}
                        {interview.feedback && interview.feedback.length > 0 && (
                          <div className={styles.feedbackScore}>
                            <strong>Average Score:</strong> {interview.averageScore?.toFixed(1) || 'N/A'}/100
                            <span className={styles.feedbackCount}> ({interview.feedback.length} reviewer{interview.feedback.length > 1 ? 's' : ''})</span>
                          </div>
                        )}
                      </div>
                      
                      <div className={styles.interviewActions}>
                        {interview.candidateFeedback === 'CONFIRMED' && (
                          <div className={styles.confirmedBadge}>
                            ✓ Confirmed by Candidate
                          </div>
                        )}
                        {interview.status === 'cancelled' && (
                          <div className={styles.cancelledBadge}>
                            ✕ Cancelled
                          </div>
                        )}
                        {(interview.status === 'scheduled' || interview.status === 'completed') && interview.candidateFeedback === 'CONFIRMED' && (
                          <button
                            onClick={() => handleProvideFeedback(interview)}
                            className={styles.feedbackButton}
                          >
                            📝 Provide Feedback
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => setShowViewInterviewsModal(false)}
                className={styles.cancelButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && feedbackInterview && (
        <div className={styles.modalOverlay} onClick={() => setShowFeedbackModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Provide Interview Feedback</h2>
            <div className={styles.modalContent}>
              <div className={styles.applicationInfo}>
                <p>
                  <strong>Interview Date:</strong>{' '}
                  {new Date(feedbackInterview.scheduledDate).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p>
                  <strong>Method:</strong> {feedbackInterview.method.charAt(0).toUpperCase() + feedbackInterview.method.slice(1)}
                </p>
              </div>

              {/* Existing Feedback Display */}
              {existingFeedback.length > 0 && (
                <div className={styles.existingFeedback}>
                  <h3>Existing Feedback from Panel</h3>
                  {existingFeedback.map((fb: any, index: number) => (
                    <div key={index} className={styles.feedbackItem}>
                      <p>
                        <strong>Reviewer:</strong> {fb.interviewerId?.firstName || 'N/A'} {fb.interviewerId?.lastName || ''}
                      </p>
                      <p>
                        <strong>Score:</strong> <span className={styles.scoreValue}>{fb.score}/100</span>
                      </p>
                      {fb.comments && (
                        <p>
                          <strong>Comments:</strong> {fb.comments}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Feedback Form */}
              <div className={styles.feedbackForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="score">Score (0-100) *</label>
                  <input
                    type="number"
                    id="score"
                    min="0"
                    max="100"
                    value={feedbackData.score || ''}
                    onChange={(e) =>
                      setFeedbackData({ ...feedbackData, score: Number(e.target.value) })
                    }
                    placeholder="Enter score (0-100)"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="comments">Comments (Optional)</label>
                  <textarea
                    id="comments"
                    value={feedbackData.comments}
                    onChange={(e) =>
                      setFeedbackData({ ...feedbackData, comments: e.target.value })
                    }
                    rows={6}
                    placeholder="Provide detailed feedback about the candidate's performance..."
                    className={styles.input}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button onClick={handleFeedbackSubmit} className={styles.confirmButton}>
                Submit Feedback
              </button>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Referral Tag Confirmation Modal */}
      {showReferralModal && referralApplication && (
        <div className={styles.modalOverlay} onClick={() => setShowReferralModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Tag as Referral</h2>
            <div className={styles.modalContent}>
              <p>
                Are you sure you want to tag <strong>
                  {referralApplication.candidateId?.firstName} {referralApplication.candidateId?.lastName}
                </strong> as a referral candidate?
              </p>
              <p className={styles.infoText}>
                ⭐ Referral candidates will be prioritized and appear at the top of the applications list.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button onClick={handleReferralSubmit} className={styles.confirmButton}>
                Confirm Tag as Referral
              </button>
              <button
                onClick={() => setShowReferralModal(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
