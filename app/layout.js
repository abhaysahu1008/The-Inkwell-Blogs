import './globals.css'

export const metadata = {
  title: 'The Inkwell — A Modern Blogging Platform',
  description: 'Share your stories with the world',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
