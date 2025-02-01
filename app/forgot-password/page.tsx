"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
                style={{ width: "auto", height: "80px" }}
                priority
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
    <div className="flex h-screen items-center justify-center bg-background">
      <div
        className="absolute inset-0 h-full w-full"
        style={{ transform: "translate3d(0, 0, 0)" }}
      ></div>
      <div className="z-10 w-full max-w-lg">
        <div className="flex flex-col justify-center items-center space-y-6">
          <div className="flex flex-col items-center space-y-2">
            <Image
              src={WitchHouseLogo}
              alt="Witch House"
              width={80}
              height={80}
              style={{ width: "auto", height: "80px" }}
              priority
            />
            <h1 className="text-2xl font-bold tracking-tight">Witch House</h1>
          </div>
          <div className="w-full px-8">
            <div className="grid gap-6">
              <div className="flex h-20 items-end pb-6 justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Forgot Password
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Enter your email to reset your password
                  </p>
                </div>
              </div>
              <ForgotPasswordForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
