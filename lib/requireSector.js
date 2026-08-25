import { supabaseAdmin } from './supabaseAdmin';

export async function requireSector(userId, businessId, expectedSector) {
  const { data: membership } = await supabaseAdmin
    .from('business_memberships')
    .select('business_id')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .maybeSingle();

  if (!membership) return { error: 'Forbidden' };

  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('sector')
    .eq('id', businessId)
    .single();

  if (!business || business.sector !== expectedSector) return { error: 'Forbidden' };
  return { ok: true };
}
