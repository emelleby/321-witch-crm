"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/utils/supabase/client";
import { validateEmail, validatePassword } from "@/lib/utils/validation";
import { AuthService, SupabaseAuthService } from "@/lib/services/auth";
import { useToast } from "@/hooks/use-toast";

interface UseRegistrationOptions {
  authService?: AuthService;
}

interface RegistrationErrors {
  email?: string;
  password?: string;
  fullName?: string;
  organizationName?: string;
  organizationDomain?: string;
  submit?: string;
}

export function useRegistration({ authService }: UseRegistrationOptions = {}) {
  const router = useRouter();
  const auth =
    authService ?? new SupabaseAuthService(createBrowserSupabaseClient());
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [userType, setUserType] = useState<"customer" | "agent">("customer");
  const [organizationType, setOrganizationType] = useState<"join" | "create">(
    "create"
  );
  const [organizationName, setOrganizationName] = useState("");
  const [organizationDomain, setOrganizationDomain] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Remove hasOrganization state and useEffect since we can derive it from userType
  const hasOrganization = userType === "agent";

  const validateForm = () => {
    const newErrors: RegistrationErrors = {};

    if (!fullName) {
      newErrors.fullName = "Full name is required";
    }

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Invalid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (!validatePassword(password)) {
      newErrors.password =
        "Password must be at least 8 characters and include uppercase, number, and special character";
    }

    if (hasOrganization && organizationType === "create") {
      if (!organizationName?.trim()) {
        newErrors.organizationName = "Organization name is required";
      }
      if (!organizationDomain?.trim()) {
        newErrors.organizationDomain = "Domain is required";
      } else if (!/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/.test(organizationDomain)) {
        newErrors.organizationDomain = "Invalid domain format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Clear previous errors
    setErrors({});

    // Validate form first
    if (!validateForm()) {
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Sign up the user
      const { userId, error: signUpError } = await auth.signUp({
        email,
        password,
        fullName,
        userType,
        organizationName:
          organizationType === "create" ? organizationName : null,
        organizationDomain:
          organizationType === "create" ? organizationDomain : null,
      });

      if (signUpError) {
        setErrors({
          submit: signUpError.message,
        });
        toast({
          title: "Registration Error",
          description: signUpError.message,
          variant: "destructive",
        });
        return;
      }

      if (!userId) {
        setErrors({
          submit: "No user ID returned from sign up",
        });
        toast({
          title: "Registration Error",
          description: "No user ID returned from sign up",
          variant: "destructive",
        });
        return;
      }

      // 2. Create organization and profile in a single transaction
      try {
        await auth.createUserAndOrganization({
          userId,
          fullName,
          role:
            hasOrganization && organizationType === "create"
              ? "admin"
              : userType,
          organizationName:
            organizationType === "create" ? organizationName : undefined,
          organizationDomain:
            organizationType === "create" ? organizationDomain : undefined,
        });
      } catch (error) {
        setErrors({
          submit:
            error instanceof Error
              ? error.message
              : "Failed to create user profile and organization",
        });
        toast({
          title: "Registration Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to create user profile and organization",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Registration successful!",
        description: "Please verify your email.",
      });

      // Redirect to verify email page
      router.push("/verify-email");
    } catch (error) {
      console.error("Registration Error:", error);
      if (error instanceof Error) {
        setErrors({
          submit: error.message,
        });
        toast({
          title: "Registration Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setErrors({
          submit: "An error occurred during registration",
        });
        toast({
          title: "Registration Error",
          description: "An error occurred during registration",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    fullName,
    setFullName,
    errors,
    userType,
    setUserType,
    organizationType,
    setOrganizationType,
    organizationName,
    setOrganizationName,
    organizationDomain,
    setOrganizationDomain,
    isSubmitting,
    handleSubmit,
  };
}
