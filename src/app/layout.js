import './globals.css'

export const metadata = {
  title: 'Notion Words Dashboard',
  description: 'Interactive dashboard for reviewing words from Notion database',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}