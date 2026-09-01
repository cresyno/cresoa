'use client'

import { useState } from 'react'
import { getTemplate } from '../../lib/templateRegistry'
import QuoteModal from './QuoteModal'
import ReviewForm from './ReviewForm'

export default function PublicPageWrapper({ business, page, services, shop, portfolio, reviews, templateId }) {
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  const Template = getTemplate(templateId)

  return (
    <>
      <Template
        business={business}
        page={page}
        services={services || []}
        shop={shop || []}
        portfolio={portfolio || []}
        reviews={reviews || []}
        onQuoteClick={() => setQuoteOpen(true)}
        onReviewClick={() => setReviewOpen(true)}
      />

      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} businessId={page.business_id} businessName={business.name} />
      <ReviewForm open={reviewOpen} onClose={() => setReviewOpen(false)} businessId={page.business_id} businessName={business.name} onSubmitted={() => window.location.reload()} />
    </>
  )
}
