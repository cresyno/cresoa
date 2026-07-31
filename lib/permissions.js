// lib/permissions.js
import { useUser } from '@/lib/useUser'; // assuming you have a user context; adjust if not
import { isOwner, canPerformAction } from './staffAuth';

export function usePermissions() {
  const { user, business } = useUser(); // must provide user and business data

  const isOwner = user && business && user.id === business.owner_id;

  const can = (action) => {
    if (!user || !business) return false;
    return canPerformAction(user.id, business.id, action);
  };

  return {
    isOwner,
    can,
    role: isOwner ? 'owner' : (user?.role || 'staff'), // adjust as needed
  };
}
