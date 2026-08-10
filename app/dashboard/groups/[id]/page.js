'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { Icon } from '../../../../components/Icon'
import { isFeatureAvailable, getPlanLimits } from '../../../../lib/planLimits'

const EMPTY_MEMBER = {
  customer_id: '',
  customer_name: '',
  phone: '',
  item: '',
  price: '',
  deposit: '',
  measurements: '',
  due_date: '',
}

const STATUS_OPTIONS = [
  'Order placed',
  'Cutting',
  'Sewing',
  'Ready',
  'Delivered',
]

function splitName(fullName) {
  const value = String(fullName || '').trim()
  const parts = value.split(/\s+/).filter(Boolean)
  return {
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' ') || null,
  }
}

function money(value) {
  const amount = Number(value || 0)
  return `₦${amount.toLocaleString('en-NG')}`
}

function getStatusInfo(status) {
  const map = {
    'Order placed': { label: 'Placed', className: 'placed' },
    Cutting: { label: 'Cutting', className: 'cutting' },
    Sewing: { label: 'Sewing', className: 'sewing' },
    Ready: { label: 'Ready', className: 'ready' },
    Delivered: { label: 'Delivered', className: 'delivered' },
  }
  return map[status] || { label: status || 'Placed', className: 'placed' }
}

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const groupId = params?.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [customers, setCustomers] = useState([])
  const [businessId, setBusinessId] = useState(null)
  const [businessPlan, setBusinessPlan] = useState('free')
  const [maxMembers, setMaxMembers] = useState(0)
  const [canManage, setCanManage] = useState(false)

  const [showMemberModal, setShowMemberModal] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState(null)
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER)

  const requestedBusinessId = searchParams.get('business_id')

  const loadData = useCallback(async () => {
    if (!groupId) return

    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const bizId = requestedBusinessId || getCurrentBusinessId()

      if (!bizId) {
        router.push('/dashboard')
        return
      }

      setBusinessId(bizId)

      const [{ data: bizData, error: bizError }, { data: groupData, error: groupError }] =
        await Promise.all([
          supabase
            .from('businesses')
            .select('id, plan, sector')
            .eq('id', bizId)
            .single(),
          supabase
            .from('group_orders')
            .select('*')
            .eq('id', groupId)
            .eq('business_id', bizId)
            .single(),
        ])

      if (bizError) throw bizError
      if (groupError) throw groupError

      const plan = bizData?.plan || 'free'
      setBusinessPlan(plan)
      setCanManage(isFeatureAvailable(plan, 'groups'))

      const limits = getPlanLimits(plan)
      setMaxMembers(limits?.maxGroupMembers || 0)

      setGroup(groupData)

      const [{ data: memberData, error: memberError }, { data: customerData, error: customerError }] =
        await Promise.all([
          supabase
            .from('orders')
            .select(`
              *,
              customer:customer_id (
                id,
                name,
                first_name,
                last_name,
                phone
              )
            `)
            .eq('group_order_id', groupId)
            .eq('business_id', bizId)
            .order('created_at', { ascending: false }),
          supabase
            .from('customers')
            .select('id, name, first_name, last_name, phone')
            .eq('business_id', bizId)
            .order('first_name', { ascending: true }),
        ])

      if (memberError) throw memberError
      if (customerError) {
        console.warn('Customer list warning:', customerError)
      }

      setMembers(memberData || [])
      setCustomers(customerData || [])
    } catch (err) {
      console.error('Error loading group:', err)
      setError(err?.message || 'Failed to load group details.')
    } finally {
      setLoading(false)
    }
  }, [groupId, requestedBusinessId, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const customerLabel = (customer) => {
    if (!customer) return 'Unknown'
    if (customer.name) return customer.name
    return [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Unknown'
  }

  const closeModal = () => {
    if (!saving) {
      setShowMemberModal(false)
      setEditingMemberId(null)
      setMemberForm(EMPTY_MEMBER)
    }
  }

  const openAddMember = () => {
    setError('')
    setEditingMemberId(null)
    setMemberForm(EMPTY_MEMBER)
    setShowMemberModal(true)
  }

  const openEditMember = (member) => {
    setError('')
    setEditingMemberId(member.id)
    setMemberForm({
      customer_id: member.customer_id || '',
      customer_name: customerLabel(member.customer),
      phone: member.customer?.phone || '',
      item: member.title || '',
      price: String(member.price ?? ''),
      deposit: String(member.amount_paid ?? ''),
      measurements: member.measurements?.notes || '',
      due_date: member.due_date || '',
    })
    setShowMemberModal(true)
  }

  const handleMemberChange = (event) => {
    const { name, value } = event.target
    setMemberForm((current) => ({ ...current, [name]: value }))

    if (name === 'customer_id' && value) {
      const customer = customers.find((item) => item.id === value)
      if (customer) {
        setMemberForm((current) => ({
          ...current,
          customer_id: value,
          customer_name: customerLabel(customer),
          phone: customer.phone || '',
        }))
      }
    }
  }

  const findOrCreateCustomer = async () => {
    const name = memberForm.customer_name.trim()
    const phone = memberForm.phone.trim()

    if (!name) throw new Error('Customer name is required.')

    if (memberForm.customer_id) {
      return memberForm.customer_id
    }

    // Prefer an exact phone match when available.
    if (phone) {
      const { data: byPhone, error: phoneError } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', businessId)
        .eq('phone', phone)
        .maybeSingle()

      if (phoneError) throw phoneError
      if (byPhone) return byPhone.id
    }

    // Split name into first_name and last_name
    const { first_name, last_name } = splitName(name)

    // Check if customer already exists by name
    let existingQuery = supabase
      .from('customers')
      .select('id')
      .eq('business_id', businessId)
      .eq('first_name', first_name)

    if (last_name) {
      existingQuery = existingQuery.eq('last_name', last_name)
    }

    const { data: existing, error: existingError } = await existingQuery.maybeSingle()

    if (existingError) throw existingError
    if (existing) return existing.id

    // Create new customer with first_name and last_name
    const customerPayload = {
      business_id: businessId,
      first_name: first_name,
      last_name: last_name || null,
      phone: phone || null,
    }

    // Also include name if the column exists (it's a fallback)
    let { data: created, error: createError } = await supabase
      .from('customers')
      .insert({
        ...customerPayload,
        name: name,
      })
      .select('id')
      .single()

    if (createError) {
      const message = String(createError.message || '').toLowerCase()
      const unknownNameColumn =
        message.includes('column') && message.includes('name') && message.includes('does not exist')

      if (!unknownNameColumn) throw createError

      // Fallback: insert without the 'name' column
      const fallback = await supabase
        .from('customers')
        .insert(customerPayload)
        .select('id')
        .single()

      created = fallback.data
      createError = fallback.error
    }

    if (createError) throw createError
    if (!created?.id) throw new Error('Customer was created but no customer ID was returned.')

    return created.id
  }

  const saveMember = async (event) => {
    event?.preventDefault()
    setError('')

    const name = memberForm.customer_name.trim()
    const item = memberForm.item.trim()
    const price = Number(memberForm.price)

    if (!name || !item || !Number.isFinite(price) || price < 0) {
      setError('Customer name, item, and a valid price are required.')
      return
    }

    if (!editingMemberId && maxMembers > 0 && members.length >= maxMembers) {
      setError(`Your current plan allows up to ${maxMembers} group members.`)
      return
    }

    setSaving(true)

    try {
      const customerId = await findOrCreateCustomer()

      const payload = {
        business_id: businessId,
        group_order_id: groupId,
        customer_id: customerId,
        title: item,
        price,
        amount_paid: Number(memberForm.deposit) || 0,
        due_date: memberForm.due_date || null,
        current_status: editingMemberId ? undefined : 'Order placed',
        measurements: memberForm.measurements.trim()
          ? { notes: memberForm.measurements.trim() }
          : null,
      }

      if (editingMemberId) {
        delete payload.current_status

        const { error: updateError } = await supabase
          .from('orders')
          .update(payload)
          .eq('id', editingMemberId)
          .eq('business_id', businessId)
          .eq('group_order_id', groupId)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('orders')
          .insert(payload)

        if (insertError) throw insertError
      }

      closeModal()
      await loadData()
    } catch (err) {
      console.error('Save group member error:', err)
      setError(err?.message || 'Failed to save group member.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMember = async (orderId) => {
    if (!canManage) return
    if (!window.confirm('Remove this member from the group? The customer and order will not be deleted.')) return

    setError('')

    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ group_order_id: null })
        .eq('id', orderId)
        .eq('business_id', businessId)
        .eq('group_order_id', groupId)

      if (updateError) throw updateError
      await loadData()
    } catch (err) {
      console.error('Remove member error:', err)
      setError(err?.message || 'Failed to remove member.')
    }
  }

  const handleStatusChange = async (orderId, status) => {
    if (!canManage) return

    const { error: updateError } = await supabase
      .from('orders')
      .update({ current_status: status })
      .eq('id', orderId)
      .eq('business_id', businessId)
      .eq('group_order_id', groupId)

    if (updateError) {
      setError(updateError.message || 'Failed to update status.')
      return
    }

    setMembers((current) =>
      current.map((member) =>
        member.id === orderId ? { ...member, current_status: status } : member
      )
    )
  }

  const stats = useMemo(() => {
    const total = members.reduce((sum, member) => sum + Number(member.price || 0), 0)
    const paid = members.reduce((sum, member) => sum + Number(member.amount_paid || 0), 0)
    const delivered = members.filter((member) => member.current_status === 'Delivered').length
    const ready = members.filter((member) => member.current_status === 'Ready').length
    const balance = Math.max(total - paid, 0)

    return {
      count: members.length,
      total,
      paid,
      balance,
      delivered,
      ready,
      progress: members.length ? Math.round((delivered / members.length) * 100) : 0,
    }
  }, [members])

  if (loading) {
    return (
      <div className="group-page">
        <div className="group-skeleton-title" />
        <div className="group-skeleton-grid">
          <div />
          <div />
          <div />
          <div />
        </div>
        <div className="group-skeleton-table" />
        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </div>
    )
  }

  if (error && !group) {
    return (
      <div className="group-page group-error-page">
        <div className="group-error-card">
          <h2>Unable to load group</h2>
          <p>{error}</p>
          <button className="group-button accent" onClick={() => loadData()}>
            Try again
          </button>
        </div>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </div>
    )
  }

  if (!group) return null

  return (
    <div className="group-page">
      <header className="group-header">
        <div className="group-header-left">
          <button className="group-back" onClick={() => router.back()} aria-label="Go back">
            <Icon name="arrow-left" size={17} />
          </button>
          <div>
            <div className="group-eyebrow">GROUP ORDER</div>
            <h1>{group.group_name}</h1>
            <p>
              {group.coordinator?.name
                ? `Coordinator: ${group.coordinator.name}`
                : 'No coordinator assigned'}
              {group.due_date
                ? ` · Due ${new Date(group.due_date).toLocaleDateString('en-GB')}`
                : ''}
            </p>
          </div>
        </div>

        <div className="group-header-actions">
          {canManage && (
            <button className="group-button secondary" onClick={() => openAddMember()}>
              <Icon name="plus" size={15} />
              Add member
            </button>
          )}
          <button
            className="group-button accent"
            onClick={() =>
              router.push(`/dashboard/groups/${groupId}/edit?business_id=${businessId}`)
            }
          >
            <Icon name="edit-2" size={15} />
            Edit group
          </button>
        </div>
      </header>

      {error && (
        <div className="group-alert">
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss error">×</button>
        </div>
      )}

      <section className="group-summary">
        <div className="summary-main">
          <div className="summary-label">GROUP COLLECTION</div>
          <div className="summary-amount">{money(stats.total)}</div>
          <div className="summary-sub">
            {money(stats.paid)} collected · {money(stats.balance)} outstanding
          </div>
        </div>

        <div className="summary-progress">
          <div className="progress-top">
            <span>Delivery progress</span>
            <strong>{stats.progress}%</strong>
          </div>
          <div className="progress-track">
            <div style={{ width: `${stats.progress}%` }} />
          </div>
          <small>
            {stats.delivered} of {stats.count} delivered
            {stats.ready ? ` · ${stats.ready} ready` : ''}
          </small>
        </div>
      </section>

      <section className="group-metrics">
        <Metric label="Members" value={stats.count} />
        <Metric label="Paid" value={money(stats.paid)} />
        <Metric label="Outstanding" value={money(stats.balance)} danger={stats.balance > 0} />
        <Metric label="Delivered" value={`${stats.delivered}/${stats.count}`} />
      </section>

      <section className="group-card">
        <div className="group-card-header">
          <div>
            <h2>Members</h2>
            <p>Each member is an individual order inside this group.</p>
          </div>
          {canManage && (
            <button className="group-button accent small" onClick={openAddMember}>
              <Icon name="plus" size={14} />
              Add member
            </button>
          )}
        </div>

        {members.length === 0 ? (
          <div className="group-empty">
            <div className="empty-icon">+</div>
            <h3>No members yet</h3>
            <p>Add the first person in this group to start tracking their order.</p>
            {canManage && (
              <button className="group-button accent" onClick={openAddMember}>
                Add first member
              </button>
            )}
          </div>
        ) : (
          <div className="group-table-wrap">
            <table className="group-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Order</th>
                  <th>Due</th>
                  <th>Total</th>
                  <th>Balance</th>
                  <th>Status</th>
                  {canManage && <th aria-label="Actions" />}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const total = Number(member.price || 0)
                  const paid = Number(member.amount_paid || 0)
                  const balance = Math.max(total - paid, 0)
                  const status = getStatusInfo(member.current_status)

                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="member-name">{customerLabel(member.customer)}</div>
                        {member.customer?.phone && (
                          <div className="member-phone">{member.customer.phone}</div>
                        )}
                      </td>
                      <td>
                        <div className="order-title">{member.title || 'Untitled order'}</div>
                        {member.measurements?.notes && (
                          <div className="order-note">{member.measurements.notes}</div>
                        )}
                      </td>
                      <td>
                        {member.due_date
                          ? new Date(member.due_date).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      <td>{money(total)}</td>
                      <td className={balance > 0 ? 'balance-due' : 'balance-paid'}>
                        {balance > 0 ? money(balance) : 'Paid'}
                      </td>
                      <td>
                        {canManage ? (
                          <select
                            className={`status-select ${status.className}`}
                            value={member.current_status || 'Order placed'}
                            onChange={(event) =>
                              handleStatusChange(member.id, event.target.value)
                            }
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`status-pill ${status.className}`}>{status.label}</span>
                        )}
                      </td>
                         {canManage && (
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-button"
                              onClick={() => openEditMember(member)}
                              title="Edit member"
                            >
                              <Icon name="edit-2" size={14} />
                            </button>
                            <button
                              className="icon-button danger"
                              onClick={() => handleDeleteMember(member.id)}
                              title="Remove member"
                            >
                              <Icon name="trash-2" size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="group-footer">
        <span>Plan: {businessPlan}</span>
        {maxMembers > 0 && <span> · Limit: {maxMembers} members</span>}
      </footer>

      {showMemberModal && (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <div className="member-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="group-eyebrow">GROUP MEMBER</div>
                <h2>{editingMemberId ? 'Edit member' : 'Add member'}</h2>
                <p>Create or update the individual order.</p>
              </div>
              <button className="modal-close" onClick={closeModal} disabled={saving}>×</button>
            </div>

            <form onSubmit={saveMember}>
              <div className="form-grid">
                <div className="field full">
                  <label>Existing customer</label>
                  <select
                    name="customer_id"
                    value={memberForm.customer_id}
                    onChange={handleMemberChange}
                    disabled={saving}
                  >
                    <option value="">New customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customerLabel(customer)}
                        {customer.phone ? ` · ${customer.phone}` : ''}
                      </option>
                    ))}
                  </select>
                  <small>Select a customer to reuse their existing record, or leave as New customer.</small>
                </div>

                <div className="field">
                  <label>Customer name *</label>
                  <input
                    name="customer_name"
                    value={memberForm.customer_name}
                    onChange={handleMemberChange}
                    placeholder="e.g. Amaka Okafor"
                    required
                    disabled={saving || Boolean(memberForm.customer_id)}
                  />
                </div>

                <div className="field">
                  <label>Phone</label>
                  <input
                    name="phone"
                    value={memberForm.phone}
                    onChange={handleMemberChange}
                    placeholder="080..."
                    disabled={saving || Boolean(memberForm.customer_id)}
                  />
                </div>

                <div className="field full">
                  <label>Item / garment *</label>
                  <input
                    name="item"
                    value={memberForm.item}
                    onChange={handleMemberChange}
                    placeholder="e.g. Aso Ebi blouse and wrapper"
                    required
                    disabled={saving}
                  />
                </div>

                <div className="field">
                  <label>Price (₦) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="price"
                    value={memberForm.price}
                    onChange={handleMemberChange}
                    placeholder="0"
                    required
                    disabled={saving}
                  />
                </div>

                <div className="field">
                  <label>Deposit (₦)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="deposit"
                    value={memberForm.deposit}
                    onChange={handleMemberChange}
                    placeholder="0"
                    disabled={saving}
                  />
                </div>

                <div className="field">
                  <label>Due date</label>
                  <input
                    type="date"
                    name="due_date"
                    value={memberForm.due_date}
                    onChange={handleMemberChange}
                    disabled={saving}
                  />
                </div>

                <div className="field">
                  <label>Measurements / fitting notes</label>
                  <input
                    name="measurements"
                    value={memberForm.measurements}
                    onChange={handleMemberChange}
                    placeholder="Optional"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="group-button secondary" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="group-button accent" disabled={saving}>
                  {saving ? 'Saving…' : editingMemberId ? 'Save changes' : 'Add member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </div>
  )
}

function Metric({ label, value, danger = false }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong className={danger ? 'metric-danger' : ''}>{value}</strong>
    </div>
  )
}

const styles = `
  .group-page {
    --ink: var(--color-text, #172033);
    --muted: var(--color-text-muted, #697386);
    --line: var(--color-border, #e5e7eb);
    --card: var(--color-card, #fff);
    --bg: var(--color-bg, #f7f7f5);
    --accent: var(--color-accent, #d8b24c);
    min-height: 100vh;
    padding: 28px;
    color: var(--ink);
    background: var(--bg);
  }

  .group-header {
    max-width: 1180px;
    margin: 0 auto 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .group-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .group-back {
    width: 38px;
    height: 38px;
    border: 1px solid var(--line);
    background: var(--card);
    border-radius: 10px;
    cursor: pointer;
    display: grid;
    place-items: center;
    color: var(--ink);
    flex: 0 0 auto;
          }

.group-eyebrow {
    font-size: 10px;
    letter-spacing: .12em;
    font-weight: 800;
    color: var(--muted);
    margin-bottom: 5px;
  }

  .group-header h1 {
    margin: 0;
    font-size: 25px;
    letter-spacing: -.025em;
    line-height: 1.15;
  }

  .group-header p {
    margin: 7px 0 0;
    color: var(--muted);
    font-size: 13px;
  }

  .group-header-actions, .row-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .group-button {
    border: 1px solid var(--line);
    border-radius: 9px;
    padding: 9px 13px;
    background: var(--card);
    color: var(--ink);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-weight: 700;
    font-size: 13px;
    transition: transform .12s ease, opacity .12s ease;
  }

  .group-button:hover { transform: translateY(-1px); }
  .group-button:disabled { opacity: .55; cursor: not-allowed; transform: none; }
  .group-button.accent { background: var(--accent); border-color: var(--accent); color: #172033; }
  .group-button.small { padding: 7px 10px; font-size: 12px; }
  .group-button.secondary { background: var(--card); }

  .group-summary, .group-metrics, .group-card, .group-footer {
    max-width: 1180px;
    margin-left: auto;
    margin-right: auto;
  }

  .group-summary {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(300px, .85fr);
    gap: 24px;
    padding: 24px;
    background: #16283d;
    color: white;
    border-radius: 18px;
    box-shadow: 0 12px 30px rgba(18, 35, 53, .12);
  }

  .summary-label {
    font-size: 10px;
    letter-spacing: .12em;
    opacity: .65;
    font-weight: 800;
  }

  .summary-amount {
    margin-top: 6px;
    font-size: 31px;
    font-weight: 800;
    letter-spacing: -.03em;
  }

  .summary-sub {
    margin-top: 4px;
    color: rgba(255,255,255,.68);
    font-size: 12px;
  }

  .summary-progress {
    align-self: center;
    padding: 4px 0;
  }

  .progress-top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    margin-bottom: 8px;
  }

  .progress-track {
    height: 8px;
    border-radius: 99px;
    overflow: hidden;
    background: rgba(255,255,255,.16);
  }

  .progress-track div {
    height: 100%;
    border-radius: inherit;
    background: var(--accent);
    transition: width .25s ease;
  }

  .summary-progress small {
    display: block;
    margin-top: 7px;
    color: rgba(255,255,255,.62);
    font-size: 11px;
  }

  .group-metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-top: 12px;
    margin-bottom: 18px;
  }

  .metric {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 13px 15px;
  }

  .metric span {
    display: block;
    color: var(--muted);
    font-size: 11px;
    margin-bottom: 4px;
  }

  .metric strong {
    font-size: 16px;
  }

  .metric-danger, .balance-due { color: #b44b45; }
  .balance-paid { color: #2f7659; font-weight: 700; }

  .group-card {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 16px;
    overflow: hidden;
  }

  .group-card-header {
    padding: 18px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    border-bottom: 1px solid var(--line);
  }

  .group-card-header h2 {
    margin: 0;
    font-size: 16px;
  }

  .group-card-header p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 11px;
  }

  .group-table-wrap { overflow-x: auto; }
  .group-table { width: 100%; border-collapse: collapse; min-width: 760px; font-size: 12px; }
  .group-table th {
    padding: 11px 14px;
    text-align: left;
    background: var(--bg);
    color: var(--muted);
    font-size: 10px;
    letter-spacing: .04em;
    text-transform: uppercase;
    font-weight: 800;
    white-space: nowrap;
  }
  .group-table td {
    padding: 13px 14px;
    border-top: 1px solid var(--line);
    vertical-align: middle;
  }

  .member-name, .order-title { font-weight: 700; }
  .member-phone, .order-note { color: var(--muted); font-size: 10px; margin-top: 3px; }
  .order-note { max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .status-pill, .status-select {
    border-radius: 999px;
    font-size: 10px;
    font-weight: 800;
  }

  .status-pill {
    display: inline-block;
    padding: 5px 9px;
  }

  .status-select {
    padding: 5px 24px 5px 8px;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--ink);
    cursor: pointer;
  }

  .placed { color: #655e55; background: #eeeae3; }
  .cutting { color: #8a6814; background: #f7e9bd; }
  .sewing { color: #315578; background: #dce7f1; }
  .ready { color: #2f7659; background: #dcece3; }
  .delivered { color: #625a50; background: #e7e0d7; }

  .icon-button {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border: 1px solid var(--line);
    background: var(--card);
    color: var(--muted);
    border-radius: 8px;
    cursor: pointer;
  }
  .icon-button.danger { color: #b44b45; }

    .group-empty {
    padding: 58px 20px;
    text-align: center;
  }

  .empty-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    margin: 0 auto 10px;
    background: var(--bg);
    color: var(--muted);
    font-size: 22px;
  }

  .group-empty h3 { margin: 0; font-size: 15px; }
  .group-empty p { color: var(--muted); font-size: 12px; margin: 5px 0 15px; }

  .group-footer {
    padding: 12px 2px 30px;
    color: var(--muted);
    font-size: 10px;
  }

  .group-alert {
    max-width: 1180px;
    margin: 0 auto 14px;
    padding: 11px 13px;
    border: 1px solid #efc4c1;
    background: #fff5f4;
    color: #9f403b;
    border-radius: 10px;
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 12px;
  }

  .group-alert button {
    border: 0;
    background: transparent;
    cursor: pointer;
    color: inherit;
    font-size: 18px;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    padding: 20px;
    display: grid;
    place-items: center;
    background: rgba(8, 17, 28, .52);
    backdrop-filter: blur(5px);
  }

  .member-modal {
    width: min(620px, 100%);
    max-height: calc(100vh - 40px);
    overflow-y: auto;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow: 0 24px 80px rgba(0,0,0,.22);
  }

  .modal-header {
    padding: 20px 20px 16px;
    display: flex;
    justify-content: space-between;
    gap: 15px;
    border-bottom: 1px solid var(--line);
  }

  .modal-header h2 { margin: 0; font-size: 20px; }
  .modal-header p { margin: 5px 0 0; color: var(--muted); font-size: 11px; }
  .modal-close {
    width: 32px;
    height: 32px;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: var(--bg);
    cursor: pointer;
    font-size: 20px;
    color: var(--muted);
  }

  .member-modal form { padding: 20px; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
  .field.full { grid-column: 1 / -1; }
  .field label { display: block; font-size: 11px; font-weight: 800; margin-bottom: 5px; }
  .field small { display: block; color: var(--muted); font-size: 9px; margin-top: 5px; }
  .field input, .field select {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 11px;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: var(--bg);
    color: var(--ink);
    outline: none;
    font: inherit;
    font-size: 12px;
  }
  .field input:focus, .field select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(216,178,76,.12); }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 18px;
    margin-top: 18px;
    border-top: 1px solid var(--line);
  }

  .group-error-page { display: grid; place-items: center; }
  .group-error-card { max-width: 450px; padding: 30px; text-align: center; background: var(--card); border: 1px solid var(--line); border-radius: 16px; }
  .group-error-card h2 { margin: 0 0 8px; }
  .group-error-card p { color: var(--muted); font-size: 12px; margin-bottom: 18px; }

  .group-skeleton-title { width: 280px; height: 28px; background: var(--line); border-radius: 8px; margin: 10px auto 20px; opacity: .6; }
  .group-skeleton-grid { max-width: 1180px; margin: auto; display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
  .group-skeleton-grid div, .group-skeleton-table { background: var(--line); border-radius: 12px; opacity: .45; animation: pulse 1.2s infinite; }
  .group-skeleton-grid div { height: 72px; }
  .group-skeleton-table { max-width: 1180px; height: 300px; margin: 18px auto; }
  @keyframes pulse { 0%,100% { opacity:.3 } 50% { opacity:.6 } }

  @media (max-width: 760px) {
    .group-page { padding: 16px; }
    .group-header { align-items: flex-start; }
    .group-header, .group-header-left { flex-direction: column; }
    .group-header-left { flex-direction: row; width: 100%; }
    .group-header-actions { width: 100%; }
    .group-header-actions .group-button { flex: 1; }
    .group-summary { grid-template-columns: 1fr; }
    .group-metrics { grid-template-columns: 1fr 1fr; }
    <style>{`
    .form-grid { grid-template-columns: 1fr; }
    .field.full { grid-column: auto; }
`}</style>
    </div>
  )
}
