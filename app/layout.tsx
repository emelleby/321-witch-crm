import { Geist } from "next/font/google"
import { ThemeProvider } from "next-themes"
import Link from "next/link"
import { ThemeSwitcher } from "@/components/theme-switcher"
import "./globals.css"
import { Toaster } from "sonner"

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
})

export const metadata = {
  title: "Witch House",
  description: "A modern customer support platform",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={geistSans.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}
