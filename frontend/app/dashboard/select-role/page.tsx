/**
 * Role Selection Page (Route: /dashboard/select-role)
 * Allows users with multiple roles to switch between dashboards
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import RoleSelectionModal from '../../components/RoleSelectionModal';
import { getAvailableDashboards } from '@/lib/roles';

export default function SelectRolePage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [dashboards, setDashboards] = useState<Array<{ role: string; label: string; route: string }>>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.roles) {
      const available = getAvailableDashboards(user.roles);
      if (available.length === 0) {
        router.push('/job-offers');
      } else if (available.length === 1) {
        router.push(available[0].route);
      } else {
        setDashboards(available);
      }
    }
  }, [user, isAuthenticated, router]);

  if (dashboards.length === 0) {
    return null;
  }

  return <RoleSelectionModal roles={dashboards} onSelect={() => {}} />;
}
