import BlogContent from './BlogContent'
import { blogPosts } from '../../lib/blogData'

export const metadata = {
  title: 'Business Guides for Nigerian SMEs | Cresoa Blog',
  description: 'Practical guides on invoices, customer retention, marketing, and running a business in Nigeria. Written for tailors, repair shops, printers, and SMEs.',
  openGraph: {
    title: 'Business Guides for Nigerian SMEs | Cresoa Blog',
    description: 'Practical guides on invoices, customer retention, marketing, and running a business in Nigeria.',
    type: 'website',
    url: 'https://cresoa.com.ng/blog',
    siteName: 'Cresoa',
  },
  alternates: { canonical: '/blog' },
  robots: { index: true, follow: true },
}

const collectionSchema = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Cresoa Blog',
  description: 'Practical guides on invoices, customer retention, marketing, and running a business in Nigeria.',
  url: 'https://cresoa.com.ng/blog',
  isPartOf: { '@type': 'WebSite', name: 'Cresoa', url: 'https://cresoa.com.ng' },
}

const itemListSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: blogPosts.map((post, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    url: `https://cresoa.com.ng/blog/${post.slug}`,
    name: post.title,
  })),
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cresoa.com.ng' },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://cresoa.com.ng/blog' },
  ],
}

export default function BlogIndexPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <BlogContent posts={blogPosts} />
    </>
  )
}
