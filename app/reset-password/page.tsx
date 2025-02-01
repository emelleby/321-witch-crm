"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { useToast } from "@/hooks/use-toast";
import WitchHouseLogo from "@/public/images/Shapes 14.png";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully",
        variant: "default",
      });
      router.push("/login");
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

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
                    Reset Password
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Enter your new password
                  </p>
                </div>
              </div>
              <ResetPasswordForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
