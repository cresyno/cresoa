import { safeAmount } from './utils'

export function normalizeOrder(order) {
  const status = order?.current_status || order?.status || 'Order placed'
  const price = safeAmount(order?.price ?? order?.total_amount ?? order?.amount)
  const paid = safeAmount(order?.amount_paid ?? order?.paid_amount ?? order?.amountPaid)
  return {
    ...order,
    id: order?.id,
    current_status: status,
    created_at: order?.created_at || order?.createdAt || new Date().toISOString(),
    price,
    amount_paid: paid,
    balance: Math.max(price - paid, 0),
    customer_name: order?.customer_name || order?.customer?.name || ''
  }
}

export function normalizeCustomer(customer) {
  return {
    ...customer,
    id: customer?.id,
    name: customer?.full_name || customer?.name || 'Unnamed customer',
    created_at: customer?.created_at || new Date().toISOString()
  }
}

export function normalizeGroup(group) {
  return {
    ...group,
    id: group?.id,
    name: group?.group_name || group?.name || 'Group',
    created_at: group?.created_at || new Date().toISOString(),
    coordinator_customer_id: group?.coordinator_customer_id || null,
    due_date: group?.due_date || null,
    status: group?.status || 'pending'
  }
}
