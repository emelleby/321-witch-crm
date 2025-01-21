'use client'

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import WitchHouseLogo from "@/public/images/Shapes 14.png"
import Image from "next/image"
import Link from "next/link"
import { notifications } from "@/utils/notifications"

export default function ResetPasswordPage() {
    const router = useRouter()
    const supabase = createClient()
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters")
            return
        }

        setIsSubmitting(true)

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) throw error

            notifications.success('Password updated successfully')
            router.push('/login')
        } catch (error) {
            console.error('Error:', error)
            setError(error instanceof Error ? error.message : 'An error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <Link href="/" className="flex items-center gap-2 font-medium">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-transparent text-primary-foreground">
                            <Image src={WitchHouseLogo} alt="Witch House" width={32} height={32} />
                        </div>
                        Witch House
                    </Link>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                            <div className="flex flex-col items-center gap-2 text-center">
                                <h1 className="text-2xl font-bold">Reset your password</h1>
                                <p className="text-balance text-sm text-muted-foreground">
                                    Enter your new password below
                                </p>
                            </div>

                            <div className="grid gap-4">
                                {error && (
                                    <div className="text-sm text-destructive text-center">
                                        {error}
                                    </div>
                                )}

                                <div className="grid gap-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        minLength={8}
                                        required
                                    />
                                    {password && password.length < 8 && (
                                        <p className="text-xs text-muted-foreground">
                                            Password must be at least 8 characters
                                        </p>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        minLength={8}
                                        required
                                    />
                                </div>

                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Updating..." : "Update Password"}
                                </Button>

                                <div className="text-center">
                                    <Button
                                        variant="link"
                                        className="text-sm"
                                        onClick={() => router.push('/login')}
                                    >
                                        Back to login
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <div className="relative hidden bg-background lg:block">
                <Image
                    src={WitchHouseLogo}
                    alt="Image"
                    className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.8]"
                    width={1000}
                    height={1000}
                />
            </div>
        </div>
    )
} 