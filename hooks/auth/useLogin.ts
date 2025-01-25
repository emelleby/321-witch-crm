import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/lib/services/auth";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { handlePostLoginRouting } from "@/utils/auth-routing";

interface LoginErrors {
  email?: string;
  password?: string;
  submit?: string;
}

interface UseLoginProps {
  authService?: AuthService;
}

export function useLogin({ authService }: UseLoginProps = {}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: LoginErrors = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      newErrors.email = "Invalid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      if (!validateForm()) {
        setIsSubmitting(false);
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const auth = authService || supabase.auth;
      const {
        data: { user },
        error: signInError,
      } = await auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      await handlePostLoginRouting(supabase, router);
    } catch (error) {
      console.error("Login Error:", error);
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : "An error occurred during login",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    router.push("/forgot-password");
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    errors,
    isSubmitting,
    handleSubmit,
    handleForgotPassword,
  };
}
