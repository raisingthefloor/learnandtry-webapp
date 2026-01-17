import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import Footer from "@/components/footer"
import Navbar from "@/components/navbar"
import "./globals.css"
import { Suspense } from "react"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Learn and Try - Assistive Technology Tools",
  description:
    "Discover tools that could make technology easier. Get personalized suggestions or browse our directory.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable} ${jetbrainsMono.variable}`}>
        <div className="border-purple-200 bg-purple-50 cursor-pointer transition-all mb-0 mt-0">
          <Navbar />
          <Suspense fallback={<div>Loading...</div>}>
            <div className=" h-full">{children}</div>
          </Suspense>
          <Footer />
        </div>
        <Analytics />
      </body>
    </html>
  )
}
