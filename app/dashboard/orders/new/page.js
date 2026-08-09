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

// ─── Styles ──────────────────────────────────────────────
const styles = {
  container: {
    maxWidth: '640px',
    margin: '0 auto',
    padding: '24px 16px 32px',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: '#1A1A1A',
  },
  header: { marginBottom: '24px' },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#0F2B4A',
    marginBottom: '4px',
  },
  subtitle: { fontSize: '14px', color: '#8A8A8A' },
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '32px',
  },
  stepDot: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    transition: 'all 0.2s',
  },
  stepDotActive: {
    background: '#D4A52A',
    color: '#0F2B4A',
    boxShadow: '0 4px 12px rgba(212,165,42,0.3)',
  },
  stepDotCompleted: {
    background: '#2E7D5E',
    color: 'white',
    boxShadow: '0 2px 8px rgba(46,125,94,0.2)',
  },
  stepDotPending: {
    background: '#E5E0D8',
    color: '#8A8A8A',
  },
  stepLine: {
    width: '32px',
    height: '2px',
    borderRadius: '999px',
  },
  stepLineCompleted: { background: '#2E7D5E' },
  stepLinePending: { background: '#E5E0D8' },
  formCard: {
    background: 'white',
    borderRadius: '24px',
    padding: '24px',
    border: '1px solid #E5E0D8',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0F2B4A',
    marginBottom: '20px',
  },
  stepIconWrapper: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(212,165,42,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: { position: 'relative' },
  searchInput: {
    width: '100%',
    padding: '14px 16px 14px 48px',
    border: '1px solid #E5E0D8',
    borderRadius: '16px',
    fontSize: '16px',
    color: '#1A1A1A',
    background: 'white',
    outline: 'none',
    transition: 'all 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  searchInputFocus: {
    borderColor: '#D4A52A',
    boxShadow: '0 0 0 3px rgba(212,165,42,0.2)',
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  customerGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginTop: '12px',
  },
  customerCard: {
    padding: '12px 16px',
    border: '1px solid #E5E0D8',
    borderRadius: '16px',
    background: 'white',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  customerCardHover: {
    borderColor: '#D4A52A',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  customerName: { fontWeight: '500', color: '#0F2B4A', fontSize: '14px' },
  customerPhone: { fontSize: '12px', color: '#8A8A8A', marginTop: '2px' },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#D4A52A',
    fontWeight: '500',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0',
    fontSize: '14px',
    marginTop: '16px',
    transition: 'color 0.2s',
  },
  addButtonHover: { color: '#B4881E' },
  addIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '2px solid #D4A52A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  newCustomerForm: {
    border: '1px solid #D4A52A',
    borderRadius: '16px',
    padding: '20px',
    background: '#F8F6F2',
    marginTop: '12px',
  },
  newCustomerTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0F2B4A',
    marginBottom: '14px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: '#0F2B4A',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #E5E0D8',
    borderRadius: '12px',
    fontSize: '16px',
    color: '#1A1A1A',
    background: 'white',
    outline: 'none',
    transition: 'all 0.2s',
  },
  inputFocus: {
    borderColor: '#D4A52A',
    boxShadow: '0 0 0 3px rgba(212,165,42,0.15)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '12px',
    padding: '20px',
    background: '#F8F6F2',
    borderRadius: '16px',
    border: '1px solid #E5E0D8',
    marginTop: '16px',
    textAlign: 'center',
  },
  statsLabel: {
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#8A8A8A',
    fontWeight: '600',
  },
  statsValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0F2B4A',
    marginTop: '2px',
  },
  statsValueRed: { color: '#D9534F' },
  fieldGroup: { marginBottom: '20px' },
  select: {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid #E5E0D8',
    borderRadius: '16px',
    fontSize: '16px',
    color: '#1A1A1A',
    background: 'white',
    outline: 'none',
    appearance: 'none',
    transition: 'all 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    cursor: 'pointer',
  },
  selectWrapper: { position: 'relative' },
  selectArrow: {
    position: 'absolute',
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  quantityGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  quantityBtn: {
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #E5E0D8',
    borderRadius: '16px',
    background: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  quantityBtnHover: {
    background: '#F8F6F2',
    borderColor: '#D4A52A',
  },
  quantityValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0F2B4A',
    width: '32px',
    textAlign: 'center',
  },
  textarea: {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid #E5E0D8',
    borderRadius: '16px',
    fontSize: '16px',
    color: '#1A1A1A',
    background: 'white',
    outline: 'none',
    resize: 'vertical',
    minHeight: '80px',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  measurementGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginTop: '4px',
  },
  measurementLabel: {
    display: 'block',
    fontSize: '10px',
    fontWeight: '500',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  measurementInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E5E0D8',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#1A1A1A',
    background: 'white',
    outline: 'none',
    transition: 'all 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  paymentSummary: {
    padding: '20px',
    background: '#F8F6F2',
    borderRadius: '16px',
    border: '1px solid #E5E0D8',
    marginBottom: '20px',
  },
  balanceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  balanceLabel: { color: '#8A8A8A' },
  balanceValue: { fontWeight: '700', color: '#0F2B4A', fontSize: '18px' },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: '500',
    marginTop: '8px',
  },
  statusDot: { width: '6px', height: '6px', borderRadius: '50%' },
  summaryCard: {
    background: '#0F2B4A',
    color: 'white',
    borderRadius: '16px',
    padding: '24px',
    marginTop: '16px',
  },
  summaryTitle: {
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginBottom: '12px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    padding: '4px 0',
  },
  summaryLabel: { color: 'rgba(255,255,255,0.7)' },
  summaryValue: { fontWeight: '500' },
  summaryDivider: {
    borderTop: '1px solid rgba(255,255,255,0.2)',
    margin: '8px 0 4px',
    paddingTop: '10px',
  },
  summaryBalance: { fontWeight: '700', color: '#D4A52A', fontSize: '18px' },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #E5E0D8',
  },
  backBtn: {
    padding: '10px 20px',
    color: '#0F2B4A',
    fontWeight: '500',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '12px',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
  },
  backBtnHover: { background: '#F8F6F2' },
  continueBtn: {
    padding: '12px 24px',
    background: '#D4A52A',
    color: '#0F2B4A',
    fontWeight: '600',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 2px 8px rgba(212,165,42,0.3)',
  },
  continueBtnHover: {
    background: '#C49A24',
    boxShadow: '0 4px 16px rgba(212,165,42,0.4)',
    transform: 'translateY(-1px)',
  },
  createBtn: {
    padding: '12px 32px',
    background: '#0F2B4A',
    color: 'white',
    fontWeight: '600',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 2px 8px rgba(15,43,74,0.3)',
  },
  createBtnHover: {
    background: '#1A3A5A',
    boxShadow: '0 4px 16px rgba(15,43,74,0.4)',
    transform: 'translateY(-1px)',
  },
  createBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    transform: 'none',
  },
  errorBox: {
    padding: '16px',
    background: '#F1DBD3',
    color: '#D9534F',
    borderRadius: '16px',
    fontSize: '14px',
    marginTop: '20px',
  },
  skeleton: {
    padding: '32px 16px',
    maxWidth: '640px',
    margin: '0 auto',
  },
  skeletonBar: {
    height: '32px',
    background: '#E5E0D8',
    borderRadius: '16px',
    marginBottom: '8px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  skeletonBarSmall: {
    height: '16px',
    background: '#E5E0D8',
    borderRadius: '12px',
    marginBottom: '32px',
    width: '50%',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  skeletonField: {
    height: '56px',
    background: '#E5E0D8',
    borderRadius: '16px',
    marginBottom: '16px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  supportLink: {
    marginTop: '20px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#8A8A8A',
  },
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
        if (!user) { router.push('/login'); return; }
        const bizId = getCurrentBusinessId();
        if (!bizId) { router.push('/dashboard'); return; }
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

  // ─── PREVENT ENTER KEY FROM SUBMITTING ──────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  // ─── SUBMIT ──────────────────────────────────────────────
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

  // ─── NAVIGATION ──────────────────────────────────────────
  const nextStep = (e) => {
    if (e) e.preventDefault();
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

  const prevStep = (e) => {
    if (e) e.preventDefault();
    setStep((s) => Math.max(s - 1, 1));
    setError(null);
  };

  // ─── RENDER STEP ────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <div style={styles.stepHeader}>
              <div style={styles.stepIconWrapper}>
                <Icon name="user" size={18} stroke="#D4A52A" />
              </div>
              <span>Who is this order for?</span>
            </div>

    <div style={styles.searchWrapper}>
              <div style={styles.searchIcon}>
                <Icon name="search" size={18} stroke="#8A8A8A" />
              </div>
              <input
                type="text"
                placeholder="Search customers by name or phone"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                style={styles.searchInput}
                onFocus={(e) => e.target.style = { ...styles.searchInput, ...styles.searchInputFocus }}
                onBlur={(e) => e.target.style = styles.searchInput}
              />
            </div>

            {customerSearch ? (
              <div style={{ maxHeight: '256px', overflowY: 'auto', border: '1px solid #E5E0D8', borderRadius: '16px', marginTop: '12px', background: 'white' }}>
                {filteredCustomers.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#8A8A8A' }}>No customers found</div>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCustomerSelect(c.id)}
                      style={{ width: '100%', textAlign: 'left', padding: '14px 20px', borderBottom: '1px solid #E5E0D8', background: 'none', borderLeft: 'none', borderRight: 'none', borderTop: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onMouseEnter={(e) => e.target.style.background = '#F8F6F2'}
                      onMouseLeave={(e) => e.target.style.background = 'white'}
                    >
                      <div>
                        <div style={{ fontWeight: '500', color: '#0F2B4A' }}>{c.name}</div>
                        {c.phone && <div style={{ fontSize: '12px', color: '#8A8A8A' }}>{c.phone}</div>}
                      </div>
                      <Icon name="arrow-right" size={16} stroke="#D4A52A" />
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8A8A8A', fontWeight: '600', marginBottom: '12px' }}>Recent customers</div>
                <div style={styles.customerGrid}>
                  {recentCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCustomerSelect(c.id)}
                      style={styles.customerCard}
                      onMouseEnter={(e) => e.target.style = { ...styles.customerCard, ...styles.customerCardHover }}
                      onMouseLeave={(e) => e.target.style = styles.customerCard}
                    >
                      <div style={styles.customerName}>{c.name}</div>
                      {c.phone && <div style={styles.customerPhone}>{c.phone}</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleNewCustomerToggle}
              style={styles.addButton}
              onMouseEnter={(e) => e.target.style = { ...styles.addButton, ...styles.addButtonHover }}
              onMouseLeave={(e) => e.target.style = styles.addButton}
            >
              <span style={styles.addIcon}>
                <Icon name="plus" size={12} stroke="#D4A52A" />
              </span>
              Add new customer
            </button>

            {showNewCustomer && (
              <div style={styles.newCustomerForm}>
                <div style={styles.newCustomerTitle}>New customer details</div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={styles.label}>Name *</label>
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    style={styles.input}
                    onFocus={(e) => e.target.style = { ...styles.input, ...styles.inputFocus }}
                    onBlur={(e) => e.target.style = styles.input}
                  />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={styles.label}>Phone</label>
                  <input
                    type="tel"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    style={styles.input}
                    onFocus={(e) => e.target.style = { ...styles.input, ...styles.inputFocus }}
                    onBlur={(e) => e.target.style = styles.input}
                  />
                </div>
                <div>
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    name="customer_email"
                    value={formData.customer_email}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    style={styles.input}
                    onFocus={(e) => e.target.style = { ...styles.input, ...styles.inputFocus }}
                    onBlur={(e) => e.target.style = styles.input}
                  />
                </div>
              </div>
            )}

            {formData.customer_id && customerStats && (
              <div style={styles.statsGrid}>
                <div>
                  <div style={styles.statsLabel}>Orders</div>
                  <div style={styles.statsValue}>{customerStats.orderCount}</div>
                </div>
                <div>
                  <div style={styles.statsLabel}>Total spent</div>
                  <div style={styles.statsValue}>{formatCurrency(customerStats.totalSpent)}</div>
                </div>
                <div>
                  <div style={styles.statsLabel}>Outstanding</div>
                  <div style={{ ...styles.statsValue, ...styles.statsValueRed }}>{formatCurrency(customerStats.outstanding)}</div>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div>
            <div style={styles.stepHeader}>
              <div style={styles.stepIconWrapper}>
                <Icon name="scissors" size={18} stroke="#D4A52A" />
              </div>
              <span>What are you making?</span>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Garment name *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Aso-ebi Gown"
                style={styles.input}
                onFocus={(e) => e.target.style = { ...styles.input, ...styles.inputFocus }}
                onBlur={(e) => e.target.style = styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Category</label>
              <div style={styles.selectWrapper}>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  style={styles.select}
                  onFocus={(e) => e.target.style = { ...styles.select, borderColor: '#D4A52A', boxShadow: '0 0 0 3px rgba(212,165,42,0.15)' }}
                  onBlur={(e) => e.target.style = styles.select}
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
                <div style={styles.selectArrow}>
                  <Icon name="arrow-down" size={16} stroke="#8A8A8A" />
                </div>
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Quantity</label>
              <div style={styles.quantityGroup}>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(1, (prev.quantity || 1) - 1) }))}
                  style={styles.quantityBtn}
                  onMouseEnter={(e) => e.target.style = { ...styles.quantityBtn, ...styles.quantityBtnHover }}
                  onMouseLeave={(e) => e.target.style = styles.quantityBtn}
                >
                  <Icon name="minus" size={16} stroke="#0F2B4A" />
                </button>
                <span style={styles.quantityValue}>{formData.quantity || 1}</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, quantity: (prev.quantity || 1) + 1 }))}
                  style={styles.quantityBtn}
                  onMouseEnter={(e) => e.target.style = { ...styles.quantityBtn, ...styles.quantityBtnHover }}
                  onMouseLeave={(e) => e.target.style = styles.quantityBtn}
                >
                  <Icon name="plus" size={16} stroke="#0F2B4A" />
                </button>
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Fabric</label>
              <div style={styles.selectWrapper}>
                <select
                  name="fabric"
                  value={formData.fabric}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  style={styles.select}
                  onFocus={(e) => e.target.style = { ...styles.select, borderColor: '#D4A52A', boxShadow: '0 0 0 3px rgba(212,165,42,0.15)' }}
                  onBlur={(e) => e.target.style = styles.select}
                >
                  <option value="">Select fabric</option>
                  <option value="Customer's fabric">Customer's fabric</option>
                  <option value="In-house fabric">In-house fabric</option>
                  <option value="Other">Other</option>
                </select>
                <div style={styles.selectArrow}>
                  <Icon name="arrow-down" size={16} stroke="#8A8A8A" />
                </div>
              </div>
            </div>

            <div>
              <label style={styles.label}>Style / description</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                rows={3}
                placeholder="Off-shoulder, fitted waist, long sleeve..."
                style={styles.textarea}
                onFocus={(e) => e.target.style = { ...styles.textarea, borderColor: '#D4A52A', boxShadow: '0 0 0 3px rgba(212,165,42,0.15)' }}
                onBlur={(e) => e.target.style = styles.textarea}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <div style={styles.stepHeader}>
              <div style={styles.stepIconWrapper}>
                <Icon name="calendar" size={18} stroke="#D4A52A" />
              </div>
              <span>When does it need to be ready?</span>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Fitting date</label>
              <input
                type="date"
                name="fitting_date"
                value={formData.fitting_date}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                style={styles.input}
                onFocus={(e) => e.target.style = { ...styles.input, ...styles.inputFocus }}
                onBlur={(e) => e.target.style = styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Pickup / delivery date</label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                style={styles.input}
                onFocus={(e) => e.target.style = { ...styles.input, ...styles.inputFocus }}
                onBlur={(e) => e.target.style = styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Event date</label>
              <input
                type="date"
                name="event_date"
                value={formData.event_date}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                style={styles.input}
                onFocus={(e) => e.target.style = { ...styles.input, ...styles.inputFocus }}
                onBlur={(e) => e.target.style = styles.input}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(46,125,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="ruler" size={18} stroke="#2E7D5E" />
                </div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#0F2B4A' }}>Measurements</span>
              </div>
              <div style={styles.measurementGrid}>
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
                    <label style={styles.measurementLabel}>{label}</label>
                    <input
                      type="number"
                      value={formData.measurements[key] || ''}
                      onChange={(e) => handleMeasurementChange(key, e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="cm"
                      style={styles.measurementInput}
                      onFocus={(e) => e.target.style = { ...styles.measurementInput, borderColor: '#D4A52A', boxShadow: '0 0 0 3px rgba(212,165,42,0.15)' }}
                      onBlur={(e) => e.target.style = styles.measurementInput}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

case 4:
        const price = parseFloat(formData.price) || 0;
        const deposit = parseFloat(formData.amount_paid) || 0;
        const balance = price - deposit;
        let paymentStatus = 'Unpaid';
        let statusColor = '#D9534F';
        if (deposit > 0 && deposit < price) {
          paymentStatus = 'Partially paid';
          statusColor = '#D4A52A';
        } else if (deposit >= price && price > 0) {
          paymentStatus = 'Paid in full';
          statusColor = '#2E7D5E';
        }

        return (
          <div>
            <div style={styles.stepHeader}>
              <div style={styles.stepIconWrapper}>
                <Icon name="credit-card" size={18} stroke="#D4A52A" />
              </div>
              <span>Payment</span>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Total price (₦) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="0"
                style={styles.input}
                onFocus={(e) => e.target.style = { ...styles.input, ...styles.inputFocus }}
                onBlur={(e) => e.target.style = styles.input}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Deposit (₦)</label>
              <input
                type="number"
                name="amount_paid"
                value={formData.amount_paid}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="0"
                style={styles.input}
                onFocus={(e) => e.target.style = { ...styles.input, ...styles.inputFocus }}
                onBlur={(e) => e.target.style = styles.input}
              />
            </div>

            {formData.price && (
              <div style={styles.paymentSummary}>
                <div style={styles.balanceRow}>
                  <span style={styles.balanceLabel}>Balance</span>
                  <span style={styles.balanceValue}>{formatCurrency(balance)}</span>
                </div>
                <div style={{ ...styles.statusBadge, background: `${statusColor}15` }}>
                  <span style={{ ...styles.statusDot, background: statusColor }}></span>
                  <span style={{ color: statusColor }}>{paymentStatus}</span>
                </div>
              </div>
            )}

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Current status</label>
              <div style={styles.selectWrapper}>
                <select
                  name="current_status"
                  value={formData.current_status}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  style={styles.select}
                  onFocus={(e) => e.target.style = { ...styles.select, borderColor: '#D4A52A', boxShadow: '0 0 0 3px rgba(212,165,42,0.15)' }}
                  onBlur={(e) => e.target.style = styles.select}
                >
                  <option value="Order placed">Order placed</option>
                  <option value="Cutting">Cutting</option>
                  <option value="Sewing">Sewing</option>
                  <option value="Ready">Ready</option>
                  <option value="Delivered">Delivered</option>
                </select>
                <div style={styles.selectArrow}>
                  <Icon name="arrow-down" size={16} stroke="#8A8A8A" />
                </div>
              </div>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryTitle}>Order summary</div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Customer</span>
                <span style={styles.summaryValue}>{formData.customer_name || '—'}</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Garment</span>
                <span style={styles.summaryValue}>{formData.title || '—'}</span>
              </div>
              {formData.category && (
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Category</span>
                  <span style={styles.summaryValue}>{formData.category}</span>
                </div>
              )}
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Quantity</span>
                <span style={styles.summaryValue}>{formData.quantity || 1}</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Total</span>
                <span style={styles.summaryValue}>{formatCurrency(formData.price)}</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Deposit</span>
                <span style={styles.summaryValue}>{formatCurrency(formData.amount_paid)}</span>
              </div>
              <div style={styles.summaryDivider}>
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Balance</span>
                  <span style={styles.summaryBalance}>{formatCurrency(balance)}</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ─── LOADING ────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.skeleton}>
        <div style={styles.skeletonBar}></div>
        <div style={styles.skeletonBarSmall}></div>
        <div style={styles.skeletonField}></div>
        <div style={styles.skeletonField}></div>
        <div style={styles.skeletonField}></div>
        <div style={styles.skeletonField}></div>
      </div>
    );
  }

  // ─── ERROR ──────────────────────────────────────────────
  if (error && !loading) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 16px', textAlign: 'center' }}>
        <div style={{ color: '#D9534F', background: '#F1DBD3', padding: '16px', borderRadius: '16px' }}>{error}</div>
        <button
          type="button"
          onClick={() => { setError(null); window.location.reload(); }}
          style={{ marginTop: '16px', padding: '12px 24px', background: '#D4A52A', color: '#0F2B4A', border: 'none', borderRadius: '16px', fontWeight: '600', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  // ─── MAIN ──────────────────────────────────────────────
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Create a new job</h1>
        <p style={styles.subtitle}>
          {orderCount} orders used · {getPlanLimits(businessPlan).orders === Infinity ? 'Unlimited' : getPlanLimits(businessPlan).orders} max
        </p>
      </div>

      <div style={styles.stepIndicator}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              ...styles.stepDot,
              ...(i === step ? styles.stepDotActive : i < step ? styles.stepDotCompleted : styles.stepDotPending),
            }}>
              {i < step ? <Icon name="check" size={14} stroke="white" /> : i}
            </div>
            {i < 4 && (
              <div style={{
                ...styles.stepLine,
                ...(i < step ? styles.stepLineCompleted : styles.stepLinePending),
              }} />
            )}
          </div>
        ))}
      </div>

      {/* ─── FORM ──────────────────────────────────────── */}
      <form onSubmit={handleSubmit}>
        <div style={styles.formCard}>
          {renderStep()}
          {error && <div style={styles.errorBox}>{error}</div>}
        </div>

        <div style={styles.nav}>
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              style={styles.backBtn}
              onMouseEnter={(e) => e.target.style = { ...styles.backBtn, ...styles.backBtnHover }}
              onMouseLeave={(e) => e.target.style = styles.backBtn}
            >
              <Icon name="arrow-left" size={16} stroke="#0F2B4A" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              style={styles.continueBtn}
              onMouseEnter={(e) => e.target.style = { ...styles.continueBtn, ...styles.continueBtnHover }}
              onMouseLeave={(e) => e.target.style = styles.continueBtn}
            >
              Continue
              <Icon name="arrow-right" size={18} stroke="#0F2B4A" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving}
              style={{
                ...styles.createBtn,
                ...(saving ? styles.createBtnDisabled : {}),
              }}
              onMouseEnter={(e) => !saving && (e.target.style = { ...styles.createBtn, ...styles.createBtnHover })}
              onMouseLeave={(e) => !saving && (e.target.style = styles.createBtn)}
            >
              {saving ? (
                <>
                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                  Creating...
                </>
              ) : (
                <>
                  Create Order & Start Tracking
                  <Icon name="arrow-right" size={18} stroke="white" />
                </>
              )}
            </button>
          )}
        </div>
      </form>

      <div style={styles.supportLink}>Support</div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
                                                  }
