export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/login', '/signup', '/forgot-password'],
    },
    sitemap: 'https://cresoa.vercel.app/sitemap.xml',
  }
}
