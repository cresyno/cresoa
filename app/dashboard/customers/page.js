'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Icon } from '../../../components/Icon'

const formatMoney = value =>
  `₦${Number(value || 0).toLocaleString('en-NG')}`

const formatDate = value => {
  if (!value) return 'No order yet'
  return new Date(value).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function CustomersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [businessName, setBusinessName] = useState('')
  const [businessId, setBusinessId] = useState(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('last_added')

  const loadCustomers = async () => {
    setLoading(true)
    setError(null)

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const urlBusinessId =
        searchParams.get('business_id')

      let resolvedBusinessId = urlBusinessId

      if (
        !resolvedBusinessId ||
        resolvedBusinessId.length < 20
      ) {
        const { data: owned } = await supabase
          .from('businesses')
          .select('id, name')
          .eq('owner_id', user.id)
          .single()

        if (owned) {
          resolvedBusinessId = owned.id
          setBusinessName(owned.name)
        } else {
          const { data: membership } =
            await supabase
              .from('business_memberships')
              .select('business_id')
              .eq('user_id', user.id)
              .maybeSingle()

          if (membership) {
            resolvedBusinessId =
              membership.business_id

            const { data: business } =
              await supabase
                .from('businesses')
                .select('name')
                .eq(
                  'id',
                  resolvedBusinessId
                )
                .single()

            if (business) {
              setBusinessName(business.name)
            }
          }
        }
      } else {
        const { data: business } =
          await supabase
            .from('businesses')
            .select('name')
            .eq('id', resolvedBusinessId)
            .single()

        if (business) {
          setBusinessName(business.name)
        }
      }

      if (!resolvedBusinessId) {
        router.push('/onboarding')
        return
      }

      setBusinessId(resolvedBusinessId)

      const response = await fetch(
        `/api/customers?business_id=${resolvedBusinessId}`,
        {
          headers: {
            Authorization:
              `Bearer ${session.access_token}`
          }
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error ||
            'Unable to load customers'
        )
      }

      const customersWithStats =
        await Promise.all(
          (result.customers || []).map(
            async customer => {
              const { data: orders } =
                await supabase
                  .from('orders')
                  .select(
                    'id, price, amount_paid, created_at, current_status'
                  )
                  .eq(
                    'customer_id',
                    customer.id
                  )

              const orderList = orders || []

              const orderCount =
                orderList.length

              const totalSpent =
                orderList.reduce(
                  (sum, order) =>
                    sum +
                    Number(
                      order.amount_paid || 0
                    ),
                  0
                )

              const balance =
                orderList.reduce(
                  (sum, order) =>
                    sum +
                    Number(
                      order.price || 0
                    ) -
                    Number(
                      order.amount_paid || 0
                    ),
                  0
                )

              const lastOrder =
                [...orderList].sort(
                  (a, b) =>
                    new Date(b.created_at) -
                    new Date(a.created_at)
                )[0] || null

              return {
                ...customer,
                orderCount,
                totalSpent,
                balance,
                lastOrder
              }
            }
          )
        )

      const sorted =
        [...customersWithStats].sort(
          (a, b) => {
            if (sortBy === 'most_orders') {
              return (
                b.orderCount -
                a.orderCount
              )
            }

            if (sortBy === 'most_spent') {
              return (
                b.totalSpent -
                a.totalSpent
              )
            }

            if (sortBy === 'name_asc') {
              return `${a.first_name} ${a.last_name}`
                .localeCompare(
                  `${b.first_name} ${b.last_name}`
                )
            }

            return (
              new Date(b.created_at) -
              new Date(a.created_at)
            )
          }
        )

      setCustomers(sorted)
    } catch (err) {
      console.error(
        'Customers page error:',
        err
      )

      setError(
        err?.message ||
          'Something went wrong while loading customers.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [searchParams, sortBy])

  const filteredCustomers = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase()

    if (!query) return customers

    return customers.filter(customer => {
      const name =
        `${customer.first_name || ''} ${customer.last_name || ''}`
          .toLowerCase()

      const phone =
        customer.phone || ''

      return (
        name.includes(query) ||
        phone.includes(query)
      )
    })
  }, [customers, search])

  const totalOutstanding = customers.reduce(
    (sum, customer) =>
      sum +
      Math.max(Number(customer.balance || 0), 0),
    0
  )

  const activeCustomers =
    customers.filter(
      customer =>
        customer.orderCount > 0
    ).length

  if (loading) {
    return (
      <main className="customers-page">
        <div className="customers-shell">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-search" />
          <div className="skeleton-list">
            {[1, 2, 3, 4].map(item => (
              <div
                className="customer-skeleton"
                key={item}
              >
                <div className="skeleton avatar" />
                <div className="skeleton-lines">
                  <div className="skeleton line wide" />
                  <div className="skeleton line" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="customers-page">
        <div className="customers-error">
          <Icon
            name="alert-circle"
            size={30}
            stroke="var(--color-danger)"
          />
          <h2>
            We couldn't load your customers
          </h2>
          <p>{error}</p>
          <button
            type="button"
            onClick={loadCustomers}
          >
            Try again
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="customers-page">
      <div className="customers-shell">
            <header className="customers-header">
          <div className="customers-heading">
            <button
              type="button"
              className="back-button"
              onClick={() => router.push('/dashboard')}
              aria-label="Back to dashboard"
            >
              <Icon
                name="arrow-left"
                size={19}
                stroke="currentColor"
              />
            </button>

            <div>
              <span className="eyebrow">
                {businessName || 'YOUR BUSINESS'}
              </span>

              <h1>Customers</h1>

              <p>
                {customers.length === 0
                  ? 'Build your customer list'
                  : `${customers.length} customer${customers.length === 1 ? '' : 's'} in your business`}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="add-customer-button"
            onClick={() =>
              router.push(
                businessId
                  ? `/dashboard/customers/new?business_id=${businessId}`
                  : '/dashboard/customers/new'
              )
            }
          >
            <Icon
              name="plus"
              size={18}
              stroke="currentColor"
            />

            <span>Add customer</span>
          </button>
        </header>

        <section className="customer-overview">
          <div className="overview-card">
            <div className="overview-icon navy">
              <Icon
                name="users"
                size={19}
                stroke="currentColor"
              />
            </div>

            <div>
              <span>Customers</span>
              <strong>{customers.length}</strong>
            </div>
          </div>

          <div className="overview-card">
            <div className="overview-icon green">
              <Icon
                name="user-check"
                size={19}
                stroke="currentColor"
              />
            </div>

            <div>
              <span>With orders</span>
              <strong>{activeCustomers}</strong>
            </div>
          </div>

          <div className="overview-card">
            <div className="overview-icon gold">
              <Icon
                name="wallet"
                size={19}
                stroke="currentColor"
              />
            </div>

            <div>
              <span>Outstanding</span>
              <strong>
                {formatMoney(totalOutstanding)}
              </strong>
            </div>
          </div>
        </section>

        <section className="customer-toolbar">
          <div className="search-box">
            <Icon
              name="search"
              size={18}
              stroke="var(--color-text-muted)"
            />

            <input
              type="search"
              value={search}
              onChange={event =>
                setSearch(event.target.value)
              }
              placeholder="Search name or phone..."
              aria-label="Search customers"
            />

            {search && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <Icon
                  name="x"
                  size={16}
                  stroke="currentColor"
                />
              </button>
            )}
          </div>

          <label className="sort-control">
            <span>Sort</span>

            <select
              value={sortBy}
              onChange={event =>
                setSortBy(event.target.value)
              }
            >
              <option value="last_added">
                Recently added
              </option>

              <option value="most_orders">
                Most orders
              </option>

              <option value="most_spent">
                Highest payments
              </option>

              <option value="name_asc">
                Name A–Z
              </option>
            </select>
          </label>
        </section>

        <section className="customer-list-section">
          <div className="list-heading">
            <div>
              <span className="section-label">
                CUSTOMER LIST
              </span>

              <h2>
                {search
                  ? `Results for “${search}”`
                  : 'Your customers'}
              </h2>
            </div>

            {search && (
              <span className="result-count">
                {filteredCustomers.length} result
                {filteredCustomers.length === 1
                  ? ''
                  : 's'}
              </span>
            )}
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="empty-customers">
              <div className="empty-icon">
                <Icon
                  name={
                    search
                      ? 'search-x'
                      : 'users'
                  }
                  size={26}
                  stroke="var(--color-primary)"
                />
              </div>

              <h3>
                {search
                  ? 'No customer found'
                  : 'No customers yet'}
              </h3>

              <p>
                {search
                  ? 'Try another name or phone number.'
                  : 'Add your first customer so you can keep their orders, payments, and measurements together.'}
              </p>

              {!search && (
                <button
                  type="button"
                  className="empty-action"
                  onClick={() =>
                    router.push(
                      businessId
                        ? `/dashboard/customers/new?business_id=${businessId}`
                        : '/dashboard/customers/new'
                    )
                  }
                >
                  <Icon
                    name="plus"
                    size={17}
                    stroke="currentColor"
                  />
                  Add your first customer
                </button>
              )}

              {search && (
                <button
                  type="button"
                  className="empty-action secondary"
                  onClick={() => setSearch('')}
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="customer-list">
              {filteredCustomers.map(customer => {
                const fullName =
                  `${customer.first_name || ''} ${customer.last_name || ''}`
                    .trim() ||
                  'Unnamed customer'

                const initials =
                  `${customer.first_name?.charAt(0) || ''}${customer.last_name?.charAt(0) || ''}`
                    .toUpperCase() ||
                  '?'

                const hasBalance =
                  Number(customer.balance || 0) > 0

                return (
                  <button
                    type="button"
                    className="customer-row"
                    key={customer.id}
                    onClick={() =>
                      router.push(
                        `/dashboard/customers/${customer.id}`
                      )
                    }
                  >
                    <div className="customer-avatar">
                      {initials}
                    </div>

                    <div className="customer-main">
                      <div className="customer-name-line">
                        <h3>{fullName}</h3>

                        {customer.orderCount > 0 && (
                          <span className="orders-badge">
                            {customer.orderCount}
                            {customer.orderCount === 1
                              ? ' order'
                              : ' orders'}
                          </span>
                        )}
                      </div>

                      <p>
                        {customer.phone ||
                          customer.email ||
                          'No contact information'}
                      </p>

                      <div className="customer-meta">
                        <span>
                          {customer.lastOrder
                            ? `Last order ${formatDate(customer.lastOrder.created_at)}`
                            : 'No orders yet'}
                        </span>

                        {hasBalance && (
                          <strong>
                            {formatMoney(
                              customer.balance
                            )}{' '}
                            due
                          </strong>
                        )}

                        {!hasBalance &&
                          customer.orderCount > 0 && (
                            <span className="paid-label">
                              Paid
                            </span>
                          )}
                      </div>
                    </div>

                    <Icon
                      name="chevron-right"
                      size={18}
                      stroke="var(--color-text-muted)"
                    />
                  </button>
                )
              })}
            </div>
          )}
        </section>

                    </div>

      <style jsx>{`
        .customers-page {
          min-height: 100vh;
          background: var(--color-bg);
          color: var(--color-text);
          padding: 0 16px 90px;
        }

        .customers-shell {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
        }

        .customers-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 20px 0;
        }

        .customers-heading {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .back-button {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid var(--color-border);
          border-radius: 13px;
          background: var(--color-card);
          color: var(--color-primary);
          cursor: pointer;
        }

        .eyebrow {
          color: var(--color-text-muted);
          font-size: 10px;
          letter-spacing: .08em;
          font-weight: 800;
          text-transform: uppercase;
        }

        .customers-heading h1 {
          margin: 4px 0;
          font-size: 26px;
          line-height: 1.15;
          font-weight: 900;
          color: var(--color-primary);
        }

        .customers-heading p {
          margin: 0;
          color: var(--color-text-muted);
          font-size: 13px;
        }

        .add-customer-button {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 12px 14px;
          border: 0;
          border-radius: 13px;
          background: var(--color-accent);
          color: var(--color-primary);
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: var(--shadow-sm);
        }

        .customer-overview {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }

        .overview-card {
          min-height: 92px;
          padding: 13px;
          border-radius: 18px;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow);
        }

        .overview-icon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          margin-bottom: 10px;
        }

        .overview-icon.navy {
          background: rgba(15,43,74,.1);
          color: var(--color-primary);
        }

        .overview-icon.green {
          background: rgba(46,125,94,.12);
          color: var(--color-secondary);
        }

        .overview-icon.gold {
          background: rgba(212,165,42,.14);
          color: var(--color-accent);
        }

        .overview-card span {
          display: block;
          color: var(--color-text-muted);
          font-size: 10px;
          margin-bottom: 4px;
        }

        .overview-card strong {
          display: block;
          color: var(--color-primary);
          font-size: 15px;
          font-weight: 900;
        }

        .customer-toolbar {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 22px;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          height: 48px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid var(--color-border);
          background: var(--color-card);
        }

        .search-box input {
          flex: 1;
          border: 0;
          outline: none;
          background: transparent;
          color: var(--color-text);
          font-size: 14px;
        }

        .search-box input::placeholder {
          color: var(--color-text-muted);
        }

        .clear-search {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border: 0;
          border-radius: 50%;
          background: var(--color-bg);
          color: var(--color-text-muted);
        }

        .sort-control {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 46px;
          padding: 0 14px;
          border-radius: 14px;
          background: var(--color-card);
          border: 1px solid var(--color-border);
        }

        .sort-control span {
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 700;
        }

        .sort-control select {
          border: 0;
          outline: none;
          background: transparent;
          color: var(--color-primary);
          font-size: 12px;
          font-weight: 800;
        }

        .list-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 12px;
        }

        .section-label {
          color: var(--color-text-muted);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .1em;
        }

        .list-heading h2 {
          margin: 4px 0 0;
          color: var(--color-primary);
          font-size: 19px;
        }

        .result-count {
          color: var(--color-text-muted);
          font-size: 12px;
        }

        .customer-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .customer-row {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 14px;
          text-align: left;
          border-radius: 18px;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          box-shadow: var(--shadow-sm);
          cursor: pointer;
        }

        .customer-avatar {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 50%;
          background: var(--color-primary);
          color: white;
          font-size: 15px;
          font-weight: 900;
        }

        .customer-main {
          min-width: 0;
          flex: 1;
        }

        .customer-name-line {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .customer-name-line h3 {
          margin: 0;
          color: var(--color-primary);
          font-size: 15px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .orders-badge {
          flex-shrink: 0;
          padding: 3px 7px;
          border-radius: 20px;
          background: rgba(212,165,42,.14);
          color: var(--color-primary);
          font-size: 9px;
          font-weight: 800;
        }

        .customer-main p {
          margin: 5px 0;
          color: var(--color-text-muted);
          font-size: 12px;
        }

        .customer-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          font-size: 11px;
          color: var(--color-text-muted);
        }

        .customer-meta strong {
          color: var(--color-danger);
        }

        .paid-label {
          color: var(--color-secondary);
          font-weight: 800;
}
        .empty-customers {
          padding: 42px 20px;
          text-align: center;
          border: 1px dashed var(--color-border);
          border-radius: 20px;
          background: var(--color-card);
        }

        .empty-icon {
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 15px;
          border-radius: 18px;
          background: rgba(15,43,74,.08);
        }

        .empty-customers h3 {
          margin: 0;
          color: var(--color-primary);
          font-size: 17px;
        }

        .empty-customers p {
          max-width: 330px;
          margin: 8px auto 18px;
          color: var(--color-text-muted);
          font-size: 13px;
          line-height: 1.55;
        }

        .empty-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 12px 15px;
          border: 0;
          border-radius: 12px;
          background: var(--color-accent);
          color: var(--color-primary);
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .empty-action.secondary {
          background: var(--color-primary);
          color: white;
        }

        .customers-error {
          min-height: 70vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          text-align: center;
        }

        .customers-error h2 {
          margin: 14px 0 7px;
          color: var(--color-primary);
          font-size: 19px;
        }

        .customers-error p {
          max-width: 360px;
          margin: 0 0 18px;
          color: var(--color-text-muted);
          font-size: 13px;
          line-height: 1.5;
        }

        .customers-error button {
          padding: 12px 18px;
          border: 0;
          border-radius: 12px;
          background: var(--color-accent);
          color: var(--color-primary);
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .skeleton {
          position: relative;
          overflow: hidden;
          background: var(--color-border);
          border-radius: 10px;
        }

        .skeleton::after {
          content: '';
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,.5),
            transparent
          );
          animation: shimmer 1.4s infinite;
        }

        .skeleton-title {
          width: 190px;
          height: 30px;
          margin: 28px 0 18px;
        }

        .skeleton-search {
          width: 100%;
          height: 48px;
          margin-bottom: 20px;
        }

        .skeleton-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .customer-skeleton {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px;
          border: 1px solid var(--color-border);
          border-radius: 18px;
          background: var(--color-card);
        }

        .skeleton.avatar {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border-radius: 50%;
        }

        .skeleton-lines {
          flex: 1;
        }

        .skeleton.line {
          width: 55%;
          height: 10px;
          margin-top: 8px;
        }

        .skeleton.line.wide {
          width: 75%;
          margin-top: 0;
        }

        .customer-row:hover {
          border-color: rgba(15,43,74,.2);
          box-shadow: var(--shadow-md);
        }

        .customer-row:focus-visible,
        .back-button:focus-visible,
        .add-customer-button:focus-visible,
        .empty-action:focus-visible,
        .customers-error button:focus-visible {
          outline: 3px solid rgba(212,165,42,.35);
          outline-offset: 2px;
        }

        .add-customer-button:active,
        .empty-action:active,
        .back-button:active {
          transform: translateY(1px);
        }

        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        @media (min-width: 640px) {
          .customers-page {
            padding: 0 24px 70px;
          }

          .customers-header {
            padding-top: 30px;
          }

          .customer-toolbar {
            flex-direction: row;
          }

          .search-box {
            flex: 1;
          }

          .sort-control {
            width: 210px;
          }
        }

        @media (max-width: 430px) {
          .customers-page {
            padding-left: 12px;
            padding-right: 12px;
          }

          .customers-header {
            align-items: center;
          }

          .customers-heading {
            gap: 9px;
          }

          .customers-heading h1 {
            font-size: 23px;
          }

          .customers-heading p {
            font-size: 11px;
          }

          .add-customer-button {
            width: 42px;
            height: 42px;
            padding: 0;
            justify-content: center;
          }

          .add-customer-button span {
            display: none;
          }

          .customer-overview {
            gap: 7px;
          }

          .overview-card {
            min-height: 86px;
            padding: 10px;
          }

          .overview-icon {
            width: 30px;
            height: 30px;
            margin-bottom: 8px;
          }

          .overview-card span {
            font-size: 9px;
          }

          .overview-card strong {
            font-size: 13px;
          }

          .customer-row {
            padding: 12px;
          }

          .customer-avatar {
            width: 43px;
            height: 43px;
            font-size: 13px;
          }

          .customer-name-line h3 {
            max-width: 150px;
          }
        }
      `}</style>
    </main>
  )
}
