/**
 * HR Clearance Management Page
 * Manage multi-department clearance for approved terminations
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from '@/lib/axios-config';
import Spinner from '@/app/components/Spinner';
import styles from './clearance.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface ClearanceItem {
  department: string;
  cleared: boolean;
  clearedBy?: string;
  clearedDate?: string;
  comments?: string;
}

interface Termination {
  _id: string;
  employeeId: {
    firstName: string;
    lastName: string;
    workEmail?: string;
    personalEmail?: string;
    primaryDepartmentId?: { name: string };
    primaryPositionId?: { title: string };
  };
  status: string;
  terminationDate?: string;
  clearanceStatus?: string;
}

interface ClearanceChecklist {
  _id?: string;
  terminationId: string;
  clearanceItems: ClearanceItem[];
  equipmentReturned: {
    laptop: boolean;
    phone: boolean;
    accessories: boolean;
    keys: boolean;
    other: boolean;
  };
  cardReturned: boolean;
  finalSettlementPaid: boolean;
  comments?: string;
  completedDate?: string;
}

export default function ClearancePage() {
  const router = useRouter();
  const params = useParams();
  const terminationId = params.id as string;

  const [termination, setTermination] = useState<Termination | null>(null);
  const [checklist, setChecklist] = useState<ClearanceChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const departments = [
    'HR Department',
    'IT Department',
    'Finance Department',
    'Admin Department',
    'Direct Manager/Supervisor'
  ];

  useEffect(() => {
    fetchData();
  }, [terminationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch termination details
      const termRes = await axios.get(`/recruitment/termination/${terminationId}`);
      setTermination(termRes.data);

      // Fetch or initialize checklist
      try {
        const checklistRes = await axios.get(`/recruitment/termination/${terminationId}/clearance`);
        const data = checklistRes.data;
        
        // Ensure clearanceItems is initialized
        if (!data.clearanceItems || data.clearanceItems.length === 0) {
          data.clearanceItems = departments.map(dept => ({
            department: dept,
            cleared: false
          }));
        }
        
        // Ensure equipmentReturned is initialized
        if (!data.equipmentReturned) {
          data.equipmentReturned = {
            laptop: false,
            phone: false,
            accessories: false,
            keys: false,
            other: false
          };
        }
        
        setChecklist(data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          // Initialize new checklist
          setChecklist({
            terminationId,
            clearanceItems: departments.map(dept => ({
              department: dept,
              cleared: false
            })),
            equipmentReturned: {
              laptop: false,
              phone: false,
              accessories: false,
              keys: false,
              other: false
            },
            cardReturned: false,
            finalSettlementPaid: false
          });
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load clearance data');
    } finally {
      setLoading(false);
    }
  };

  const handleClearanceSave = async () => {
    if (!checklist) return;

    try {
      setSaving(true);
      setError('');

      let response;
      if (checklist._id) {
        response = await axios.put(`/recruitment/termination/${terminationId}/clearance`, checklist);
      } else {
        response = await axios.post(`/recruitment/termination/${terminationId}/clearance`, checklist);
        setChecklist(response.data);
      }

      // If all clearance requirements are completed, finalize and assign benefits
      if (allCleared) {
        try {
          const benefitsResponse = await axios.post(
            `/recruitment/termination/${terminationId}/finalize-clearance`
          );
          
          setSuccess(
            `Clearance finalized! ${benefitsResponse.data.benefitsAssigned} benefit(s) assigned (Total: ${benefitsResponse.data.totalAmount})`
          );
        } catch (benefitErr: any) {
          setError(benefitErr.response?.data?.message || 'Clearance saved but failed to assign benefits');
        }
      } else {
        setSuccess('Clearance checklist saved successfully!');
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save clearance checklist');
    } finally {
      setSaving(false);
    }
  };

  const toggleClearance = (index: number) => {
    if (!checklist) return;

    const updatedItems = [...checklist.clearanceItems];
    updatedItems[index] = {
      ...updatedItems[index],
      cleared: !updatedItems[index].cleared,
      clearedDate: !updatedItems[index].cleared ? new Date().toISOString() : undefined
    };

    setChecklist({
      ...checklist,
      clearanceItems: updatedItems
    });
  };

  const toggleEquipment = (key: keyof ClearanceChecklist['equipmentReturned']) => {
    if (!checklist) return;

    setChecklist({
      ...checklist,
      equipmentReturned: {
        ...checklist.equipmentReturned,
        [key]: !checklist.equipmentReturned[key]
      }
    });
  };

  const updateComments = (index: number, comments: string) => {
    if (!checklist) return;

    const updatedItems = [...checklist.clearanceItems];
    updatedItems[index] = {
      ...updatedItems[index],
      comments
    };

    setChecklist({
      ...checklist,
      clearanceItems: updatedItems
    });
  };

  const allCleared = checklist?.clearanceItems?.every(item => item.cleared) &&
    Object.values(checklist?.equipmentReturned || {}).every(val => val) &&
    checklist?.cardReturned;

  if (loading) {
    return (
      <div className={styles.container}>
        <Spinner message="Loading clearance details..." />
      </div>
    );
  }

  if (!termination || !checklist) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Failed to load clearance data</div>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Go Back
        </button>
      </div>
    );
  }

  const employee = typeof termination.employeeId === 'string' 
    ? { firstName: 'Unknown', lastName: 'Employee' }
    : termination.employeeId;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Back to Termination
        </button>
        <h1>Clearance Management</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {/* Employee Info */}
      <div className={styles.card}>
        <h2>Employee Information</h2>
        <div className={styles.employeeInfo}>
          <div>
            <strong>Name:</strong> {employee.firstName} {employee.lastName}
          </div>
          <div>
            <strong>Email:</strong> {employee.workEmail || employee.personalEmail || 'N/A'}
          </div>
          <div>
            <strong>Department:</strong> {employee.primaryDepartmentId?.name || 'N/A'}
          </div>
          <div>
            <strong>Position:</strong> {employee.primaryPositionId?.title || 'N/A'}
          </div>
          <div>
            <strong>Last Working Day:</strong> {termination.terminationDate 
              ? new Date(termination.terminationDate).toLocaleDateString()
              : 'Not set'}
          </div>
        </div>
      </div>

      {/* Clearance Progress */}
      <div className={styles.progressCard}>
        <h2>Clearance Progress</h2>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ 
              width: `${((checklist.clearanceItems?.filter(i => i.cleared).length || 0) / (checklist.clearanceItems?.length || 1)) * 100}%` 
            }}
          />
        </div>
        <p className={styles.progressText}>
          {checklist.clearanceItems?.filter(i => i.cleared).length || 0} of {checklist.clearanceItems?.length || 0} departments cleared
        </p>
      </div>

      {/* Department Clearances */}
      <div className={styles.card}>
        <h2>Department Clearances</h2>
        <div className={styles.clearanceGrid}>
          {checklist.clearanceItems?.map((item, index) => (
            <div key={index} className={`${styles.clearanceItem} ${item.cleared ? styles.cleared : ''}`}>
              <div className={styles.clearanceHeader}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={item.cleared}
                    onChange={() => toggleClearance(index)}
                  />
                  <span className={styles.checkmark}></span>
                  <strong>{item.department}</strong>
                </label>
                {item.cleared && (
                  <span className={styles.clearedBadge}>✓ Cleared</span>
                )}
              </div>
              {item.clearedDate && (
                <div className={styles.clearedDate}>
                  Cleared: {new Date(item.clearedDate).toLocaleDateString()}
                </div>
              )}
              <textarea
                placeholder="Add comments..."
                value={item.comments || ''}
                onChange={(e) => updateComments(index, e.target.value)}
                className={styles.textarea}
                rows={2}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Equipment Return */}
      <div className={styles.card}>
        <h2>Equipment Return</h2>
        {checklist.equipmentReturned && Object.keys(checklist.equipmentReturned).length > 0 ? (
          <div className={styles.equipmentGrid}>
            {Object.entries(checklist.equipmentReturned).map(([key, value]) => (
              <label key={key} className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => toggleEquipment(key as keyof ClearanceChecklist['equipmentReturned'])}
                />
                <span className={styles.checkmark}></span>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
            ))}
          </div>
        ) : (
          <p className={styles.noData}>No equipment assigned</p>
        )}
      </div>

      {/* Card Return */}
      <div className={styles.card}>
        <h2>ID/Access Card</h2>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={checklist.cardReturned || false}
            onChange={() => setChecklist({ ...checklist, cardReturned: !checklist.cardReturned })}
          />
          <span className={styles.checkmark}></span>
          ID/Access Card Returned
        </label>
      </div>

      {/* Final Settlement */}
      <div className={styles.card}>
        <h2>Final Settlement</h2>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={checklist.finalSettlementPaid || false}
            onChange={() => setChecklist({ ...checklist, finalSettlementPaid: !checklist.finalSettlementPaid })}
          />
          <span className={styles.checkmark}></span>
          Final Settlement Paid
        </label>
      </div>

      {/* General Comments */}
      <div className={styles.card}>
        <h2>General Comments</h2>
        <textarea
          placeholder="Add general comments about the clearance process..."
          value={checklist.comments || ''}
          onChange={(e) => setChecklist({ ...checklist, comments: e.target.value })}
          className={styles.textarea}
          rows={4}
        />
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {allCleared && (
          <div className={styles.completeBanner}>
            ✓ All clearance requirements completed!
            <br />
            <small>💰 Termination benefits will be automatically assigned when you save.</small>
          </div>
        )}
        <button
          onClick={handleClearanceSave}
          disabled={saving}
          className={styles.saveButton}
        >
          {saving ? 'Processing...' : allCleared ? 'Finalize & Assign Benefits' : 'Save Clearance'}
        </button>
      </div>
    </div>
  );
}
