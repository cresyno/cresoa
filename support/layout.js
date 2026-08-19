import './globals.css' // Reuse your global styles

export default function SupportLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Support · Cresoa</title>
        <meta name="description" content="Submit a support ticket to the Cresoa team." />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
