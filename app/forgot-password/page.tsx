"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import WitchHouseLogo from "@/public/images/Shapes 14.png";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDevelopment = process.env.NODE_ENV === "development";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setIsSubmitted(true);
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="z-10 w-full max-w-lg px-8">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="flex flex-col items-center space-y-2">
              <Image
                src={WitchHouseLogo}
                alt="Witch House"
                width={80}
                height={80}
              />
              <h1 className="text-2xl font-bold tracking-tight">
                Check your email
              </h1>
            </div>

            <div className="space-y-4 text-center">
              <p className="text-muted-foreground">
                We&apos;ve sent a password reset link to{" "}
                <span className="font-medium">{email}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Click the link in the email to reset your password.
              </p>

              {isDevelopment && (
                <Alert className="mt-6">
                  <AlertTitle>Development Mode Instructions</AlertTitle>
                  <AlertDescription>
                    <p className="mb-2 text-sm text-muted-foreground">
                      Since you&apos;re running in development mode, you can:
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      <li>
                        View emails at{" "}
                        <Link
                          href="http://127.0.0.1:54324"
                          target="_blank"
                          className="underline"
                        >
                          http://127.0.0.1:54324
                        </Link>
                      </li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/login")}
              >
                Back to login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-transparent text-primary-foreground">
              <Image
                src={WitchHouseLogo}
                alt="Witch House"
                width={32}
                height={32}
              />
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
                  Enter your email and we&apos;ll send you a link to reset your
                  password
                </p>
              </div>

              <div className="grid gap-4">
                {error && (
                  <div className="text-center text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="wicked@witch.house"
                    required
                  />
                </div>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </Button>

                <div className="text-center">
                  <Button
                    variant="link"
                    className="text-sm"
                    onClick={() => router.push("/login")}
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
  );
}
