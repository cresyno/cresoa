'use client'

import { useState } from 'react'
import ClassicGold from '../public-templates/ClassicGold'
import ModernBold from '../public-templates/ModernBold'
import Elegant from '../public-templates/Elegant'
import FreshSerene from '../public-templates/FreshSerene'
import DynamicSunrise from '../public-templates/DynamicSunrise'
import QuoteModal from './QuoteModal'
import ReviewForm from './ReviewForm'

const TEMPLATES = {
  'classic-gold': ClassicGold,
  'modern-bold': ModernBold,
  'elegant': Elegant,
  'fresh-serene': FreshSerene,
  'dynamic-sunrise': DynamicSunrise,
}

export default function PublicPageWrapper({ business, page, services, portfolio, reviews, templateId }) {
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  const Template = TEMPLATES[templateId] || Elegant

  return (
    <>
      <Template
        business={business}
        page={page}
        services={services || []}
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
