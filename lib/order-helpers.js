import { getCustomerName } from './utils'

export function getOrderCustomerName(order, customers = []) {
  if (!order) return 'Unknown customer'
  if (order.customer_name) return order.customer_name
  const customer = customers.find(c => c?.id === order?.customer_id)
  if (customer) return getCustomerName(customer)
  return order.customer_id ? `Customer (${order.customer_id.slice(0, 8)})` : 'Unknown customer'
}
