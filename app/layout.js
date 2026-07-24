export const metadata = {
  title: 'Cresoa',
  description: 'Fashion designer order & customer tracking platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
