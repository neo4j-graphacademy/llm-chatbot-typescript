import type { Metadata } from 'next'
import { Public_Sans } from 'next/font/google'

// import '@neo4j-ndl/base/lib/neo4j-ds-styles.css';
import './globals.css';

const font = Public_Sans({subsets: ['latin']})


export const metadata: Metadata = {
  title: 'Ebert',
  description: 'A Neo4j-backed Movie Recommendations Chatbot',
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
