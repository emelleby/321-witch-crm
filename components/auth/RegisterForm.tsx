"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useRegistration } from "@/hooks/auth/useRegistration";
import { cn } from "@/lib/utils";

import { AccountTypeSelector } from "./AccountTypeSelector";
import { EmailField } from "./fields/EmailField";
import { FullNameField } from "./fields/FullNameField";
import { OrganizationDomainField } from "./fields/OrganizationDomainField";
import { OrganizationNameField } from "./fields/OrganizationNameField";
import { OrganizationTypeField } from "./fields/OrganizationTypeField";
import { PasswordField } from "./fields/PasswordField";

export default function RegisterForm() {
  const {
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
  } = useRegistration();

  // Derive organization fields visibility
  const showOrganizationFields = userType === "agent";
  const showOrganizationDetails =
    showOrganizationFields && organizationType === "create";

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", "space-y-4")}
      data-testid="register-form"
    >
      <div className="grid gap-6">
        {errors.submit && (
          <div
            className="text-sm text-destructive text-center"
            data-testid="register-error"
          >
            {errors.submit}
          </div>
        )}

        <FullNameField
          value={fullName}
          onChange={setFullName}
          error={errors.fullName}
          data-testid="fullName-input"
        />
        <EmailField
          value={email}
          onChange={setEmail}
          error={errors.email}
          data-testid="email-input"
        />
        <PasswordField
          value={password}
          onChange={setPassword}
          error={errors.password}
          autoComplete="new-password"
          data-testid="password-input"
        />

        <AccountTypeSelector userType={userType} setUserType={setUserType} />

        {showOrganizationFields && (
          <div className="grid gap-4" data-testid="organization-fields">
            <OrganizationTypeField
              value={organizationType}
              onChange={setOrganizationType}
            />

            {showOrganizationDetails && (
              <>
                <OrganizationNameField
                  value={organizationName}
                  onChange={setOrganizationName}
                  error={errors.organizationName}
                  data-testid="organizationName-input"
                />
                <OrganizationDomainField
                  value={organizationDomain}
                  onChange={setOrganizationDomain}
                  error={errors.organizationDomain}
                  data-testid="organizationDomain-input"
                />
              </>
            )}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
          data-testid="register-button"
        >
          {isSubmitting ? "Creating Account..." : "Create Account"}
        </Button>

        <div className="text-center text-sm" data-testid="login-link-container">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
            data-testid="login-link"
          >
            Sign in
          </Link>
        </div>
      </div>
    </form>
  );
}
