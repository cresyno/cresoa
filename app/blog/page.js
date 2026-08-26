import Link from 'next/link'
import { blogPosts } from '../../lib/blogData'

export const metadata = {
  title: 'Blog | Cresoa',
  description: 'Practical business tips and guides for Nigerian SMEs.',
  openGraph: {
    title: 'Blog | Cresoa',
    description: 'Practical business tips and guides for Nigerian SMEs.',
    type: 'website',
    url: 'https://cresoa.com.ng/blog',
    siteName: 'Cresoa',
  },
  alternates: { canonical: '/blog' },
  robots: { index: true, follow: true },
}

export default function BlogIndexPage() {
  return (
    <div style={pageStyle}>
      <style>{`
        .blog-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--cresoa-accent); }
        .blog-card:hover h2 { color: var(--cresoa-accent); }
        .blog-card:hover .read-more { color: var(--cresoa-accent); }
      `}</style>

      <header style={headerStyle}>
        <p style={categoryStyle}>Cresoa Blog</p>
        <h1 style={titleStyle}>Business Insights for Nigerian SMEs</h1>
        <p style={subtitleStyle}>Practical guides to help you run your business better – from your phone.</p>
      </header>

      <div style={gridStyle}>
        {blogPosts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} style={cardStyle} className="blog-card">
            <div style={cardContentStyle}>
              <span style={badgeStyle}>{post.category}</span>
              <h2 style={cardTitleStyle}>{post.title}</h2>
              <p style={cardExcerptStyle}>{post.excerpt}</p>
              <div style={metaStyle}>
                <span>{formatDate(post.date)}</span>
                <span>•</span>
                <span>{post.readTime}</span>
              </div>
              <span className="read-more" style={readMoreStyle}>Read more →</span>
            </div>
          </Link>
        ))}
      </div>

      {blogPosts.length === 0 && (
        <div style={emptyStyle}><p>No blog posts yet. Check back soon!</p></div>
      )}
    </div>
  )
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const readMoreStyle = { display: 'inline-block', marginTop: '0.75rem', color: 'var(--cresoa-accent)', fontWeight: 700, fontSize: '0.9rem' }
const pageStyle = { maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem', background: 'var(--cresoa-bg)', minHeight: '100vh', color: 'var(--cresoa-text)', fontFamily: 'Inter, sans-serif' }
const headerStyle = { marginBottom: '2.5rem', borderBottom: '1px solid var(--cresoa-border)', paddingBottom: '1.5rem' }
const categoryStyle = { color: 'var(--cresoa-accent)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }
const titleStyle = { fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--cresoa-primary)', lineHeight: 1.2 }
const subtitleStyle = { color: 'var(--cresoa-text-muted)', fontSize: '1rem', margin: 0 }
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }
const cardStyle = { display: 'block', background: 'var(--cresoa-surface)', border: '1px solid var(--cresoa-border)', borderRadius: '12px', overflow: 'hidden', textDecoration: 'none', color: 'inherit', transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease', boxShadow: 'var(--shadow-sm)' }
const cardContentStyle = { padding: '1.2rem' }
const badgeStyle = { display: 'inline-block', background: 'var(--cresoa-accent-soft)', color: 'var(--cresoa-accent)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.75rem' }
const cardTitleStyle = { fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem', lineHeight: 1.3, color: 'var(--cresoa-text)', transition: 'color 0.2s ease' }
const cardExcerptStyle = { color: 'var(--cresoa-text-muted)', fontSize: '0.95rem', lineHeight: 1.5, margin: '0 0 1rem' }
const metaStyle = { display: 'flex', gap: '0.5rem', color: 'var(--cresoa-text-muted)', fontSize: '0.85rem', alignItems: 'center' }
const emptyStyle = { textAlign: 'center', padding: '3rem', color: 'var(--cresoa-text-muted)', background: 'var(--cresoa-surface)', borderRadius: '12px', border: '1px dashed var(--cresoa-border)' }
