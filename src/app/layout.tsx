import type { Metadata } from 'next'
import './globals.css';

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_CHATBOT_NAME || 'Chatbot Name',
  description: process.env.NEXT_PUBLIC_CHATBOT_DESCRIPTION || 'Chatbot Description',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
