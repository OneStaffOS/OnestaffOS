/**
 * Leave Calendar & Blocked Days Management Page
 * REQ-010: Configure calendar & blocked days
 * Accessible by: HR Admin, System Admin
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import DashboardLayout from '@/app/components/DashboardLayout';
import Spinner from '@/app/components/Spinner';
import { SystemRole as Role } from '@/lib/roles';
import axios from '@/lib/axios-config';
import styles from './calendar.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface BlockedPeriod {
  from: string;
  to: string;
  reason: string;
}

interface Holiday {
  _id?: string;
  name: string;
  date: string;
  type?: string;
}

interface HolidayFromAPI {
  _id: string;
  name?: string;
  startDate: string;
  endDate?: string;
  type: string;
  active: boolean;
}

interface Calendar {
  _id: string;
  year: number;
  holidays: (string | HolidayFromAPI)[];
  blockedPeriods: BlockedPeriod[];
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  year: string;
  holidays: Holiday[];
  blockedPeriods: BlockedPeriod[];
}

const initialFormData: FormData = {
  year: new Date().getFullYear().toString(),
  holidays: [],
  blockedPeriods: [],
};

export default function LeaveCalendarPage() {
  const router = useRouter();
  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [newBlockedPeriod, setNewBlockedPeriod] = useState<BlockedPeriod>({ from: '', to: '', reason: '' });
  const [newHoliday, setNewHoliday] = useState<Holiday>({ name: '', date: '' });

  const fetchCalendar = useCallback(async (year: number) => {
    try {
      setLoading(true);
      const response = await axios.get(`/leaves/calendars/${year}`);
      setCalendar(response.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setCalendar(null);
      } else {
        console.error('Failed to fetch calendar:', err);
        setError(err.response?.data?.message || 'Failed to load calendar');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar(selectedYear);
  }, [fetchCalendar, selectedYear]);

  const handleOpenModal = () => {
    if (calendar) {
      // Parse existing holidays - they may be populated objects or IDs
      const parsedHolidays: Holiday[] = calendar.holidays.map(h => {
        if (typeof h === 'object' && h !== null) {
          // It's a populated holiday object
          return { 
            _id: h._id, 
            name: h.name || 'Holiday', 
            date: h.startDate ? h.startDate.split('T')[0] : '',
            type: h.type
          };
        }
        // It's just an ID string - we'll need to fetch details separately
        return { _id: h as string, name: 'Holiday', date: '' };
      });
      setFormData({
        year: calendar.year.toString(),
        holidays: parsedHolidays,
        blockedPeriods: calendar.blockedPeriods,
      });
    } else {
      setFormData({
        ...initialFormData,
        year: selectedYear.toString(),
      });
    }
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(initialFormData);
    setError('');
  };

  const handleAddBlockedPeriod = () => {
    if (!newBlockedPeriod.from || !newBlockedPeriod.to || !newBlockedPeriod.reason) {
      setError('All fields are required for blocked period');
      return;
    }
    setFormData({
      ...formData,
      blockedPeriods: [...formData.blockedPeriods, newBlockedPeriod],
    });
    setNewBlockedPeriod({ from: '', to: '', reason: '' });
    setShowBlockedModal(false);
    setError('');
  };

  const handleRemoveBlockedPeriod = (index: number) => {
    setFormData({
      ...formData,
      blockedPeriods: formData.blockedPeriods.filter((_, i) => i !== index),
    });
  };

  const handleAddHoliday = () => {
    if (!newHoliday.name || !newHoliday.date) {
      setError('Holiday name and date are required');
      return;
    }
    setFormData({
      ...formData,
      holidays: [...formData.holidays, newHoliday],
    });
    setNewHoliday({ name: '', date: '' });
    setShowHolidayModal(false);
    setError('');
  };

  const handleRemoveHoliday = (index: number) => {
    setFormData({
      ...formData,
      holidays: formData.holidays.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.year) {
      setError('Year is required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // First, create new holidays that don't have an _id
      const holidayIds: string[] = [];
      
      for (const holiday of formData.holidays) {
        if (holiday._id) {
          // Existing holiday, just use the ID
          holidayIds.push(holiday._id);
        } else {
          // New holiday, create it first via time-management API
          const holidayResponse = await axios.post('/time-management/holidays', {
            type: 'NATIONAL', // Default type
            name: holiday.name,
            startDate: new Date(holiday.date),
            active: true,
          });
          holidayIds.push(holidayResponse.data._id);
        }
      }

      const payload = {
        year: parseInt(formData.year),
        holidays: holidayIds,
        blockedPeriods: formData.blockedPeriods.map(bp => ({
          from: bp.from,
          to: bp.to,
          reason: bp.reason,
        })),
      };

      await axios.post('/leaves/calendars', payload);
      setSuccess('Calendar saved successfully!');

      handleCloseModal();
      setSelectedYear(parseInt(formData.year));
      fetchCalendar(parseInt(formData.year));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to save calendar:', err);
      setError(err.response?.data?.message || 'Failed to save calendar');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 1; y <= currentYear + 2; y++) {
    yearOptions.push(y);
  }

  return (
    <ProtectedRoute requiredRoles={[Role.HR_ADMIN, Role.SYSTEM_ADMIN]}>
      <DashboardLayout title="Leave Calendar" role="HR Admin">
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}> Leave Calendar</h1>
              <p className={styles.subtitle}>
                Configure public holidays and blocked leave periods
              </p>
            </div>
            <div className={styles.headerActions}>
              <button 
                className={styles.backButton}
                onClick={() => router.push('/dashboard/hr/leaves')}
              >
                ← Back
              </button>
              <button 
                className={styles.addButton}
                onClick={handleOpenModal}
              >
                {calendar ? 'Edit Calendar' : '+ Create Calendar'}
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>{success}</div>}

          {/* Year Selector */}
          <div className={styles.yearSelector}>
            <label>Select Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className={styles.yearSelect}
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Calendar Content */}
          <div className={styles.content}>
            {loading ? (
              <Spinner message="Loading calendar..." />
            ) : !calendar ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}></span>
                <h3>No Calendar for {selectedYear}</h3>
                <p>Create a calendar to configure holidays and blocked periods.</p>
                <button 
                  className={styles.addButton}
                  onClick={handleOpenModal}
                >
                  + Create Calendar for {selectedYear}
                </button>
              </div>
            ) : (
              <div className={styles.calendarGrid}>
                {/* Holidays Section */}
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h2> Public Holidays</h2>
                    <span className={styles.badge}>{calendar.holidays.length} days</span>
                  </div>
                  {calendar.holidays.length === 0 ? (
                    <p className={styles.noData}>No holidays configured</p>
                  ) : (
                    <ul className={styles.holidayList}>
                      {calendar.holidays.map((holiday, index) => {
                        const holidayName = typeof holiday === 'object' 
                          ? (holiday.name || 'Holiday') 
                          : 'Holiday';
                        const holidayDate = typeof holiday === 'object' && holiday.startDate
                          ? formatDate(holiday.startDate)
                          : '';
                        return (
                          <li key={index} className={styles.holidayItem}>
                            <span className={styles.holidayIcon}></span>
                            <span>{holidayName}{holidayDate ? ` - ${holidayDate}` : ''}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Blocked Periods Section */}
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h2> Blocked Periods</h2>
                    <span className={styles.badge}>{calendar.blockedPeriods.length} periods</span>
                  </div>
                  {calendar.blockedPeriods.length === 0 ? (
                    <p className={styles.noData}>No blocked periods configured</p>
                  ) : (
                    <div className={styles.blockedList}>
                      {calendar.blockedPeriods.map((period, index) => (
                        <div key={index} className={styles.blockedItem}>
                          <div className={styles.blockedDates}>
                            <span className={styles.blockedIcon}></span>
                            <span>{formatDate(period.from)}</span>
                            <span className={styles.arrow}>→</span>
                            <span>{formatDate(period.to)}</span>
                          </div>
                          <p className={styles.blockedReason}>{period.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Main Modal */}
          {showModal && (
            <div className={styles.modalOverlay} onClick={handleCloseModal}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2>{calendar ? 'Edit Calendar' : 'Create Calendar'}</h2>
                  <button className={styles.closeButton} onClick={handleCloseModal}>
                    
                  </button>
                </div>
                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.formGroup}>
                    <label htmlFor="year">Year *</label>
                    <select
                      id="year" value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      required
                    >
                      {yearOptions.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formSection}>
                    <div className={styles.sectionTitle}>
                      <h3>Public Holidays</h3>
                      <button
                        type="button" className={styles.addPeriodButton}
                        onClick={() => setShowHolidayModal(true)}
                      >
                        + Add Holiday
                      </button>
                    </div>
                    {formData.holidays.length === 0 ? (
                      <p className={styles.noData}>No holidays added</p>
                    ) : (
                      <div className={styles.periodsPreview}>
                        {formData.holidays.map((holiday, index) => (
                          <div key={index} className={styles.periodPreviewItem}>
                            <div className={styles.periodInfo}>
                              <span className={styles.periodDates}> {holiday.name}</span>
                              <span className={styles.periodReason}>{holiday.date}</span>
                            </div>
                            <button
                              type="button" className={styles.removePeriodButton}
                              onClick={() => handleRemoveHoliday(index)}
                            >
                              
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.formSection}>
                    <div className={styles.sectionTitle}>
                      <h3>Blocked Periods</h3>
                      <button
                        type="button" className={styles.addPeriodButton}
                        onClick={() => setShowBlockedModal(true)}
                      >
                        + Add Period
                      </button>
                    </div>
                    {formData.blockedPeriods.length === 0 ? (
                      <p className={styles.noData}>No blocked periods added</p>
                    ) : (
                      <div className={styles.periodsPreview}>
                        {formData.blockedPeriods.map((period, index) => (
                          <div key={index} className={styles.periodPreviewItem}>
                            <div className={styles.periodInfo}>
                              <span className={styles.periodDates}>
                                {period.from} → {period.to}
                              </span>
                              <span className={styles.periodReason}>{period.reason}</span>
                            </div>
                            <button
                              type="button" className={styles.removePeriodButton}
                              onClick={() => handleRemoveBlockedPeriod(index)}
                            >
                              
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {error && <div className={styles.formError}>{error}</div>}
                  
                  <div className={styles.modalActions}>
                    <button
                      type="button" className={styles.cancelButton}
                      onClick={handleCloseModal}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit" className={styles.submitButton}
                      disabled={submitting}
                    >
                      {submitting ? 'Saving...' : 'Save Calendar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add Blocked Period Modal */}
          {showBlockedModal && (
            <div className={styles.modalOverlay} onClick={() => setShowBlockedModal(false)}>
              <div className={styles.smallModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2>Add Blocked Period</h2>
                  <button className={styles.closeButton} onClick={() => setShowBlockedModal(false)}>
                    
                  </button>
                </div>
                <div className={styles.form}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="periodFrom">From Date *</label>
                      <input
                        type="date" id="periodFrom" value={newBlockedPeriod.from}
                        onChange={(e) => setNewBlockedPeriod({ ...newBlockedPeriod, from: e.target.value })}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="periodTo">To Date *</label>
                      <input
                        type="date" id="periodTo" value={newBlockedPeriod.to}
                        onChange={(e) => setNewBlockedPeriod({ ...newBlockedPeriod, to: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="periodReason">Reason *</label>
                    <input
                      type="text" id="periodReason" value={newBlockedPeriod.reason}
                      onChange={(e) => setNewBlockedPeriod({ ...newBlockedPeriod, reason: e.target.value })}
                      placeholder="e.g., Year-end inventory, Company event" required
                    />
                  </div>
                  <div className={styles.modalActions}>
                    <button
                      type="button" className={styles.cancelButton}
                      onClick={() => setShowBlockedModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button" className={styles.submitButton}
                      onClick={handleAddBlockedPeriod}
                    >
                      Add Period
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Holiday Modal */}
          {showHolidayModal && (
            <div className={styles.modalOverlay} onClick={() => setShowHolidayModal(false)}>
              <div className={styles.smallModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2>Add Holiday</h2>
                  <button className={styles.closeButton} onClick={() => setShowHolidayModal(false)}>
                    
                  </button>
                </div>
                <div className={styles.form}>
                  <div className={styles.formGroup}>
                    <label htmlFor="holidayName">Holiday Name *</label>
                    <input
                      type="text" id="holidayName" value={newHoliday.name}
                      onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                      placeholder="e.g., New Year's Day, Christmas" required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="holidayDate">Date *</label>
                    <input
                      type="date" id="holidayDate" value={newHoliday.date}
                      onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.modalActions}>
                    <button
                      type="button" className={styles.cancelButton}
                      onClick={() => setShowHolidayModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button" className={styles.submitButton}
                      onClick={handleAddHoliday}
                    >
                      Add Holiday
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}