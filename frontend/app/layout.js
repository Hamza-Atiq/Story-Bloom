// Root layout — wraps every page in the app
// This is a Server Component (no 'use client' needed here)

import './globals.css'

export const metadata = {
  title: 'StoryBloom ✨',
  description: 'An AI-powered magical storytelling adventure for children',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#0f0a1e] text-white min-h-screen overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}
