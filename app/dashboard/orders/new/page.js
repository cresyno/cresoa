// app/dashboard/orders/new/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBusinessId } from '../../../../lib/getBusinessId';
import { getPlanLimits } from '../../../../lib/planLimits';
import { Icon } from '../../../../components/Icon';

// ─── Helper to format currency ───
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₦0';
  return `₦${Number(amount).toLocaleString()}`;
};

export default function NewOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [businessId, setBusinessId] = useState(null);
  const [businessPlan, setBusinessPlan] = useState('free');
  const [customers, setCustomers] = useState([]);
  const [orderCount, setOrderCount] = useState(0);

  // ─── Step state ───
  const [step, setStep] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [customerStats, setCustomerStats] = useState(null);

  // ─── Extended formData ───
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    title: '',
    price: '',
    amount_paid: '',
    due_date: '',
    current_status: 'Order placed',
    notes: '',
    // new fields
    category: '',
    quantity: 1,
    fabric: '',
    fitting_date: '',
    event_date: '',
    measurements: {
      bust: '',
      waist: '',
      hip: '',
      shoulder: '',
      sleeve: '',
      length: '',
      trouser: '',
      neck: '',
      armhole: '',
      thigh: '',
    },
  });

  const [isNewCustomer, setIsNewCustomer] = useState(false);

  // ─── Load initial data ───
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const bizId = getCurrentBusinessId();
        if (!bizId) {
          router.push('/dashboard');
          return;
        }
        setBusinessId(bizId);

        // Fetch business plan
        const { data: bizData } = await supabase
          .from('businesses')
          .select('plan')
          .eq('id', bizId)
          .single();
        if (bizData) setBusinessPlan(bizData.plan || 'free');

        // Fetch customers
        const { data: custData } = await supabase
          .from('customers')
          .select('id, name, phone, email')
          .eq('business_id', bizId)
          .order('name');
        setCustomers(custData || []);

        // Count existing orders
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', bizId);
        setOrderCount(count || 0);
      } catch (err) {
        console.error(err);
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  // ─── Fetch customer stats when customer_id changes ───
  useEffect(() => {
    if (!formData.customer_id || !businessId) {
      setCustomerStats(null);
      return;
    }
    const fetchStats = async () => {
      const { data: orders } = await supabase
        .from('orders')
        .select('price, amount_paid')
        .eq('customer_id', formData.customer_id)
        .eq('business_id', businessId);
      if (orders) {
        const totalSpent = orders.reduce((sum, o) => sum + (o.price || 0), 0);
        const totalPaid = orders.reduce((sum, o) => sum + (o.amount_paid || 0), 0);
        const outstanding = totalSpent - totalPaid;
        setCustomerStats({
          orderCount: orders.length,
          totalSpent,
          outstanding,
        });
      }
    };
    fetchStats();
  }, [formData.customer_id, businessId]);

  // ─── Handlers ───
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMeasurementChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      measurements: { ...prev.measurements, [key]: value },
    }));
  };

  const handleCustomerSelect = (customerId) => {
    const selected = customers.find((c) => c.id === customerId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        customer_id: selected.id,
        customer_name: selected.name,
        customer_phone: selected.phone || '',
        customer_email: selected.email || '',
      }));
      setIsNewCustomer(false);
      setShowNewCustomer(false);
      setCustomerSearch('');
    }
  };

  const handleNewCustomerToggle = () => {
    setShowNewCustomer(true);
    setIsNewCustomer(true);
    setFormData((prev) => ({
      ...prev,
      customer_id: '',
      customer_name: '',
      customer_phone: '',
      customer_email: '',
    }));
  };

  // ─── Filtered customers for search ───
  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  // ─── Recent customers (last 5) ───
  const recentCustomers = customers.slice(0, 5);

  // ─── Submit ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!businessId) {
        setError('No business selected.');
        setSaving(false);
        return;
      }

      // Plan limit check
      const limits = getPlanLimits(businessPlan);
      if (orderCount >= limits.orders) {
        setError(`You have reached the limit of ${limits.orders} orders on your current plan. Please upgrade to add more.`);
        setSaving(false);
        return;
      }

      // Validate required fields
      if (!formData.title) {
        setError('Please enter an item / garment name.');
        setSaving(false);
        return;
      }
      const price = parseFloat(formData.price);
      if (!price || price <= 0) {
        setError('Please enter a valid price.');
        setSaving(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // ─── Build payload (preserve all existing fields + new ones) ───
      const payload = {
        business_id: businessId,
        title: formData.title,
        price: price,
        amount_paid: parseFloat(formData.amount_paid) || 0,
        due_date: formData.due_date || null,
        current_status: formData.current_status,
        notes: formData.notes || null,
        // new fields
        category: formData.category || null,
        quantity: parseInt(formData.quantity) || 1,
        fabric: formData.fabric || null,
        fitting_date: formData.fitting_date || null,
        event_date: formData.event_date || null,
        measurements: Object.values(formData.measurements).some(v => v) ? formData.measurements : null,
      };

      // Customer handling (existing logic)
      if (isNewCustomer || showNewCustomer) {
        if (!formData.customer_name) {
          setError('Customer name is required.');
          setSaving(false);
          return;
        }
        payload.customer_name = formData.customer_name;
        payload.customer_phone = formData.customer_phone || null;
        payload.customer_email = formData.customer_email || null;
      } else if (formData.customer_id) {
        payload.customer_id = formData.customer_id;
      } else {
        setError('Please select or add a customer.');
        setSaving(false);
        return;
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create order');
      }

      // Redirect to the order detail page (which we'll redesign later)
      router.push(`/dashboard/orders/${result.id}?business_id=${businessId}`);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
      setSaving(false);
    }
  };

  // ─── Step navigation ───
  const nextStep = () => {
    // Basic validation before moving forward
    if (step === 1 && !formData.customer_id && !isNewCustomer && !showNewCustomer) {
      setError('Please select or add a customer.');
      return;
    }
    if (step === 1 && isNewCustomer && !formData.customer_name) {
      setError('Please enter the customer name.');
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, 4));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // ─── Render step content ───
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[#0F2B4A]">
              <Icon name="user" size={20} stroke="#0F2B4A" />
              <span>Who is this order for?</span>
            </div>

            {/* Search input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Icon name="search" size={18} stroke="#8A8A8A" />
              </div>
              <input
                type="text"
                placeholder="Search customers by name or phone"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] text-base"
              />
            </div>

            {/* Search results / recent customers */}
            {customerSearch ? (
              <div className="max-h-60 overflow-y-auto border border-[#E5E0D8] rounded-xl divide-y divide-[#E5E0D8] bg-white">
                {filteredCustomers.length === 0 ? (
                  <div className="p-4 text-center text-[#8A8A8A]">No customers found</div>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCustomerSelect(c.id)}
                      className="w-full text-left px-4 py-3 hover:bg-[#F8F6F2] transition flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-[#0F2B4A]">{c.name}</div>
                        {c.phone && <div className="text-sm text-[#8A8A8A]">{c.phone}</div>}
                      </div>
                      <Icon name="chevronRight" size={16} stroke="#8A8A8A" />
                    </button>
                  ))
                )}
              </div>
            ) : (
              // Recent customers
              <div>
                <div className="text-xs uppercase tracking-wider text-[#8A8A8A] font-semibold mb-2">Recent customers</div>
                <div className="space-y-2">
                  {recentCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCustomerSelect(c.id)}
                      className="w-full text-left px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white hover:border-[#D4A52A] transition flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-[#0F2B4A]">{c.name}</div>
                        {c.phone && <div className="text-sm text-[#8A8A8A]">{c.phone}</div>}
                      </div>
                      <Icon name="chevronRight" size={16} stroke="#8A8A8A" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add new customer */}
            <button
              type="button"
              onClick={handleNewCustomerToggle}
              className="flex items-center gap-2 text-[#D4A52A] font-medium hover:underline"
            >
              <Icon name="plus" size={16} stroke="#D4A52A" />
              Add new customer
            </button>

            {/* New customer form (inline) */}
            {showNewCustomer && (
              <div className="border border-[#E5E0D8] rounded-xl p-4 bg-[#F8F6F2] space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[#0F2B4A] mb-1">Name *</label>
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F2B4A] mb-1">Phone</label>
                  <input
                    type="tel"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F2B4A] mb-1">Email</label>
                  <input
                    type="email"
                    name="customer_email"
                    value={formData.customer_email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A]"
                  />
                </div>
              </div>
            )}

            {/* Customer stats (if customer selected) */}
            {formData.customer_id && customerStats && (
              <div className="bg-[#F8F6F2] rounded-xl p-4 border border-[#E5E0D8] grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs uppercase tracking-wider text-[#8A8A8A]">Orders</div>
                  <div className="text-lg font-bold text-[#0F2B4A]">{customerStats.orderCount}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-[#8A8A8A]">Total spent</div>
                  <div className="text-lg font-bold text-[#0F2B4A]">{formatCurrency(customerStats.totalSpent)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-[#8A8A8A]">Outstanding</div>
                  <div className="text-lg font-bold text-[#D9534F]">{formatCurrency(customerStats.outstanding)}</div>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[#0F2B4A]">
              <Icon name="scissors" size={20} stroke="#0F2B4A" />
              <span>What are you making?</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F2B4A] mb-1">Garment name *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Aso-ebi Gown"
                className="w-full px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F2B4A] mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] appearance-none"
              >
                <option value="">Select category</option>
                <option value="Gown">Gown</option>
                <option value="Suit">Suit</option>
                <option value="Shirt">Shirt</option>
                <option value="Trousers">Trousers</option>
                <option value="Skirt">Skirt</option>
                <option value="Dress">Dress</option>
                <option value="Agbada">Agbada</option>
                <option value="Native">Native</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F2B4A] mb-1">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(1, (prev.quantity || 1) - 1) }))}
                  className="w-10 h-10 flex items-center justify-center border border-[#E5E0D8] rounded-xl bg-white hover:bg-[#F8F6F2]"
                >
                  <Icon name="minus" size={16} stroke="#0F2B4A" />
                </button>
                <span className="text-lg font-semibold text-[#0F2B4A] w-8 text-center">{formData.quantity || 1}</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, quantity: (prev.quantity || 1) + 1 }))}
                  className="w-10 h-10 flex items-center justify-center border border-[#E5E0D8] rounded-xl bg-white hover:bg-[#F8F6F2]"
                >
                  <Icon name="plus" size={16} stroke="#0F2B4A" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F2B4A] mb-1">Fabric</label>
              <select
                name="fabric"
                value={formData.fabric}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] appearance-none"
              >
                <option value="">Select fabric</option>
                <option value="Customer's fabric">Customer's fabric</option>
                <option value="In-house fabric">In-house fabric</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F2B4A] mb-1">Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(1, (prev.quantity || 1) - 1) }))}
                  className="w-10 h-10 flex items-center justify-center border border-[#E5E0D8] rounded-xl bg-white hover:bg-[#F8F6F2]"
                >
                  <Icon name="minus" size={16} stroke="#0F2B4A" />
                </button>
                <span className="text-lg font-semibold text-[#0F2B4A] w-8 text-center">{formData.quantity || 1}</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, quantity: (prev.quantity || 1) + 1 }))}
                  className="w-10 h-10 flex items-center justify-center border border-[#E5E0D8] rounded-xl bg-white hover:bg-[#F8F6F2]"
                >
                  <Icon name="plus" size={16} stroke="#0F2B4A" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F2B4A] mb-1">Fabric</label>
              <select
                name="fabric"
                value={formData.fabric}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] appearance-none"
              >
                <option value="">Select fabric</option>
                <option value="Customer's fabric">Customer's fabric</option>
                <option value="In-house fabric">In-house fabric</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F2B4A] mb-1">Style / description</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Off-shoulder, fitted waist, long sleeve..."
                className="w-full px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] resize-none"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[#0F2B4A]">
              <Icon name="calendar" size={20} stroke="#0F2B4A" />
              <span>When does it need to be ready?</span>
            </div>

            {/* Dates */}
            <div>
              <label className="block text-sm font-medium text-[#0F2B4A] mb-1">Fitting date</label>
              <input
                type="date"
                name="fitting_date"
                value={formData.fitting_date}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F2B4A] mb-1">Pickup / delivery date</label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F2B4A] mb-1">Event date</label>
              <input
                type="date"
                name="event_date"
                value={formData.event_date}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A]"
              />
            </div>

            {/* Measurements */}
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-[#0F2B4A] mb-2">
                <Icon name="ruler" size={20} stroke="#0F2B4A" />
                <span>Measurements</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'bust', label: 'Bust' },
                  { key: 'waist', label: 'Waist' },
                  { key: 'hip', label: 'Hip' },
                  { key: 'shoulder', label: 'Shoulder' },
                  { key: 'sleeve', label: 'Sleeve' },
                  { key: 'length', label: 'Length' },
                  { key: 'trouser', label: 'Trouser' },
                  { key: 'neck', label: 'Neck' },
                  { key: 'armhole', label: 'Armhole' },
                  { key: 'thigh', label: 'Thigh' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-[#8A8A8A] mb-1">{label}</label>
                    <input
                      type="number"
                      value={formData.measurements[key] || ''}
                      onChange={(e) => handleMeasurementChange(key, e.target.value)}
                      placeholder="cm"
                      className="w-full px-3 py-2 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[#0F2B4A]">
              <Icon name="creditCard" size={20} stroke="#0F2B4A" />
              <span>Payment</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F2B4A] mb-1">Total price (₦) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F2B4A] mb-1">Deposit (₦)</label>
              <input
                type="number"
                name="amount_paid"
                value={formData.amount_paid}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A]"
              />
            </div>

            {/* Auto‑calculated balance */}
            {formData.price && (
              <div className="bg-[#F8F6F2] rounded-xl p-4 border border-[#E5E0D8]">
                <div className="flex justify-between text-sm">
                  <span className="text-[#8A8A8A]">Balance</span>
                  <span className="font-semibold text-[#0F2B4A]">
                    {formatCurrency((parseFloat(formData.price) || 0) - (parseFloat(formData.amount_paid) || 0))}
                  </span>
                </div>
                <div className="mt-1 text-xs text-[#8A8A8A]">
                  Payment status:{' '}
                  {!formData.amount_paid || parseFloat(formData.amount_paid) === 0 ? (
                    <span className="text-[#D9534F] font-medium">Unpaid</span>
                  ) : parseFloat(formData.amount_paid) >= parseFloat(formData.price) ? (
                    <span className="text-[#2E7D5E] font-medium">Paid in full</span>
                  ) : (
                    <span className="text-[#D4A52A] font-medium">Partially paid</span>
                  )}
                </div>
              </div>
            )}

            {/* Status (existing) */}
            <div>
              <label className="block text-sm font-medium text-[#0F2B4A] mb-1">Current status</label>
              <select
                name="current_status"
                value={formData.current_status}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] appearance-none"
              >
                <option value="Order placed">Order placed</option>
                <option value="Cutting">Cutting</option>
                <option value="Sewing">Sewing</option>
                <option value="Ready">Ready</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>

            {/* Summary card */}
            <div className="bg-[#0F2B4A] text-white rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="opacity-70">Customer</span>
                <span className="font-medium">{formData.customer_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Garment</span>
                <span className="font-medium">{formData.title || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Total</span>
                <span className="font-medium">{formatCurrency(formData.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Deposit</span>
                <span className="font-medium">{formatCurrency(formData.amount_paid)}</span>
              </div>
              <div className="flex justify-between border-t border-white/20 pt-2">
                <span className="opacity-70">Balance</span>
                <span className="font-bold text-[#D4A52A]">
                  {formatCurrency((parseFloat(formData.price) || 0) - (parseFloat(formData.amount_paid) || 0))}
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ─── Skeleton ───
  if (loading) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <div className="h-6 w-32 bg-[#E5E0D8] rounded mb-4 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-[#E5E0D8] rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="p-4 max-w-2xl mx-auto text-center">
        <div className="text-[#D9534F]">{error}</div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-[#D4A52A] text-[#0F2B4A] rounded-xl font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-[#0F2B4A] mb-1">Create a new job</h1>
      <p className="text-sm text-[#8A8A8A] mb-6">
        {orderCount} orders used · {getPlanLimits(businessPlan).orders === Infinity ? 'Unlimited' : getPlanLimits(businessPlan).orders} max
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i === step
                  ? 'bg-[#D4A52A] text-[#0F2B4A]'
                  : i < step
                  ? 'bg-[#2E7D5E] text-white'
                  : 'bg-[#E5E0D8] text-[#8A8A8A]'
              }`}
            >
              {i < step ? <Icon name="check" size={14} stroke="white" /> : i}
            </div>
            {i < 4 && <div className={`w-8 h-0.5 ${i < step ? 'bg-[#2E7D5E]' : 'bg-[#E5E0D8]'}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {renderStep()}

        {/* Error message */}
        {error && (
          <div className="mt-4 text-sm text-[#D9534F] bg-[#F1DBD3] p-3 rounded-xl">{error}</div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#E5E0D8]">
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2 text-[#0F2B4A] font-medium hover:underline"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-3 bg-[#D4A52A] text-[#0F2B4A] font-semibold rounded-xl hover:bg-[#C49A24] transition flex items-center gap-2"
            >
              Continue
              <Icon name="chevronRight" size={18} stroke="#0F2B4A" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-[#0F2B4A] text-white font-semibold rounded-xl hover:bg-[#1A3A5A] transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Creating...' : 'Create Order & Start Tracking'}
              {!saving && <Icon name="arrowRight" size={18} stroke="white" />}
            </button>
          )}
        </div>
      </form>
    </div>
  );
                    }
