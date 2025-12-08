/**
 * Employee Profile Edit Page (Route: /profile/edit)
 * US-E2-05: Update contact information (phone, address)
 * US-E2-12: Upload profile picture and add biography
 * BR 2n, 2o, 2g: Phone, Email, Address requirements
 * Phase I: Self-Service Immediate Updates
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Spinner from '@/app/components/Spinner';
import axios from '@/lib/axios-config';
import { EmployeeProfile, Address, EmergencyContact } from '@/lib/types/employee-profile.types';
import styles from './edit.module.css';

export default function ProfileEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams.get('section') || 'contact';

  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState<Address>({
    street: '',
    city: '',
    state: '',
    country: '',
    postalCode: ''
  });
  const [biography, setBiography] = useState('');
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>({
    name: '',
    relationship: '',
    phone: '',
    email: ''
  });
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/employee-profile/my-profile');
      const data = response.data;
      setProfile(data);
      
      // Populate form fields
      setPhone(data.phone || '');
      setEmail(data.email || '');
      setAddress(data.address || {
        street: '',
        city: '',
        state: '',
        country: '',
        postalCode: ''
      });
      setBiography(data.biography || '');
      setEmergencyContact(data.emergencyContact || {
        name: '',
        relationship: '',
        phone: '',
        email: ''
      });
      setPreviewUrl(data.profilePictureUrl || '');
      
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      
      // Compress and preview image
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Resize to max 800x800 while maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          const maxSize = 800;
          
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with compression
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          setPreviewUrl(compressedBase64);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
      
      setProfilePicture(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let updateData: any = {};

      if (section === 'contact') {
        updateData = { 
          personalEmail: email, 
          mobilePhone: phone, 
          address 
        };
      } else if (section === 'biography') {
        updateData = { biography };
      } else if (section === 'emergency') {
        updateData = { emergencyContact };
      } else if (section === 'photo' && profilePicture && previewUrl) {
        // Upload the compressed image
        try {
          await axios.patch('/employee-profile/my-profile/photo', {
            profilePictureUrl: previewUrl
          });
          
          setSuccess('Profile picture updated successfully!');
          setTimeout(() => router.push('/profile'), 2000);
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to update profile picture');
        } finally {
          setSaving(false);
        }
        return;
      }

      // Update profile data
      await axios.patch('/employee-profile/my-profile', updateData);
      setSuccess('Profile updated successfully!');
      
      // Redirect back to profile after 2 seconds
      setTimeout(() => router.push('/profile'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Spinner fullScreen message="Loading profile..." />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Edit Profile - {section === 'contact' ? 'Contact Information' : 
                          section === 'biography' ? 'Biography' :
                          section === 'emergency' ? 'Emergency Contact' : 
                          'Profile Picture'}
          </h1>
          <button 
            className={styles.backButton}
            onClick={() => router.push('/profile')}
          >
            ← Back to Profile
          </button>
        </div>

        {/* Section Navigation */}
        <div className={styles.sectionNav}>
          <button
            className={`${styles.sectionButton} ${section === 'contact' ? styles.active : ''}`}
            onClick={() => router.push('/profile/edit?section=contact')}
          >
            Contact Info
          </button>
          <button
            className={`${styles.sectionButton} ${section === 'biography' ? styles.active : ''}`}
            onClick={() => router.push('/profile/edit?section=biography')}
          >
            Biography
          </button>
          <button
            className={`${styles.sectionButton} ${section === 'emergency' ? styles.active : ''}`}
            onClick={() => router.push('/profile/edit?section=emergency')}
          >
            Emergency Contact
          </button>
          <button
            className={`${styles.sectionButton} ${section === 'photo' ? styles.active : ''}`}
            onClick={() => router.push('/profile/edit?section=photo')}
          >
            Profile Picture
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.card}>
          <form onSubmit={handleSubmit}>
            {/* Contact Information Section */}
            {section === 'contact' && (
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email *</label>
                  <input
                    type="email"
                    className={styles.input}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Phone *</label>
                  <input
                    type="tel"
                    className={styles.input}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label className={styles.label}>Street Address *</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>City *</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>State/Province *</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Postal Code *</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={address.postalCode}
                    onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Country *</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={address.country}
                    onChange={(e) => setAddress({ ...address, country: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            {/* Biography Section */}
            {section === 'biography' && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Biography</label>
                <textarea
                  className={styles.textarea}
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  rows={8}
                  placeholder="Tell us about yourself..."
                />
                <small className={styles.hint}>
                  Share your professional background, interests, and achievements.
                </small>
              </div>
            )}

            {/* Emergency Contact Section */}
            {section === 'emergency' && (
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Contact Name *</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={emergencyContact.name}
                    onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Relationship *</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={emergencyContact.relationship}
                    onChange={(e) => setEmergencyContact({ ...emergencyContact, relationship: e.target.value })}
                    placeholder="e.g., Spouse, Parent, Sibling"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Phone Number *</label>
                  <input
                    type="tel"
                    className={styles.input}
                    value={emergencyContact.phone}
                    onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Email (Optional)</label>
                  <input
                    type="email"
                    className={styles.input}
                    value={emergencyContact.email || ''}
                    onChange={(e) => setEmergencyContact({ ...emergencyContact, email: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Photo Upload Section */}
            {section === 'photo' && (
              <div className={styles.photoSection}>
                <div className={styles.photoPreview}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className={styles.previewImage} />
                  ) : (
                    <div className={styles.placeholderImage}>No Image</div>
                  )}
                </div>
                <div className={styles.uploadSection}>
                  <label className={styles.fileLabel}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className={styles.fileInput}
                    />
                    <span className={styles.fileButton}>Choose Photo</span>
                  </label>
                  <small className={styles.hint}>
                    Upload a professional photo (Max 5MB, JPG/PNG)
                  </small>
                </div>
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.button} ${styles.cancelButton}`}
                onClick={() => router.push('/profile')}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`${styles.button} ${styles.saveButton}`}
                disabled={saving || (section === 'photo' && !profilePicture)}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
