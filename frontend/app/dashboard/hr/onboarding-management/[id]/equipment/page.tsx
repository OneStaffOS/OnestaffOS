'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from '@/lib/axios-config';
import Spinner from '@/app/components/Spinner';
import styles from './equipment.module.css';

import { safeMap, ensureArray, safeLength } from '@/lib/safe-array';
interface Equipment {
  name: string;
  issued: boolean;
  issuedDate?: Date;
  serialNumber?: string;
}

interface DeskInfo {
  building?: string;
  floor?: string;
  deskNumber?: string;
  allocatedDate?: Date;
}

interface AccessCardInfo {
  cardNumber?: string;
  issuedDate?: Date;
  expiryDate?: Date;
  status?: string;
}

export default function EquipmentManagementPage() {
  const params = useParams();
  const router = useRouter();
  const onboardingId = params.id as string;

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [deskInfo, setDeskInfo] = useState<DeskInfo>({});
  const [cardInfo, setCardInfo] = useState<AccessCardInfo>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, [onboardingId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [equipRes, deskRes, cardRes] = await Promise.all([
        axios.get(`/recruitment/onboarding/${onboardingId}/equipment`).catch(() => ({ data: [] })),
        axios.get(`/recruitment/onboarding/${onboardingId}/desk`).catch(() => ({ data: null })),
        axios.get(`/recruitment/onboarding/${onboardingId}/access-card`).catch(() => ({ data: null })),
      ]);

      setEquipment(equipRes.data || []);
      setDeskInfo(deskRes.data || {});
      setCardInfo(cardRes.data || {});
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addEquipmentItem = () => {
    setEquipment([...equipment, { name: '', issued: false }]);
  };

  const updateEquipment = (index: number, field: keyof Equipment, value: any) => {
    const updated = [...equipment];
    updated[index] = { ...updated[index], [field]: value };
    setEquipment(updated);
  };

  const removeEquipment = (index: number) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };

  const saveAll = async () => {
    try {
      setSaving(true);
      setSuccess('');

      await Promise.all([
        axios.put(`/recruitment/onboarding/${onboardingId}/equipment`, { equipment }),
        axios.put(`/recruitment/onboarding/${onboardingId}/desk`, deskInfo),
        axios.put(`/recruitment/onboarding/${onboardingId}/access-card`, cardInfo),
      ]);

      setSuccess('All information saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Spinner message="Loading equipment information..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Equipment & Facilities Management</h1>
          <p className={styles.subtitle}>Manage equipment, desk allocation, and access cards</p>
        </div>
        <button className={styles.backButton} onClick={() => router.back()}>
          ← Back
        </button>
      </div>

      {success && <div className={styles.success}>{success}</div>}

      {/* Equipment Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>💻 Equipment Tracking</h2>
          <button className={styles.addButton} onClick={addEquipmentItem}>
            + Add Equipment
          </button>
        </div>

        {equipment.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No equipment assigned yet. Click "Add Equipment" to start.</p>
          </div>
        ) : (
          <div className={styles.equipmentList}>
            {equipment.map((item, index) => (
              <div key={index} className={styles.equipmentItem}>
                <div className={styles.equipmentFields}>
                  <input
                    type="text"
                    placeholder="Equipment name (e.g., Laptop, Monitor)"
                    value={item.name}
                    onChange={(e) => updateEquipment(index, 'name', e.target.value)}
                    className={styles.input}
                  />
                  
                  <input
                    type="text"
                    placeholder="Serial Number or Asset Tag"
                    value={item.serialNumber || ''}
                    onChange={(e) => updateEquipment(index, 'serialNumber', e.target.value)}
                    className={styles.input}
                  />

                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={item.issued}
                      onChange={(e) => updateEquipment(index, 'issued', e.target.checked)}
                    />
                    <span>Issued</span>
                  </label>

                  {item.issued && (
                    <input
                      type="date"
                      value={item.issuedDate ? new Date(item.issuedDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => updateEquipment(index, 'issuedDate', e.target.value)}
                      className={styles.input}
                    />
                  )}
                </div>

                <button
                  className={styles.removeButton}
                  onClick={() => removeEquipment(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desk Allocation Section */}
      <div className={styles.section}>
        <h2>🏢 Desk Allocation</h2>
        
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Building</label>
            <input
              type="text"
              placeholder="e.g., Main Building"
              value={deskInfo.building || ''}
              onChange={(e) => setDeskInfo({ ...deskInfo, building: e.target.value })}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Floor</label>
            <input
              type="text"
              placeholder="e.g., 3rd Floor"
              value={deskInfo.floor || ''}
              onChange={(e) => setDeskInfo({ ...deskInfo, floor: e.target.value })}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Desk Number</label>
            <input
              type="text"
              placeholder="e.g., 3-A-12"
              value={deskInfo.deskNumber || ''}
              onChange={(e) => setDeskInfo({ ...deskInfo, deskNumber: e.target.value })}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Allocated Date</label>
            <input
              type="date"
              value={deskInfo.allocatedDate ? new Date(deskInfo.allocatedDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setDeskInfo({ ...deskInfo, allocatedDate: e.target.value as any })}
              className={styles.input}
            />
          </div>
        </div>
      </div>

      {/* Access Card Section */}
      <div className={styles.section}>
        <h2>🆔 Access Card</h2>
        
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Card Number</label>
            <input
              type="text"
              placeholder="e.g., AC-2024-001"
              value={cardInfo.cardNumber || ''}
              onChange={(e) => setCardInfo({ ...cardInfo, cardNumber: e.target.value })}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Issued Date</label>
            <input
              type="date"
              value={cardInfo.issuedDate ? new Date(cardInfo.issuedDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setCardInfo({ ...cardInfo, issuedDate: e.target.value as any })}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Expiry Date</label>
            <input
              type="date"
              value={cardInfo.expiryDate ? new Date(cardInfo.expiryDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setCardInfo({ ...cardInfo, expiryDate: e.target.value as any })}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Status</label>
            <select
              value={cardInfo.status || 'pending'}
              onChange={(e) => setCardInfo({ ...cardInfo, status: e.target.value })}
              className={styles.input}
            >
              <option value="pending">Pending</option>
              <option value="requested">Requested</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button
          className={styles.saveButton}
          onClick={saveAll}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}
