'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'
import { getCurrentBusinessId } from '../../../../lib/getBusinessId'
import { isFeatureAvailable, getPlanLimits } from '../../../../lib/planLimits'
import { Icon } from '../../../../components/Icon'

const STEPS = [
  {
    id: 1,
    label: 'Group details',
    description: 'Set up the group'
  },
  {
    id: 2,
    label: 'Members',
    description: 'Add everyone'
  },
  {
    id: 3,
    label: 'Review',
    description: 'Confirm and create'
  }
]

const EMPTY_MEMBER = {
  customerId: '',
  name: '',
  phone: '',
  item: '',
  price: '',
  deposit: '',
  dueDate: '',
  measurements: '',
  notes: ''
}

export default function NewGroupPage() {
  const router = useRouter()

  // ─────────────────────────────────────────────
  // PAGE STATE
  // ─────────────────────────────────────────────

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [business, setBusiness] = useState(null)
  const [businessId, setBusinessId] = useState(null)
  const [customers, setCustomers] = useState([])

  const [step, setStep] = useState(1)

  // ─────────────────────────────────────────────
  // GROUP DETAILS
  // ─────────────────────────────────────────────

  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [coordinatorId, setCoordinatorId] = useState('')
  const [groupDueDate, setGroupDueDate] = useState('')

  // ─────────────────────────────────────────────
  // MEMBERS
  // ─────────────────────────────────────────────

  const [members, setMembers] = useState([])
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER)

  // ─────────────────────────────────────────────
  // LOAD BUSINESS
  // ─────────────────────────────────────────────

  useEffect(() => {
    let mounted = true

    const loadPage = async () => {
      try {
        setLoading(true)
        setError('')

        const {
          data: { user }
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const id = getCurrentBusinessId()

        if (!id) {
          router.push('/dashboard')
          return
        }

        if (!mounted) return

        setBusinessId(id)

        const { data: businessData, error: businessError } =
          await supabase
            .from('businesses')
            .select('id, name, sector, plan')
            .eq('id', id)
            .single()

        if (businessError || !businessData) {
          throw new Error('Business information could not be loaded.')
        }

        if (!mounted) return

        const isFashion =
          businessData.sector === 'Fashion & Custom Wear'

        const groupsEnabled = isFeatureAvailable(
          businessData.plan || 'free',
          'groups'
        )

        if (!isFashion) {
          throw new Error(
            'Group orders are currently available for Fashion & Custom Wear businesses.'
          )
        }

        if (!groupsEnabled) {
          throw new Error(
            'Group orders are not available on your current plan.'
          )
        }

        setBusiness(businessData)

        const { data: customerData, error: customerError } =
          await supabase
            .from('customers')
            .select('id, name, phone, measurements')
            .eq('business_id', id)
            .order('name', { ascending: true })

        if (customerError) {
          throw customerError
        }

        if (!mounted) return

        setCustomers(customerData || [])
      } catch (err) {
        console.error('New group page error:', err)

        if (mounted) {
          setError(
            err?.message || 'Unable to load group order setup.'
          )
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadPage()

    return () => {
      mounted = false
    }
  }, [router])

  // ─────────────────────────────────────────────
  // PLAN LIMIT
  // ─────────────────────────────────────────────

  const maxMembers = useMemo(() => {
    if (!business) return 0

    const limits = getPlanLimits(
      business.plan || 'free'
    )

    return limits?.maxGroupMembers || 0
  }, [business])

  // ─────────────────────────────────────────────
  // GROUP TOTALS
  // ─────────────────────────────────────────────

  const totals = useMemo(() => {
    const total = members.reduce(
      (sum, member) =>
        sum + (Number(member.price) || 0),
      0
    )

    const deposits = members.reduce(
      (sum, member) =>
        sum + (Number(member.deposit) || 0),
      0
    )

    return {
      total,
      deposits,
      balance: Math.max(total - deposits, 0)
    }
  }, [members])

  // ─────────────────────────────────────────────
  // MEMBER HELPERS
  // ─────────────────────────────────────────────

  const resetMemberForm = () => {
    setMemberForm({
      ...EMPTY_MEMBER,
      dueDate: groupDueDate || ''
    })
    setEditingIndex(null)
  }

  const openAddMember = () => {
    resetMemberForm()
    setMemberModalOpen(true)
    setError('')
  }

  const openEditMember = (index) => {
    const member = members[index]

    setEditingIndex(index)

    setMemberForm({
      ...EMPTY_MEMBER,
      ...member
    })

    setMemberModalOpen(true)
    setError('')
  }

  const closeMemberModal = () => {
    setMemberModalOpen(false)
    setEditingIndex(null)
    setMemberForm(EMPTY_MEMBER)
  }

  const updateMemberField = (field, value) => {
    setMemberForm((current) => ({
      ...current,
      [field]: value
    }))
  }

  // ─────────────────────────────────────────────
  // SELECT EXISTING CUSTOMER
  // ─────────────────────────────────────────────

  const selectExistingCustomer = (customerId) => {
    const selected = customers.find(
      (customer) => customer.id === customerId
    )

    if (!selected) {
      updateMemberField('customerId', '')
      return
    }

    setMemberForm((current) => ({
      ...current,
      customerId: selected.id,
      name: selected.name || '',
      phone: selected.phone || ''
    }))
  }

  // ─────────────────────────────────────────────
  // ADD / UPDATE MEMBER
  // ─────────────────────────────────────────────

  const saveMember = () => {
    const name = memberForm.name.trim()
    const item = memberForm.item.trim()
    const price = Number(memberForm.price)

    if (!name) {
      setError('Please enter the member name.')
      return
    }

    if (!item) {
      setError('Please enter what this member is ordering.')
      return
    }

    if (!Number.isFinite(price) || price <= 0) {
      setError('Please enter a valid price.')
      return
    }

    const deposit = Number(memberForm.deposit) || 0

    if (deposit > price) {
      setError('Deposit cannot be greater than the item price.')
      return
    }

    const cleanedMember = {
      ...memberForm,
      name,
      item,
      price: String(price),
      deposit: String(deposit)
    }

    if (editingIndex !== null) {
      setMembers((current) =>
        current.map((member, index) =>
          index === editingIndex
            ? cleanedMember
            : member
        )
      )
    } else {
      setMembers((current) => [
        ...current,
        cleanedMember
      ])
    }

    closeMemberModal()
    setError('')
  }

  const removeMember = (index) => {
    const member = members[index]

    if (!member) return

    const confirmed = window.confirm(
      `Remove ${member.name} from this group?`
    )

    if (!confirmed) return

    setMembers((current) =>
      current.filter((_, i) => i !== index)
    )
  }

  // ─────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────

  const goToStep = (nextStep) => {
    setError('')

    if (nextStep === 2 && !groupName.trim()) {
      setError('Give this group a name before continuing.')
      return
    }

    if (nextStep === 3 && members.length === 0) {
      setError('Add at least one member before reviewing the group.')
      return
    }

    setStep(nextStep)
  }

  const handleNext = () => {
    if (step === 1) {
      goToStep(2)
      return
    }

    if (step === 2) {
      goToStep(3)
    }
  }

  const handleBack = () => {
    setError('')

    if (step > 1) {
      setStep((current) => current - 1)
      return
    }

    router.back()
  }

  // ─────────────────────────────────────────────
  // CREATE GROUP
  // ─────────────────────────────────────────────

  const handleCreateGroup = async () => {
    if (!businessId || !business) {
      setError('Business information is missing.')
      return
    }

    if (!groupName.trim()) {
      setError('Please enter a group name.')
      setStep(1)
      return
    }

    if (members.length === 0) {
      setError('Please add at least one member.')
      setStep(2)
      return
    }

    if (
      maxMembers > 0 &&
      members.length > maxMembers
    ) {
      setError(
        `Your plan allows a maximum of ${maxMembers} members per group.`
      )
      setStep(2)
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Group creation continues in the next section.
      // No database records are created before this point.
          // ─────────────────────────────────────────────
      // 1. CREATE GROUP HEADER
      // ─────────────────────────────────────────────

      const { data: group, error: groupError } =
        await supabase
          .from('group_orders')
          .insert({
            business_id: businessId,
            group_name: groupName.trim(),
            coordinator_customer_id:
              coordinatorId || null,
            due_date: groupDueDate || null,
            status: 'pending'
          })
          .select()
          .single()

      if (groupError) {
        throw groupError
      }

      if (!group?.id) {
        throw new Error(
          'The group was created but no group ID was returned.'
        )
      }

      // ─────────────────────────────────────────────
      // 2. CREATE / FIND CUSTOMERS
      // ─────────────────────────────────────────────

      for (const member of members) {
        let customerId = member.customerId || null

        // Existing customer selected
        if (!customerId) {
          const normalizedName =
            member.name.trim()

          const normalizedPhone =
            member.phone
              ?.replace(/\D/g, '')
              .trim() || ''

          // Try phone first because names are not unique.
          if (normalizedPhone) {
            const { data: existingByPhone } =
              await supabase
                .from('customers')
                .select('id')
                .eq('business_id', businessId)
                .eq('phone', normalizedPhone)
                .maybeSingle()

            if (existingByPhone) {
              customerId = existingByPhone.id
            }
          }

          // If no phone match, don't silently attach
          // somebody with the same name.
          if (!customerId) {
            const { data: newCustomer, error: customerError } =
              await supabase
                .from('customers')
                .insert({
                  business_id: businessId,
                  name: normalizedName,
                  phone: normalizedPhone || null
                })
                .select('id')
                .single()

            if (customerError) {
              throw customerError
            }

            customerId = newCustomer.id
          }
        }

        // ─────────────────────────────────────────────
        // 3. CREATE MEMBER ORDER
        // ─────────────────────────────────────────────

        const measurementValue =
          member.measurements?.trim()

        const { error: orderError } =
          await supabase
            .from('orders')
            .insert({
              business_id: businessId,
              group_order_id: group.id,
              customer_id: customerId,
              title: member.item.trim(),
              price: Number(member.price) || 0,
              amount_paid:
                Number(member.deposit) || 0,
              due_date:
                member.dueDate ||
                groupDueDate ||
                null,
              current_status: 'Order placed',
              measurements: measurementValue
                ? {
                    notes: measurementValue
                  }
                : null
            })

        if (orderError) {
          throw orderError
        }
      }

      // ─────────────────────────────────────────────
      // 4. ACTIVITY LOG
      // ─────────────────────────────────────────────

      const { error: activityError } =
        await supabase
          .from('business_activity_logs')
          .insert({
            business_id: businessId,
            performed_by: user.id,
            action: 'group_created',
            details: {
              group_name: groupName.trim(),
              member_count: members.length,
              total_value: totals.total,
              total_deposits: totals.deposits
            }
          })

      if (activityError) {
        console.warn(
          'Activity log could not be created:',
          activityError
        )
      }

      setSuccess('Group order created successfully.')

      // Give the success state a moment before
      // navigating so the user receives confirmation.
      setTimeout(() => {
        router.push(
          `/dashboard/groups/${group.id}?business_id=${businessId}`
        )
      }, 500)
    } catch (err) {
      console.error(
        'Create group order error:',
        err
      )

      setError(
        err?.message ||
        'Unable to create the group order.'
      )
    } finally {
      setSaving(false)
    }
  }

  // ─────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="group-page">
        <style>{`
          .group-page {
            min-height: 100vh;
            background: var(--color-bg);
            color: var(--color-text);
            padding: 1.5rem;
          }

          .group-loading {
            max-width: 900px;
            margin: 0 auto;
          }

          .group-skeleton {
            background: var(--color-card);
            border: 1px solid var(--color-border);
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 1rem;
          }

          .group-skeleton-line {
            height: 18px;
            border-radius: 6px;
            background: var(--color-border);
            margin-bottom: 0.8rem;
            animation: groupPulse 1.3s ease-in-out infinite;
          }

          .group-skeleton-line.short {
            width: 35%;
          }

          .group-skeleton-line.medium {
            width: 60%;
          }

          .group-skeleton-line.full {
            width: 100%;
          }

          @keyframes groupPulse {
            0%, 100% {
              opacity: 0.45;
            }
            50% {
              opacity: 0.9;
            }
          }
        `}</style>

        <div className="group-loading">
          <div className="group-skeleton">
            <div className="group-skeleton-line short" />
            <div className="group-skeleton-line medium" />
          </div>

          <div className="group-skeleton">
            <div className="group-skeleton-line medium" />
            <div className="group-skeleton-line full" />
            <div className="group-skeleton-line full" />
          </div>

          <div className="group-skeleton">
            <div className="group-skeleton-line short" />
            <div className="group-skeleton-line full" />
            <div className="group-skeleton-line full" />
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // ERROR STATE
  // ─────────────────────────────────────────────

  if (error && !business) {
    return (
      <div className="group-page">
        <style>{`
          .group-error-page {
            max-width: 520px;
            margin: 5rem auto;
            text-align: center;
          }

          .group-error-card {
            background: var(--color-card);
            border: 1px solid var(--color-border);
            border-radius: 18px;
            padding: 2rem;
          }

          .group-error-icon {
            width: 52px;
            height: 52px;
            margin: 0 auto 1rem;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(217, 83, 79, 0.1);
            color: var(--color-danger);
          }

          .group-error-title {
            margin: 0 0 0.5rem;
            font-size: 1.2rem;
          }

          .group-error-text {
            margin: 0;
            color: var(--color-text-muted);
            line-height: 1.5;
          }

          .group-error-button {
            margin-top: 1.25rem;
            border: 0;
            border-radius: 8px;
            padding: 0.65rem 1rem;
            background: var(--color-primary);
            color: #fff;
            cursor: pointer;
            font-weight: 600;
          }
        `}</style>

        <div className="group-error-page">
          <div className="group-error-card">
            <div className="group-error-icon">
              <Icon
                name="alert-circle"
                size={25}
              />
            </div>

            <h1 className="group-error-title">
              Group orders unavailable
            </h1>

            <p className="group-error-text">
              {error}
            </p>

            <button
              type="button"
              className="group-error-button"
              onClick={() =>
                router.push('/dashboard')
              }
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // MAIN PAGE
  // ─────────────────────────────────────────────

  return (
    <div className="group-page">
      <style>{`
        .group-page {
          min-height: 100vh;
          background: var(--color-bg);
          color: var(--color-text);
          padding: 1.25rem;
        }

        .group-container {
          max-width: 980px;
          margin: 0 auto;
        }

        .group-topbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .group-heading {
          min-width: 0;
        }

        .group-back {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          border: 0;
          background: transparent;
          color: var(--color-text-muted);
          padding: 0;
          margin-bottom: 0.65rem;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .group-back:hover {
          color: var(--color-text);
        }

        .group-title {
          margin: 0;
          font-size: 1.45rem;
          line-height: 1.2;
          font-weight: 750;
          letter-spacing: -0.02em;
        }

        .group-subtitle {
          margin: 0.35rem 0 0;
          color: var(--color-text-muted);
          font-size: 0.85rem;
        }

        .group-cancel {
          flex-shrink: 0;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          color: var(--color-text);
          border-radius: 8px;
          padding: 0.55rem 0.8rem;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .group-cancel:hover {
          background: var(--color-bg);
        }

        .group-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.6rem;
          margin-bottom: 1rem;
        }

        .group-step {
          position: relative;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          border-radius: 12px;
          padding: 0.7rem;
          text-align: left;
        }

        .group-step.active {
          border-color: var(--color-accent);
        }

        .group-step-number {
          width: 25px;
          height: 25px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--color-bg);
          color: var(--color-text-muted);
          font-size: 0.7rem;
          font-weight: 700;
          margin-bottom: 0.35rem;
        }

        .group-step.active .group-step-number {
          background: var(--color-accent);
          color: #fff;
        }

        .group-step.done .group-step-number {
          background: var(--color-success);
          color: #fff;
        }

        .group-step-label {
          display: block;
          font-size: 0.78rem;
          font-weight: 650;
        }

        .group-step-description {
          display: block;
          margin-top: 0.1rem;
          color: var(--color-text-muted);
          font-size: 0.65rem;
        }

        .group-alert {
          display: flex;
          align-items: flex-start;
          gap: 0.55rem;
          margin-bottom: 1rem;
          padding: 0.75rem 0.9rem;
          border-radius: 10px;
          border: 1px solid rgba(217, 83, 79, 0.25);
          background: rgba(217, 83, 79, 0.06);
          color: var(--color-danger);
          font-size: 0.8rem;
          line-height: 1.45;
        }

        .group-success {
          border-color: rgba(46, 125, 94, 0.25);
          background: rgba(46, 125, 94, 0.06);
          color: var(--color-success);
        }

        .group-card {
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          overflow: hidden;
        }

        .group-card-header {
          padding: 1.15rem 1.25rem;
          border-bottom: 1px solid var(--color-border);
        }

        .group-card-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
        }

        .group-card-description {
          margin: 0.3rem 0 0;
          color: var(--color-text-muted);
          font-size: 0.78rem;
          line-height: 1.45;
        }

        .group-card-body {
          padding: 1.25rem;
        }

        .group-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .group-form-group {
          min-width: 0;
        }

        .group-form-group.full {
          grid-column: 1 / -1;
        }

        .group-label {
          display: block;
          margin-bottom: 0.35rem;
          font-size: 0.75rem;
          font-weight: 650;
        }

        .group-input,
        .group-select,
        .group-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid var(--color-border);
          border-radius: 9px;
          background: var(--color-bg);
          color: var(--color-text);
          padding: 0.65rem 0.7rem;
          font: inherit;
          font-size: 0.82rem;
        }

        .group-input:focus,
        .group-select:focus,
        .group-textarea:focus {
          outline: none;
          border-color: var(--color-accent);
        }

        .group-textarea {
          min-height: 80px;
          resize: vertical;
        }

        .group-hint {
          margin: 0.3rem 0 0;
          color: var(--color-text-muted);
          font-size: 0.65rem;
        }

        .group-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-top: 1px solid var(--color-border);
          background: var(--color-bg);
        }

        .group-footer-left,
        .group-footer-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .group-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          min-height: 36px;
          padding: 0.55rem 0.9rem;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          color: var(--color-text);
          font-size: 0.78rem;
          font-weight: 650;
          cursor: pointer;
        }

        .group-button:hover {
          background: var(--color-bg);
        }

        .group-button.primary {
          border-color: var(--color-primary);
          background: var(--color-primary);
          color: #fff;
        }

        .group-button.accent {
          border-color: var(--color-accent);
          background: var(--color-accent);
          color: #fff;
        }

        .group-button.danger {
          color: var(--color-danger);
          border-color: transparent;
          background: transparent;
        }

        .group-button:disabled {
          opacity: 0.5;
          cursor: default;
        }

        @media (max-width: 650px) {
          .group-page {
            padding: 0.8rem;
          }

          .group-topbar {
            align-items: flex-start;
          }

          .group-title {
            font-size: 1.2rem;
          }

          .group-steps {
            gap: 0.35rem;
          }

          .group-step {
            padding: 0.55rem;
          }

          .group-step-description {
            display: none;
          }

          .group-form-grid {
            grid-template-columns: 1fr;
          }

          .group-form-group.full {
            grid-column: auto;
          }

          .group-card-body {
            padding: 1rem;
          }

          .group-footer {
            padding: 0.85rem 1rem;
          }
        }
      `}</style>

      <div className="group-container">
        <div className="group-topbar">
          <div className="group-heading">
            <button
              type="button"
              className="group-back"
              onClick={handleBack}
            >
              <Icon
                name="arrow-left"
                size={14}
              />
              Back
            </button>

            <h1 className="group-title">
              Create group order
            </h1>

            <p className="group-subtitle">
              Organise multiple customers into one
              coordinated order.
            </p>
          </div>

          <button
            type="button"
            className="group-cancel"
            onClick={() => router.back()}
          >
            Cancel
          </button>
        </div>

        <div className="group-steps">
          {STEPS.map((item) => {
            const active = step === item.id
            const done = step > item.id

            return (
              <button
                key={item.id}
                type="button"
                className={[
                  'group-step',
                  active ? 'active' : '',
                  done ? 'done' : ''
                ].join(' ')}
                onClick={() => {
                  if (item.id < step) {
                    setStep(item.id)
                    setError('')
                  }
                }}
                disabled={item.id > step}
              >
                <span className="group-step-number">
                  {done ? '✓' : item.id}
                </span>

                <span className="group-step-label">
                  {item.label}
                </span>

                <span className="group-step-description">
                  {item.description}
                </span>
              </button>
            )
          })}
        </div>

        {error && (
          <div className="group-alert">
            <Icon
              name="alert-circle"
              size={16}
            />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="group-alert group-success">
            <Icon
              name="check-circle"
              size={16}
            />
            <span>{success}</span>
          </div>
        )}

        {/* STEP 1 CONTINUES NEXT */}
        {step === 1 && (
          <div className="group-card">
            <div className="group-card-header">
              <h2 className="group-card-title">
                Group details
              </h2>

              <p className="group-card-description">
                Start with the information that applies to
                everyone in this order.
              </p>
            </div>

            <div className="group-card-body">
              <div className="group-form-grid">
                <div className="group-form-group full">
                  <label className="group-label">
                    Group name *
                  </label>

                  <input
                    type="text"
                    className="group-input"
                    value={groupName}
                    onChange={(e) =>
                      setGroupName(e.target.value)
                    }
                    placeholder="e.g. Ada's Wedding Aso Ebi"
                    autoFocus
                  />

                  <p className="group-hint">
                    Use a name that will make this group
                    easy to recognise later.
                  </p>
                </div>

                <div className="group-form-group full">
                  <label className="group-label">
                    Description
                  </label>

                  <textarea
                    className="group-textarea"
                    value={groupDescription}
                    onChange={(e) =>
                      setGroupDescription(e.target.value)
                    }
                    placeholder="Optional note about the event, fabric, style, or group..."
                  />
                </div>

                <div className="group-form-group">
                  <label className="group-label">
                    Group coordinator
                  </label>

                  <select
                    className="group-select"
                    value={coordinatorId}
                    onChange={(e) =>
                      setCoordinatorId(e.target.value)
                    }
                  >
                    <option value="">
                      No coordinator
                    </option>

                    {customers.map((customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.name}
                        {customer.phone
                          ? ` · ${customer.phone}`
                          : ''}
                      </option>
                    ))}
                  </select>

                  <p className="group-hint">
                    Usually the person coordinating
                    payments or communication.
                  </p>
                </div>

                <div className="group-form-group">
                  <label className="group-label">
                    Group due date
                  </label>

                  <input
                    type="date"
                    className="group-input"
                    value={groupDueDate}
                    onChange={(e) =>
                      setGroupDueDate(e.target.value)
                    }
                  />

                  <p className="group-hint">
                    Individual members can have their own
                    due dates later.
                  </p>
                </div>
              </div>
            </div>

            <div className="group-footer">
              <div className="group-footer-left">
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--color-text-muted)'
                  }}
                >
                  Step 1 of 3
                </span>
              </div>

              <div className="group-footer-right">
                <button
                  type="button"
                  className="group-button primary"
                  onClick={handleNext}
                >
                  Continue
                  <Icon
                    name="arrow-right"
                    size={14}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────
            STEP 2 — MEMBERS
        ───────────────────────────────────────── */}

        {step === 2 && (
          <div className="group-card">
            <div className="group-card-header">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}
              >
                <div>
                  <h2 className="group-card-title">
                    Add members
                  </h2>

                  <p className="group-card-description">
                    Add each person and the item they are
                    ordering. You can edit or remove them
                    before creating the group.
                  </p>
                </div>

                <div
                  style={{
                    flexShrink: 0,
                    textAlign: 'right'
                  }}
                >
                  <strong
                    style={{
                      display: 'block',
                      fontSize: '1rem'
                    }}
                  >
                    {members.length}
                    {maxMembers > 0
                      ? ` / ${maxMembers}`
                      : ''}
                  </strong>

                  <span
                    style={{
                      color:
                        'var(--color-text-muted)',
                      fontSize: '0.65rem'
                    }}
                  >
                    members
                  </span>
                </div>
              </div>
            </div>

            <div className="group-card-body">
              {members.length === 0 ? (
                <div
                  style={{
                    border: '1px dashed var(--color-border)',
                    borderRadius: '12px',
                    padding: '2.5rem 1.25rem',
                    textAlign: 'center',
                    background:
                      'var(--color-bg)'
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      margin: '0 auto 0.8rem',
                      borderRadius: '50%',
                      background:
                        'var(--color-card)',
                      border:
                        '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Icon
                      name="users"
                      size={22}
                      stroke="var(--color-text-muted)"
                    />
                  </div>

                  <h3
                    style={{
                      margin: '0 0 0.35rem',
                      fontSize: '0.9rem'
                    }}
                  >
                    No members yet
                  </h3>

                  <p
                    style={{
                      margin: '0 auto 1rem',
                      maxWidth: '360px',
                      color:
                        'var(--color-text-muted)',
                      fontSize: '0.75rem',
                      lineHeight: 1.5
                    }}
                  >
                    Start adding the people who are
                    part of this group order.
                  </p>

                  <button
                    type="button"
                    className="group-button accent"
                    onClick={openAddMember}
                  >
                    <Icon
                      name="plus"
                      size={14}
                    />
                    Add first member
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}
                >
                  {members.map((member, index) => (
                    <div
                      key={`${member.customerId || member.name}-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        padding: '0.85rem',
                        border:
                          '1px solid var(--color-border)',
                        borderRadius: '11px',
                        background:
                          'var(--color-bg)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.7rem',
                          minWidth: 0
                        }}
                      >
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            flexShrink: 0,
                            borderRadius: '50%',
                            background:
                              'var(--color-card)',
                            border:
                              '1px solid var(--color-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 700
                          }}
                        >
                          {member.name
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div
                          style={{
                            minWidth: 0
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 650,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {member.name}
                          </div>

                          <div
                            style={{
                              marginTop: '0.15rem',
                              color:
                                'var(--color-text-muted)',
                              fontSize: '0.68rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {member.item}
                            {member.phone
                              ? ` · ${member.phone}`
                              : ''}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.8rem',
                          flexShrink: 0
                        }}
                      >
                        <div
                          style={{
                            textAlign: 'right'
                          }}
                        >
                          <strong
                            style={{
                              display: 'block',
                              fontSize: '0.78rem'
                            }}
                          >
                            ₦
                            {Number(
                              member.price || 0
                            ).toLocaleString()}
                          </strong>

                          <span
                            style={{
                              color:
                                'var(--color-text-muted)',
                              fontSize: '0.62rem'
                            }}
                          >
                            {Number(
                              member.deposit || 0
                            ) > 0
                              ? `₦${Number(
                                  member.deposit
                                ).toLocaleString()} paid`
                              : 'No deposit'}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="group-button"
                          style={{
                            minHeight: '32px',
                            width: '32px',
                            padding: 0
                          }}
                          onClick={() =>
                            openEditMember(index)
                          }
                          aria-label={`Edit ${member.name}`}
                        >
                          <Icon
                            name="edit-2"
                            size={13}
                          />
                        </button>

                        <button
                          type="button"
                          className="group-button danger"
                          style={{
                            minHeight: '32px',
                            width: '32px',
                            padding: 0
                          }}
                          onClick={() =>
                            removeMember(index)
                          }
                          aria-label={`Remove ${member.name}`}
                        >
                          <Icon
                            name="trash-2"
                            size={13}
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {members.length > 0 && (
                <button
                  type="button"
                  className="group-button"
                  onClick={openAddMember}
                  disabled={
                    maxMembers > 0 &&
                    members.length >= maxMembers
                  }
                  style={{
                    width: '100%',
                    marginTop: '0.75rem'
                  }}
                >
                  <Icon
                    name="plus"
                    size={14}
                  />
                  Add another member
                </button>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(3, 1fr)',
                  gap: '0.5rem',
                  marginTop: '1rem'
                }}
              >
                <div
                  style={{
                    padding: '0.7rem',
                    borderRadius: '9px',
                    background:
                      'var(--color-bg)',
                    border:
                      '1px solid var(--color-border)'
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      color:
                        'var(--color-text-muted)',
                      fontSize: '0.6rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Order value
                  </span>

                  <strong
                    style={{
                      display: 'block',
                      marginTop: '0.2rem',
                      fontSize: '0.82rem'
                    }}
                  >
                    ₦
                    {totals.total.toLocaleString()}
                  </strong>
                </div>

                <div
                  style={{
                    padding: '0.7rem',
                    borderRadius: '9px',
                    background:
                      'var(--color-bg)',
                    border:
                      '1px solid var(--color-border)'
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      color:
                        'var(--color-text-muted)',
                      fontSize: '0.6rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Deposits
                  </span>

                  <strong
                    style={{
                      display: 'block',
                      marginTop: '0.2rem',
                      fontSize: '0.82rem'
                    }}
                  >
                    ₦
                    {totals.deposits.toLocaleString()}
                  </strong>
                </div>

                <div
                  style={{
                    padding: '0.7rem',
                    borderRadius: '9px',
                    background:
                      'var(--color-bg)',
                    border:
                      '1px solid var(--color-border)'
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      color:
                        'var(--color-text-muted)',
                      fontSize: '0.6rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Balance
                  </span>

                  <strong
                    style={{
                      display: 'block',
                      marginTop: '0.2rem',
                      fontSize: '0.82rem',
                      color:
                        totals.balance > 0
                          ? 'var(--color-danger)'
                          : 'var(--color-success)'
                    }}
                  >
                    ₦
                    {totals.balance.toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>

            <div className="group-footer">
              <div className="group-footer-left">
                <button
                  type="button"
                  className="group-button"
                  onClick={() => setStep(1)}
                >
                  <Icon
                    name="arrow-left"
                    size={14}
                  />
                  Back
                </button>
              </div>

              <div className="group-footer-right">
                <button
                  type="button"
                  className="group-button primary"
                  disabled={members.length === 0}
                  onClick={handleNext}
                >
                  Review group
                  <Icon
                    name="arrow-right"
                    size={14}
                  />
                </button>
              </div>

              <div className="group-footer-right">
                <button
                  type="button"
                  className="group-button primary"
                  disabled={members.length === 0}
                  onClick={handleNext}
                >
                  Review group
                  <Icon
                    name="arrow-right"
                    size={14}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 CONTINUES NEXT */}
        {/* ─────────────────────────────────────────
            STEP 3 — REVIEW & CREATE
        ───────────────────────────────────────── */}

        {step === 3 && (
          <div className="group-card">
            <div className="group-card-header">
              <h2 className="group-card-title">
                Review group order
              </h2>

              <p className="group-card-description">
                Check the group details, members, and
                payment summary before creating the order.
              </p>
            </div>

            <div className="group-card-body">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(3, 1fr)',
                  gap: '0.6rem',
                  marginBottom: '1rem'
                }}
              >
                <div
                  style={{
                    padding: '0.8rem',
                    borderRadius: '10px',
                    background: 'var(--color-bg)',
                    border:
                      '1px solid var(--color-border)'
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      color:
                        'var(--color-text-muted)',
                      fontSize: '0.62rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Group
                  </span>

                  <strong
                    style={{
                      display: 'block',
                      marginTop: '0.25rem',
                      fontSize: '0.82rem'
                    }}
                  >
                    {groupName}
                  </strong>
                </div>

                <div
                  style={{
                    padding: '0.8rem',
                    borderRadius: '10px',
                    background: 'var(--color-bg)',
                    border:
                      '1px solid var(--color-border)'
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      color:
                        'var(--color-text-muted)',
                      fontSize: '0.62rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Members
                  </span>

                  <strong
                    style={{
                      display: 'block',
                      marginTop: '0.25rem',
                      fontSize: '0.82rem'
                    }}
                  >
                    {members.length}
                  </strong>
                </div>

                <div
                  style={{
                    padding: '0.8rem',
                    borderRadius: '10px',
                    background: 'var(--color-bg)',
                    border:
                      '1px solid var(--color-border)'
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      color:
                        'var(--color-text-muted)',
                      fontSize: '0.62rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Due date
                  </span>

                  <strong
                    style={{
                      display: 'block',
                      marginTop: '0.25rem',
                      fontSize: '0.82rem'
                    }}
                  >
                    {groupDueDate
                      ? new Date(
                          `${groupDueDate}T00:00:00`
                        ).toLocaleDateString(
                          'en-GB'
                        )
                      : 'Not set'}
                  </strong>
                </div>
              </div>

              {groupDescription && (
                <div
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    borderRadius: '9px',
                    background:
                      'var(--color-bg)',
                    border:
                      '1px solid var(--color-border)'
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      marginBottom: '0.25rem',
                      color:
                        'var(--color-text-muted)',
                      fontSize: '0.62rem',
                      textTransform: 'uppercase'
                    }}
                  >
                    Description
                  </span>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.78rem',
                      lineHeight: 1.5
                    }}
                  >
                    {groupDescription}
                  </p>
                </div>
              )}

              <div
                style={{
                  border:
                    '1px solid var(--color-border)',
                  borderRadius: '11px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '1.5fr 1.2fr 0.8fr 0.8fr',
                    gap: '0.5rem',
                    padding:
                      '0.65rem 0.8rem',
                    background:
                      'var(--color-bg)',
                    borderBottom:
                      '1px solid var(--color-border)',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    color:
                      'var(--color-text-muted)',
                    textTransform: 'uppercase'
                  }}
                >
                  <span>Member</span>
                  <span>Item</span>
                  <span>Price</span>
                  <span>Paid</span>
                </div>

                {members.map((member, index) => (
                  <div
                    key={`${member.name}-${index}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        '1.5fr 1.2fr 0.8fr 0.8fr',
                      gap: '0.5rem',
                      padding:
                        '0.7rem 0.8rem',
                      borderBottom:
                        index === members.length - 1
                          ? 'none'
                          : '1px solid var(--color-border)',
                      alignItems: 'center',
                      fontSize: '0.75rem'
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0
                      }}
                    >
                      <strong
                        style={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow:
                            'ellipsis',
                          whiteSpace:
                            'nowrap'
                        }}
                      >
                        {member.name}
                      </strong>

                      {member.phone && (
                        <span
                          style={{
                            display: 'block',
                            marginTop: '0.15rem',
                            color:
                              'var(--color-text-muted)',
                            fontSize: '0.62rem'
                          }}
                        >
                          {member.phone}
                        </span>
                      )}
                    </div>

                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow:
                          'ellipsis',
                        whiteSpace:
                          'nowrap'
                      }}
                    >
                      {member.item}
                    </span>

                    <span>
                      ₦
                      {Number(
                        member.price || 0
                      ).toLocaleString()}
                    </span>

                    <span>
                      ₦
                      {Number(
                        member.deposit || 0
                      ).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(3, 1fr)',
                  gap: '0.6rem',
                  marginTop: '1rem'
                }}
              >
                <div
                  style={{
                    padding: '0.9rem',
                    borderRadius: '10px',
                    background:
                      'var(--color-bg)',
                    border:
                      '1px solid var(--color-border)'
                  }}
                >
                  <span
                    style={{
                      color:
                        'var(--color-text-muted)',
                      fontSize: '0.65rem'
                    }}
                  >
                    Total value
                  </span>

                  <strong
                    style={{
                      display: 'block',
                      marginTop: '0.2rem',
                      fontSize: '1rem'
                    }}
                  >
                    ₦
                    {totals.total.toLocaleString()}
                  </strong>
                </div>

                <div
                  style={{
                    padding: '0.9rem',
                    borderRadius: '10px',
                    background:
                      'var(--color-bg)',
                    border:
                      '1px solid var(--color-border)'
                  }}
                >
                  <span
                    style={{
                      color:
                        'var(--color-text-muted)',
                      fontSize: '0.65rem'
                    }}
                  >
                    Total paid
                  </span>

                  <strong
                    style={{
                      display: 'block',
                      marginTop: '0.2rem',
                      fontSize: '1rem',
                      color:
                        'var(--color-success)'
                    }}
                  >
                    ₦
                    {totals.deposits.toLocaleString()}
                  </strong>
                </div>

                <div
                  style={{
                    padding: '0.9rem',
                    borderRadius: '10px',
                    background:
                      'var(--color-bg)',
                    border:
                      '1px solid var(--color-border)'
                  }}
                >
                  <span
                    style={{
                      color:
                        'var(--color-text-muted)',
                      fontSize: '0.65rem'
                    }}
                  >
                    Outstanding
                  </span>

                  <strong
                    style={{
                      display: 'block',
                      marginTop: '0.2rem',
                      fontSize: '1rem',
                      color:
                        totals.balance > 0
                          ? 'var(--color-danger)'
                          : 'var(--color-success)'
                    }}
                  >
                    ₦
                    {totals.balance.toLocaleString()}
                  </strong>
                </div>
              </div>
            </div>

            <div className="group-footer">
              <div className="group-footer-left">
                <button
                  type="button"
                  className="group-button"
                  onClick={() => setStep(2)}
                  disabled={saving}
                >
                  <Icon
                    name="arrow-left"
                    size={14}
                  />
                  Back
                </button>
              </div>

              <div className="group-footer-right">
                <button
                  type="button"
                  className="group-button accent"
                  onClick={handleSubmit}
                  disabled={
                    saving ||
                    members.length === 0
                  }
                >
                  <Icon
                    name={
                      saving
                        ? 'refresh-cw'
                        : 'check'
                    }
                    size={14}
                  />

                  {saving
                    ? 'Creating group...'
                    : 'Create group order'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────
            MEMBER MODAL
        ───────────────────────────────────────── */}

        {showMemberModal && (
          <div
            className="group-modal-overlay"
            onClick={() =>
              setShowMemberModal(false)
            }
          >
            <div
              className="group-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div className="group-modal-header">
                <div>
                  <h2>
                    {editingMemberIndex !== null
                      ? 'Edit member'
                      : 'Add member'}
                  </h2>

                  <p>
                    Add the customer and their order
                    details.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowMemberModal(false)
                  }
                  className="group-modal-close"
                >
                  <Icon
                    name="x"
                    size={17}
                  />
                </button>
              </div>

              <div className="group-modal-body">
                <div
                  style={{
                    marginBottom: '1rem'
                  }}
                >
                  <label className="group-label">
                    Customer
                  </label>

                  <select
                    className="group-select"
                    value={
                      memberForm.customerId || ''
                    }
                    onChange={(e) => {
                      const id =
                        e.target.value

                      const customer =
                        customers.find(
                          (item) =>
                            item.id === id
                        )

                      setMemberForm({
                        ...memberForm,
                        customerId: id,
                        name:
                          customer?.name ||
                          '',
                        phone:
                          customer?.phone ||
                          ''
                      })
                    }}
                  >
                    <option value="">
                      New customer
                    </option>

                    {customers.map(
                      (customer) => (
                        <option
                          key={customer.id}
                          value={customer.id}
                        >
                          {customer.name}
                          {customer.phone
                            ? ` · ${customer.phone}`
                            : ''}
                        </option>
                      )
                    )}
                  </select>

                  <p className="group-hint">
                    Select an existing customer or
                    leave this as New customer.
                  </p>
                </div>

                <div className="group-form-grid">
                  <div className="group-form-group">
                    <label className="group-label">
                      Name *
                    </label>

                    <input
                      className="group-input"
                      name="name"
                      value={memberForm.name}
                      onChange={handleMemberChange}
                      required
                      placeholder="Customer name"
                    />
                  </div>

                  <div className="group-form-group">
                    <label className="group-label">
                      Phone
                    </label>

                    <input
                      className="group-input"
                      name="phone"
                      value={memberForm.phone}
                      onChange={handleMemberChange}
                      inputMode="tel"
                      placeholder="08012345678"
                    />
                  </div>

                  <div className="group-form-group full">
                    <label className="group-label">
                      Item / service *
                    </label>

                    <input
                      className="group-input"
                      name="item"
                      value={memberForm.item}
                      onChange={handleMemberChange}
                      required
                      placeholder="e.g. Senator outfit"
                    />
                  </div>

                  <div className="group-form-group">
                    <label className="group-label">
                      Price *
                    </label>

                    <input
                      className="group-input"
                      type="number"
                      min="0"
                      step="0.01"
                      name="price"
                      value={memberForm.price}
                      onChange={handleMemberChange}
                      required
                      placeholder="0"
                    />
                  </div>

                  <div className="group-form-group">
                    <label className="group-label">
                      Deposit
                    </label>

                    <input
                      className="group-input"
                      type="number"
                      min="0"
                      step="0.01"
                      name="deposit"
                      value={memberForm.deposit}
                      onChange={handleMemberChange}
                      placeholder="0"
                    />
                  </div>

                  <div className="group-form-group">
                    <label className="group-label">
                      Individual due date
                    </label>

                    <input
                      className="group-input"
                      type="date"
                      name="dueDate"
                      value={memberForm.dueDate}
                      onChange={handleMemberChange}
                    />
                  </div>

                  <div className="group-form-group">
  <label className="group-label">
    Measurements
  </label>

  <input
    className="group-input"
    type="text"
    name="measurements"
    value={memberForm.measurements}
    onChange={handleMemberChange}
    placeholder="Measurements or fitting notes"
  />
</div>
                    <input
                      className="group-input"
                      name="measurements"
                      value={
                        memberForm.measurements
                      }
                      onChange={handleMemberChange}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>

              <div className="group-modal-footer">
                <button
                  type="button"
                  className="group-button"
                  onClick={() =>
                    setShowMemberModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="group-button accent"
                  onClick={saveMember}
                >
                  <Icon
                    name="check"
                    size={14}
                  />

                  {editingMemberIndex !== null
                    ? 'Save changes'
                    : 'Add member'}
                </button>
              </div>
            </div>
          </div>
        )}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.9rem',
                }}
              >
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">
                    Customer
                  </label>

                  <input
    type="text"
    name="name"
    value={memberForm.name}
    onChange={handleMemberChange}
    placeholder="Full name"
    className="field-input"
    required
/>
                <div>
                  <label className="field-label">
                    Phone number
                  </label>

                  <input
                    type="tel"
                    name="phone"
                    value={memberForm.phone}
                    onChange={handleMemberChange}
                    placeholder="08012345678"
                    className="field-input"
                  />
                </div>

                <div>
                  <label className="field-label">
                    Item / Outfit
                  </label>

                  <input
                    type="text"
                    name="item"
                    value={memberForm.item}
                    onChange={handleMemberChange}
                    placeholder="e.g. Senator outfit"
                    className="field-input"
                    required
                  />
                </div>

                <div>
                  <label className="field-label">
                    Price
                  </label>

                  <div className="money-input">
                    <span>₦</span>
                    <input
                      type="number"
                      name="price"
                      value={memberForm.price}
                      onChange={handleMemberChange}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label">
                    Deposit
                  </label>

                  <div className="money-input">
                    <span>₦</span>
                    <input
                      type="number"
                      name="deposit"
                      value={memberForm.deposit}
                      onChange={handleMemberChange}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label">
                    Due date
                  </label>

                  <input
                    type="date"
                    name="due_date"
                    value={memberForm.due_date}
                    onChange={handleMemberChange}
                    className="field-input"
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">
                    Measurements / fitting notes
                  </label>

                  <textarea
                    name="measurements"
                    value={memberForm.measurements}
                    onChange={handleMemberChange}
                    placeholder="Add measurements, fitting instructions or special notes..."
                    rows={4}
                    className="field-input"
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: '1.2rem',
                  padding: '0.8rem',
                  borderRadius: '10px',
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Outstanding balance
                    </div>

                    <strong style={{ fontSize: '1rem' }}>
                      ₦
                      {Math.max(
                        0,
                        (parseFloat(memberForm.price) || 0) -
                          (parseFloat(memberForm.deposit) || 0)
                      ).toLocaleString()}
                    </strong>
                  </div>

                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--color-text-muted)',
                      textAlign: 'right',
                    }}
                  >
                    Deposit is optional
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.6rem',
                  marginTop: '1.2rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="secondary-button"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  <Icon
                    name={editingMemberIndex !== null ? 'check' : 'plus'}
                    size={15}
                    stroke="#fff"
                  />

                  {editingMemberIndex !== null
                    ? 'Save member'
                    : 'Add member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .field-label {
          display: block;
          margin-bottom: 0.35rem;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .field-input {
          width: 100%;
          box-sizing: border-box;
          padding: 0.68rem 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: 9px;
          background: var(--color-bg);
          color: var(--color-text);
          font-size: 0.86rem;
          font-family: inherit;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .field-input:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px
            color-mix(
              in srgb,
              var(--color-accent) 12%,
              transparent
            );
        }

        .money-input {
          display: flex;
          align-items: center;
          border: 1px solid var(--color-border);
          border-radius: 9px;
          background: var(--color-bg);
          overflow: hidden;
        }

        .money-input span {
          padding-left: 0.7rem;
          color: var(--color-text-muted);
          font-size: 0.85rem;
        }

        .money-input input {
          width: 100%;
          border: none;
          outline: none;
          padding: 0.68rem 0.55rem;
          background: transparent;
          color: var(--color-text);
          font-size: 0.86rem;
          font-family: inherit;
        }

        .primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.65rem 1rem;
          border: none;
          border-radius: 9px;
          background: var(--color-accent);
          color: #fff;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        .primary-button:hover {
          opacity: 0.9;
        }

        .secondary-button {
          padding: 0.65rem 1rem;
          border: 1px solid var(--color-border);
          border-radius: 9px;
          background: transparent;
          color: var(--color-text);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
        }

        .secondary-button:hover {
          background: var(--color-bg);
        }

        @media (max-width: 600px) {
          .field-input {
            font-size: 0.85rem;
          }

          .primary-button,
          .secondary-button {
            flex: 1;
          }
        }
      `}</style>
    </div>
  )
                        }
