"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useLogin } from "@/hooks/auth/useLogin";
import { cn } from "@/lib/utils";

import { EmailField } from "./fields/EmailField";
import { PasswordField } from "./fields/PasswordField";

interface LoginFormProps extends React.ComponentPropsWithoutRef<"form"> {
  className?: string;
}

export function LoginForm({ className, ...props }: LoginFormProps) {
  const {
    email,
    setEmail,
    password,
    setPassword,
    errors,
    isSubmitting,
    handleSubmit,
    handleForgotPassword,
  } = useLogin();

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
      role="form"
      data-testid="login-form"
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold" data-testid="login-title">
          Welcome back!
        </h1>
        <p
          className="text-balance text-sm text-muted-foreground"
          data-testid="login-subtitle"
        >
          Enter your email below to login to your account
        </p>
      </div>

      <div className="grid gap-6">
        {errors.submit && (
          <div
            className="text-sm text-destructive text-center"
            data-testid="login-error"
          >
            {errors.submit}
          </div>
        )}

        <EmailField
          value={email}
          onChange={setEmail}
          error={errors.email}
          autoComplete="email"
        />

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <PasswordField
              value={password}
              onChange={setPassword}
              error={errors.password}
              autoComplete="current-password"
            />
            <Button
              variant="link"
              className="text-xs"
              type="button"
              onClick={handleForgotPassword}
              data-testid="forgot-password-button"
            >
              Forgot password?
            </Button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
          data-testid="login-submit"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </div>

      <div
        className="text-center text-sm"
        data-testid="register-link-container"
      >
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="underline underline-offset-4"
          data-testid="register-link"
        >
          Sign up
        </Link>
      </div>
    </form>
  );
}
