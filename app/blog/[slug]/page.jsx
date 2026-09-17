import { notFound } from 'next/navigation'
import PostLayout from '../../../components/PostLayout'
import { blogPosts } from '../../../lib/blogData'
import { POSTS } from '../../../lib/posts'

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }) {
  const post = blogPosts.find((p) => p.slug === params.slug)
  if (!post) return {}
  const url = `https://cresoa.com.ng/blog/${post.slug}`
  return {
    title: `${post.title} | Cresoa`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url,
      siteName: 'Cresoa',
      images: post.image ? [{ url: `https://cresoa.com.ng${post.image}` }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
    alternates: { canonical: `/blog/${post.slug}` },
    robots: { index: true, follow: true },
  }
}

export default function BlogPostPage({ params }) {
  const post = blogPosts.find((p) => p.slug === params.slug)
  const mod = POSTS[params.slug]
  if (!post || !mod) notFound()

  const Content = mod.Content
  const faqs = mod.faqs || []
  const related = blogPosts
    .filter((p) => p.category === post.category && p.slug !== post.slug)
    .slice(0, 3)

  const url = `https://cresoa.com.ng/blog/${post.slug}`

  const blogPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.image ? `https://cresoa.com.ng${post.image}` : 'https://cresoa.com.ng/og-image.png',
    author: { '@type': 'Person', name: 'Taiwo A. Feranmi', url: 'https://cresoa.com.ng' },
    publisher: {
      '@type': 'Organization',
      name: 'Cresoa',
      url: 'https://cresoa.com.ng',
      logo: { '@type': 'ImageObject', url: 'https://cresoa.com.ng/icon.png' },
    },
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: url,
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cresoa.com.ng' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://cresoa.com.ng/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  }

  const faqSchema = faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  } : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <PostLayout post={post} faqs={faqs} relatedPosts={related}>
        <Content />
      </PostLayout>
    </>
  )
      }
