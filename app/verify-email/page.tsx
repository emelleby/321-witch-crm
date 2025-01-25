"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import WitchHouseLogo from "@/public/images/Shapes 14.png";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

export default function VerifyEmailPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [email, setEmail] = useState<string | null>(null);
  const isDevelopment = process.env.NODE_ENV === "development";

  const handleVerifiedUser = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("No user found");
        return;
      }

      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("user_role")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      if (!profile) {
        console.error("No profile found");
        return;
      }

      console.log("Profile found:", profile);

      switch (profile.user_role) {
        case "admin":
          router.push("/admin/dashboard");
          break;
        case "agent":
          router.push("/agent/dashboard");
          break;
        case "customer":
          router.push("/customer/dashboard");
          break;
        default:
          router.push("/");
      }
    } catch (error) {
      console.error("Error in handleVerifiedUser:", error);
    }
  }, [supabase, router]);

  useEffect(() => {
    // Get the user's email from the session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email_confirmed_at) {
        // If email is already verified, route to the appropriate dashboard
        handleVerifiedUser();
      }
      setEmail(session?.user?.email ?? null);
    });
  }, [supabase, handleVerifiedUser]);

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
            />
            <h1 className="text-2xl font-bold tracking-tight">Witch House</h1>
          </div>
          <div className="w-full px-8">
            <div className="grid gap-6">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Check your email
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ve sent a verification link to{" "}
                    {email ? (
                      <span className="font-medium">{email}</span>
                    ) : (
                      "your email"
                    )}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click the link in the email to verify your account and
                  continue.
                </p>
              </div>

              {isDevelopment && (
                <Alert data-testid="development-mode-alert">
                  <AlertTitle>Development Mode Instructions</AlertTitle>
                  <AlertDescription>
                    <p className="text-sm text-muted-foreground mb-2">
                      Since you&apos;re running in development mode, you can:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
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
                      <li>
                        Or verify email through Supabase Studio at{" "}
                        <Link
                          href="http://127.0.0.1:54323"
                          target="_blank"
                          className="underline"
                        >
                          http://127.0.0.1:54323
                        </Link>{" "}
                        → Authentication → Users
                      </li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/login")}
                  data-testid="back-to-login-button"
                >
                  Back to login
                </Button>
                <div className="text-center text-sm">
                  Didn&apos;t receive the email?{" "}
                  <button
                    data-testid="resend-verification-email-button"
                    onClick={async () => {
                      if (email) {
                        await supabase.auth.resend({
                          type: "signup",
                          email: email,
                        });
                        alert("Verification email resent!");
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
  );
}
