export const industryConfig = {
  fashion: {
    label: 'Fashion & Custom Wear',
    dashboard: '/dashboard/fashion',
    defaultWorkflow: ['Order Placed', 'Cutting', 'Sewing', 'Ready for Pickup', 'Delivered'],
    nav: [
      { name: 'Dashboard', path: '/dashboard', icon: 'bar-chart-2' },
      { name: 'Orders', path: '/dashboard/orders', icon: 'file-text' },
      { name: 'Customers', path: '/dashboard/customers', icon: 'users' },
      { name: 'Inventory', path: '/dashboard/inventory', icon: 'package' },
      { name: 'Reminders', path: '/dashboard/reminders', icon: 'bell' },
    ]
  },
  repairs: {
    label: 'Repairs & Technical Services',
    dashboard: '/dashboard/repairs',
    defaultWorkflow: ['Diagnosis', 'In Progress', 'Ready for Pickup', 'Delivered'],
    nav: [
      { name: 'Dashboard', path: '/dashboard/repairs', icon: 'bar-chart-2' },
      { name: 'Jobs', path: '/dashboard/repairs/jobs', icon: 'tool' },
      { name: 'Customers', path: '/dashboard/repairs/customers', icon: 'users' },
      { name: 'Parts', path: '/dashboard/repairs/inventory', icon: 'package' },
      { name: 'Reminders', path: '/dashboard/repairs/reminders', icon: 'bell' },
    ]
  },
  logistics: { label: 'Logistics & Delivery', dashboard: '/dashboard/logistics', defaultWorkflow: ['Order Received', 'Packed', 'In Transit', 'Delivered'], nav: [] },
  trading: { label: 'Trading & Retail', dashboard: '/dashboard/trading', defaultWorkflow: ['Order Placed', 'Packed', 'Delivered'], nav: [] }
}
