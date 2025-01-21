'use client'

import WitchHouseLogo from "@/public/images/Shapes 14.png"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function VerifyEmailPage() {
    const router = useRouter()
    const supabase = createClient()
    const [email, setEmail] = useState<string | null>(null)
    const isDevelopment = process.env.NODE_ENV === 'development'

    useEffect(() => {
        // Get the user's email from the session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user?.email_confirmed_at) {
                // If email is already verified, route to the appropriate dashboard
                handleVerifiedUser()
            }
            setEmail(session?.user?.email ?? null)
        })
    }, [])

    const handleVerifiedUser = async () => {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .single()

        if (profile) {
            switch (profile.role) {
                case 'admin':
                    router.push('/admin/dashboard')
                    break
                case 'agent':
                    if (!profile.organization_id) {
                        router.push('/organization/setup')
                    } else {
                        router.push('/agent/dashboard')
                    }
                    break
                case 'customer':
                    router.push('/customer/dashboard')
                    break
                default:
                    router.push('/')
            }
        }
    }

    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="absolute inset-0 h-full w-full" style={{ transform: "translate3d(0, 0, 0)" }}></div>
            <div className="z-10 w-full max-w-lg">
                <div className="flex flex-col justify-center items-center space-y-6">
                    <div className="flex flex-col items-center space-y-2">
                        <Image
                            src={WitchHouseLogo}
                            alt="Witch House"
                            width={80}
                            height={80}
                        />
                        <h1 className="text-2xl font-bold tracking-tight">
                            Witch House
                        </h1>
                    </div>
                    <div className="w-full px-8">
                        <div className="grid gap-6">
                            <div className="flex flex-col items-center space-y-4 text-center">
                                <div className="space-y-2">
                                    <h1 className="text-2xl font-semibold tracking-tight">
                                        Check your email
                                    </h1>
                                    <p className="text-sm text-muted-foreground">
                                        We've sent a verification link to{" "}
                                        {email ? <span className="font-medium">{email}</span> : "your email"}
                                    </p>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Click the link in the email to verify your account and continue.
                                </p>
                            </div>

                            {isDevelopment && (
                                <Alert>
                                    <AlertTitle>Development Mode Instructions</AlertTitle>
                                    <AlertDescription>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Since you're running in development mode, you can:
                                        </p>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                            <li>View emails at <a href="http://127.0.0.1:54324" target="_blank" className="underline">http://127.0.0.1:54324</a></li>
                                            <li>Or verify email through Supabase Studio at <a href="http://127.0.0.1:54323" target="_blank" className="underline">http://127.0.0.1:54323</a> → Authentication → Users</li>
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-4">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => router.push('/login')}
                                >
                                    Back to login
                                </Button>
                                <div className="text-center text-sm">
                                    Didn't receive the email?{" "}
                                    <button
                                        onClick={async () => {
                                            if (email) {
                                                await supabase.auth.resend({
                                                    type: 'signup',
                                                    email: email,
                                                })
                                                alert('Verification email resent!')
                                            }
                                        }}
                                        className="underline underline-offset-4 hover:text-primary"
                                    >
                                        Click to resend
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 