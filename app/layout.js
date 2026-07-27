export const metadata = {
  title: 'Cresoa',
  description: 'Fashion designer order & customer tracking platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "'Inter', -apple-system, sans-serif", margin: 0 }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
          h1, h2 { font-family: 'Fraunces', serif !important; }
        `}</style>
        {children}
      </body>
    </html>
  )
}
