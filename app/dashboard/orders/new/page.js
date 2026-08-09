// app/dashboard/orders/new/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBusinessId } from '../../../../lib/getBusinessId';
import { getPlanLimits } from '../../../../lib/planLimits';
import { Icon } from '../../../../components/Icon';

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

  const [step, setStep] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [customerStats, setCustomerStats] = useState(null);

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

        const { data: bizData } = await supabase
          .from('businesses')
          .select('plan')
          .eq('id', bizId)
          .single();
        if (bizData) setBusinessPlan(bizData.plan || 'free');

        const { data: custData } = await supabase
          .from('customers')
          .select('id, name, phone, email')
          .eq('business_id', bizId)
          .order('name');
        setCustomers(custData || []);

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

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  const recentCustomers = customers.slice(0, 5);

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

      const limits = getPlanLimits(businessPlan);
      if (orderCount >= limits.orders) {
        setError(`You have reached the limit of ${limits.orders} orders on your current plan. Please upgrade to add more.`);
        setSaving(false);
        return;
      }

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

      const payload = {
        business_id: businessId,
        title: formData.title,
        price: price,
        amount_paid: parseFloat(formData.amount_paid) || 0,
        due_date: formData.due_date || null,
        current_status: formData.current_status,
        notes: formData.notes || null,
        category: formData.category || null,
        quantity: parseInt(formData.quantity) || 1,
        fabric: formData.fabric || null,
        fitting_date: formData.fitting_date || null,
        event_date: formData.event_date || null,
        measurements: Object.values(formData.measurements).some(v => v) ? formData.measurements : null,
      };

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

      router.push(`/dashboard/orders/${result.order.id}?business_id=${businessId}`);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
      setSaving(false);
    }
  };

  const nextStep = () => {
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

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-[#0F2B4A]">
              <div className="w-8 h-8 rounded-full bg-[#D4A52A]/10 flex items-center justify-center">
                <Icon name="user" size={18} stroke="#D4A52A" />
              </div>
              <span>Who is this order for?</span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Icon name="search" size={18} stroke="#8A8A8A" />
              </div>
              <input
                type="text"
                placeholder="Search customers by name or phone"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 border border-[#E5E0D8] rounded-2xl bg-white text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] focus:border-transparent transition-shadow text-base shadow-sm"
              />
            </div>

            {customerSearch ? (
              <div className="max-h-64 overflow-y-auto border border-[#E5E0D8] rounded-2xl divide-y divide-[#E5E0D8] bg-white shadow-sm">
                {filteredCustomers.length === 0 ? (
                  <div className="p-5 text-center text-[#8A8A8A]">No customers found</div>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCustomerSelect(c.id)}
                      className="w-full text-left px-5 py-3.5 hover:bg-[#F8F6F2] transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-medium text-[#0F2B4A]">{c.name}</div>
                        {c.phone && <div className="text-sm text-[#8A8A8A]">{c.phone}</div>}
                      </div>
                      <Icon name="chevronRight" size={16} stroke="#D4A52A" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div>
                <div className="text-xs uppercase tracking-wider text-[#8A8A8A] font-semibold mb-3">Recent customers</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {recentCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCustomerSelect(c.id)}
                      className="text-left px-4 py-3 border border-[#E5E0D8] rounded-2xl bg-white hover:border-[#D4A52A] hover:shadow-sm transition-all group"
                    >
                      <div className="font-medium text-[#0F2B4A] text-sm">{c.name}</div>
                      {c.phone && <div className="text-xs text-[#8A8A8A]">{c.phone}</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleNewCustomerToggle}
              className="flex items-center gap-2 text-[#D4A52A] font-medium hover:text-[#B4881E] transition-colors group"
            >
              <div className="w-6 h-6 rounded-full border-2 border-[#D4A52A] flex items-center justify-center group-hover:bg-[#D4A52A] group-hover:text-white transition-colors">
                <Icon name="plus" size={12} stroke="#D4A52A" className="group-hover:stroke-white" />
              </div>
              Add new customer
            </button>

            {showNewCustomer && (
              <div className="border border-[#D4A52A] rounded-2xl p-5 bg-[#F8F6F2] space-y-3.5 shadow-sm">
                <div className="text-sm font-semibold text-[#0F2B4A]">New customer details</div>
                <div>
                  <label className="block text-xs font-medium text-[#0F2B4A] mb-1.5">Name *</label>
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] focus:border-transparent transition-shadow text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#0F2B4A] mb-1.5">Phone</label>
                  <input
                    type="tel"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] focus:border-transparent transition-shadow text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#0F2B4A] mb-1.5">Email</label>
                  <input
                    type="email"
                    name="customer_email"
                    value={formData.customer_email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] focus:border-transparent transition-shadow text-base"
                  />
                </div>
              </div>
            )}

            {formData.customer_id && customerStats && (
              <div className="bg-gradient-to-br from-[#F8F6F2] to-white rounded-2xl p-5 border border-[#E5E0D8] grid grid-cols-3 gap-3 text-center shadow-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[#8A8A8A] font-semibold">Orders</div>
                  <div className="text-xl font-bold text-[#0F2B4A] mt-0.5">{customerStats.orderCount}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[#8A8A8A] font-semibold">Total spent</div>
                  <div className="text-xl font-bold text-[#0F2B4A] mt-0.5">{formatCurrency(customerStats.totalSpent)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[#8A8A8A] font-semibold">Outstanding</div>
                  <div className="text-xl font-bold text-[#D9534F] mt-0.5">{formatCurrency(customerStats.outstanding)}</div>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-[#0F2B4A]">
              <div className="w-8 h-8 rounded-full bg-[#D4A52A]/10 flex items-center justify-center">
                <Icon name="scissors" size={18} stroke="#D4A52A" />
              </div>
              <span>What are you making?</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0F2B4A] mb-1.5">Garment name *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Aso-ebi Gown"
                className="w-full px-4 py-3.5 border border-[#E5E0D8] rounded-2xl bg-white text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] focus:border-transparent transition-shadow text-base shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0F2B4A] mb-1.5">Category</label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 border border-[#E5E0D8] rounded-2xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] focus:border-transparent transition-shadow appearance-none pr-12 shadow-sm text-base"
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
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <Icon name="chevronDown" size={16} stroke="#8A8A8A" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0F2B4A] mb-1.5">Quantity</label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(1, (prev.quantity || 1) - 1) }))}
                  className="w-11 h-11 flex items-center justify-center border border-[#E5E0D8] rounded-2xl bg-white hover:bg-[#F8F6F2] hover:border-[#D4A52A] transition-colors shadow-sm"
                >
                  <Icon name="minus" size={16} stroke="#0F2B4A" />
                </button>
                <span className="text-xl font-bold text-[#0F2B4A] w-8 text-center">{formData.quantity || 1}</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, quantity: (prev.quantity || 1) + 1 }))}
                  className="w-11 h-11 flex items-center justify-center border border-[#E5E0D8] rounded-2xl bg-white hover:bg-[#F8F6F2] hover:border-[#D4A52A] transition-colors shadow-sm"
                >
                  <Icon name="plus" size={16} stroke="#0F2B4A" />
                </button>
              </div>
            </div>

            
            <div>
              <label className="block text-xs font-medium text-[#0F2B4A] mb-1.5">Fabric</label>
              <div className="relative">
                <select
                  name="fabric"
                  value={formData.fabric}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 border border-[#E5E0D8] rounded-2xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] focus:border-transparent transition-shadow appearance-none pr-12 shadow-sm text-base"
                >
                  <option value="">Select fabric</option>
                  <option value="Customer's fabric">Customer's fabric</option>
                  <option value="In-house fabric">In-house fabric</option>
                  <option value="Other">Other</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <Icon name="chevronDown" size={16} stroke="#8A8A8A" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0F2B4A] mb-1.5">Style / description</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Off-shoulder, fitted waist, long sleeve..."
                className="w-full px-4 py-3.5 border border-[#E5E0D8] rounded-2xl bg-white text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] focus:border-transparent transition-shadow resize-none shadow-sm text-base"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-[#0F2B4A]">
              <div className="w-8 h-8 rounded-full bg-[#D4A52A]/10 flex items-center justify-center">
                <Icon name="calendar" size={18} stroke="#D4A52A" />
              </div>
              <span>When does it need to be ready?</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0F2B4A] mb-1.5">Fitting date</label>
              <input
                type="date"
                name="fitting_date"
                value={formData.fitting_date}
                onChange={handleChange}
                className="w-full px-4 py-3.5 border border-[#E5E0D8] rounded-2xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] focus:border-transparent transition-shadow shadow-sm text-base"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0F2B4A] mb-1.5">Pickup / delivery date</label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="w-full px-4 py-3.5 border border-[#E5E0D8] rounded-2xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] focus:border-transparent transition-shadow shadow-sm text-base"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0F2B4A] mb-1.5">Event date</label>
              <input
                type="date"
                name="event_date"
                value={formData.event_date}
                onChange={handleChange}
                className="w-full px-4 py-3.5 border border-[#E5E0D8] rounded-2xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] focus:border-transparent transition-shadow shadow-sm text-base"
              />
            </div>

            <div>
              <div className="flex items-center gap-2.5 text-sm font-semibold text-[#0F2B4A] mb-3">
                <div className="w-8 h-8 rounded-full bg-[#2E7D5E]/10 flex items-center justify-center">
                  <Icon name="ruler" size={18} stroke="#2E7D5E" />
                </div>
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
                    <label className="block text-[10px] font-medium text-[#8A8A8A] uppercase tracking-wider mb-1">{label}</label>
                    <input
                      type="number"
                      value={formData.measurements[key] || ''}
                      onChange={(e) => handleMeasurementChange(key, e.target.value)}
                      placeholder="cm"
                      className="w-full px-3 py-2.5 border border-[#E5E0D8] rounded-xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] focus:border-transparent transition-shadow text-sm shadow-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-[#0F2B4A]">
              <div className="w-8 h-8 rounded-full bg-[#D4A52A]/10 flex items-center justify-center">
                <Icon name="creditCard" size={18} stroke="#D4A52A" />
              </div>
              <span>Payment</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0F2B4A] mb-1.5">Total price (₦) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-4 py-3.5 border border-[#E5E0D8] rounded-2xl bg-white text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] focus:border-transparent transition-shadow text-base shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0F2B4A] mb-1.5">Deposit (₦)</label>
              <input
                type="number"
                name="amount_paid"
                value={formData.amount_paid}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-4 py-3.5 border border-[#E5E0D8] rounded-2xl bg-white text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] focus:border-transparent transition-shadow text-base shadow-sm"
              />
            </div>

            {formData.price && (
              <div className="bg-gradient-to-br from-[#F8F6F2] to-white rounded-2xl p-5 border border-[#E5E0D8] shadow-sm">
                <div className="flex justify-between text-sm">
                  <span className="text-[#8A8A8A]">Balance</span>
                  <span className="font-bold text-[#0F2B4A] text-lg">
                    {formatCurrency((parseFloat(formData.price) || 0) - (parseFloat(formData.amount_paid) || 0))}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-[#8A8A8A]">Payment status:</span>
                  {!formData.amount_paid || parseFloat(formData.amount_paid) === 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#D9534F]/10 text-[#D9534F] rounded-full font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D9534F]"></span>
                      Unpaid
                    </span>
                  ) : parseFloat(formData.amount_paid) >= parseFloat(formData.price) ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2E7D5E]/10 text-[#2E7D5E] rounded-full font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D5E]"></span>
                      Paid in full
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#D4A52A]/10 text-[#D4A52A] rounded-full font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4A52A]"></span>
                      Partially paid
                    </span>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#0F2B4A] mb-1.5">Current status</label>
              <div className="relative">
                <select
                  name="current_status"
                  value={formData.current_status}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 border border-[#E5E0D8] rounded-2xl bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4A52A] focus:border-transparent transition-shadow appearance-none pr-12 shadow-sm text-base"
                >
                  <option value="Order placed">Order placed</option>
                  <option value="Cutting">Cutting</option>
                  <option value="Sewing">Sewing</option>
                  <option value="Ready">Ready</option>
                  <option value="Delivered">Delivered</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <Icon name="chevronDown" size={16} stroke="#8A8A8A" />
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-[#0F2B4A] text-white rounded-2xl p-6 space-y-2.5 shadow-xl">
              <div className="text-xs uppercase tracking-wider text-white/50 font-semibold">Order summary</div>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Customer</span>
                <span className="font-medium">{formData.customer_name || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Garment</span>
                <span className="font-medium">{formData.title || '—'}</span>
              </div>
              {formData.category && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Category</span>
                  <span className="font-medium">{formData.category}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Quantity</span>
                <span className="font-medium">{formData.quantity || 1}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Total</span>
                <span className="font-medium">{formatCurrency(formData.price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Deposit</span>
                <span className="font-medium">{formatCurrency(formData.amount_paid)}</span>
              </div>
              <div className="flex justify-between border-t border-white/20 pt-2.5 mt-1">
                <span className="text-white/70">Balance</span>
                <span className="font-bold text-[#D4A52A] text-lg">
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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-[#E5E0D8] rounded-2xl mb-2 animate-pulse" />
        <div className="h-4 w-32 bg-[#E5E0D8] rounded mb-8 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-[#E5E0D8] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <div className="text-[#D9534F] bg-[#F1DBD3] p-4 rounded-2xl">{error}</div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-3 bg-[#D4A52A] text-[#0F2B4A] rounded-2xl font-semibold hover:bg-[#C49A24] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F2B4A]">Create a new job</h1>
        <p className="text-sm text-[#8A8A8A] mt-0.5">
          {orderCount} orders used · {getPlanLimits(businessPlan).orders === Infinity ? 'Unlimited' : getPlanLimits(businessPlan).orders} max
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i === step
                  ? 'bg-[#D4A52A] text-[#0F2B4A] shadow-md shadow-[#D4A52A]/30'
                  : i < step
                  ? 'bg-[#2E7D5E] text-white shadow-sm shadow-[#2E7D5E]/20'
                  : 'bg-[#E5E0D8] text-[#8A8A8A]'
              }`}
            >
              {i < step ? <Icon name="check" size={14} stroke="white" /> : i}
            </div>
            {i < 4 && (
              <div className={`w-10 h-0.5 rounded-full ${i < step ? 'bg-[#2E7D5E]' : 'bg-[#E5E0D8]'}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#E5E0D8]">
          {renderStep()}

          {error && (
            <div className="mt-5 text-sm text-[#D9534F] bg-[#F1DBD3] p-4 rounded-2xl">
              {error}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#E5E0D8]">
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="px-5 py-2.5 text-[#0F2B4A] font-medium hover:bg-[#F8F6F2] rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Icon name="chevronLeft" size={16} stroke="#0F2B4A" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-3 bg-[#D4A52A] text-[#0F2B4A] font-semibold rounded-2xl hover:bg-[#C49A24] hover:shadow-lg hover:shadow-[#D4A52A]/30 transition-all flex items-center gap-2"
            >
              Continue
              <Icon name="chevronRight" size={18} stroke="#0F2B4A" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-[#0F2B4A] text-white font-semibold rounded-2xl hover:bg-[#1A3A5A] hover:shadow-lg hover:shadow-[#0F2B4A]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  Create Order & Start Tracking
                  <Icon name="arrowRight" size={18} stroke="white" />
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
                    }
