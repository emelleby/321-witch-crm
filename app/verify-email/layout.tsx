import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Verify Email",
    description: "Verify your email address to continue",
}

export default function VerifyEmailLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
} 