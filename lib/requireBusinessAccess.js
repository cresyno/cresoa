import { supabase } from './supabaseClient';
import { getCurrentBusinessId } from './getBusinessId';

export async function requireBusinessAccess(router) {
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    router.push('/login');
    return null;
  }

  // Get business ID (from URL or localStorage)
  let businessId = getCurrentBusinessId();

  // If no business ID, try to fetch the user's first business
  if (!businessId) {
    const { data: membership } = await supabase
      .from('business_memberships')
      .select('business_id')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!membership) {
      router.push('/dashboard');
      return null;
    }

    businessId = membership.business_id;
    localStorage.setItem('selectedBusinessId', businessId);
  }

  // Verify user is a member of this business
  const { data: membership } = await supabase
    .from('business_memberships')
    .select('business_id')
    .eq('business_id', businessId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!membership) {
    router.push('/dashboard');
    return null;
  }

  return businessId;
}
