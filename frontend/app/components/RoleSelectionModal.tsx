/**
 * RoleSelectionModal
 * Modal for users with multiple roles to select which dashboard to access
 */

'use client';

import { useRouter } from 'next/navigation';
import styles from './RoleSelectionModal.module.css';

interface RoleOption {
  role: string;
  label: string;
  route: string;
}

interface RoleSelectionModalProps {
  roles: RoleOption[];
  onSelect: (route: string) => void;
}

export default function RoleSelectionModal({ roles, onSelect }: RoleSelectionModalProps) {
  const router = useRouter();

  const handleSelect = (route: string) => {
    onSelect(route);
    router.push(route);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Select Your Dashboard</h2>
          <p>You have multiple roles. Please select which dashboard you want to access.</p>
        </div>

        <div className={styles.roleGrid}>
          {roles.map((option) => (
            <button
              key={option.role}
              className={styles.roleCard}
              onClick={() => handleSelect(option.route)}
            >
              <div className={styles.roleIcon}>👤</div>
              <h3>{option.label}</h3>
              <p>{option.role}</p>
            </button>
          ))}
        </div>

        <p className={styles.footer}>
          You can always switch between dashboards later from your profile settings.
        </p>
      </div>
    </div>
  );
}
