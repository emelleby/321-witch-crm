import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { expectSuccessToast, expectErrorToast } from "../helpers/toast";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to wait for user creation and verify email
async function verifyUserEmail(supabase: any, email: string, maxAttempts = 5) {
  let user = null;
  let attempts = 0;

  while (!user && attempts < maxAttempts) {
    // Wait for user to be created
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const {
      data: { users },
    } = await supabase.auth.admin.listUsers();
    user = users.find((u: { email: string }) => u.email === email);
    attempts++;
  }

  if (!user) {
    throw new Error(`User not found after ${maxAttempts} attempts: ${email}`);
  }

  // Update user metadata to confirm email
  await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { email_confirmed_at: new Date().toISOString() },
    email_confirm: true,
  });

  return user;
}

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.waitForSelector('[data-testid="login-form"]', {
      state: "visible",
    });
  });

  test("user can register and login", async ({ page }) => {
    // Go to registration page
    await page.click('[data-testid="register-link"]');
    await expect(page).toHaveURL("/register");
    await page.waitForSelector('[data-testid="register-form"]', {
      state: "visible",
    });

    // Fill registration form
    await page.fill('[data-testid="fullName-input"]', "Test User");
    await page.fill('[data-testid="email-input"]', "test@example.com");
    await page.fill('[data-testid="password-input"]', "Test123!@#");
    await page.getByTestId("customer-radio").click();

    // Submit registration and wait for loading state
    await page.click('[data-testid="register-button"]');
    await expect(page.getByText("Creating Account...")).toBeVisible();

    // Should redirect to verify email page
    await expect(page).toHaveURL("/verify-email");

    // Wait for development mode alert to be visible
    await expect(page.getByTestId("development-mode-alert")).toBeVisible();

    // Get the user and manually confirm their email
    await verifyUserEmail(supabase, "test@example.com");

    // Refresh page to trigger verification check
    await page.reload();

    // Should redirect to customer dashboard
    await expect(page).toHaveURL("/customer/dashboard");

    // Logout
    await page.click('button[aria-label="Logout"]');
    await expect(page).toHaveURL("/login");

    // Login with new account
    await page.fill('[data-testid="email-input"]', "test@example.com");
    await page.fill('[data-testid="password-input"]', "Test123!@#");
    await page.click('[data-testid="login-submit"]');

    // Verify login success
    await expect(page).toHaveURL("/customer/dashboard");
  });

  test("shows validation errors for invalid input", async ({ page }) => {
    // Submit empty form
    await page.click('[data-testid="login-submit"]');

    // Wait for form validation to trigger
    await page.waitForTimeout(100);

    // Wait for error messages
    await expect(page.getByTestId("email-error")).toBeVisible();
    await expect(page.getByTestId("password-error")).toBeVisible();

    // Verify error messages
    await expect(page.getByTestId("email-error")).toContainText(
      "Email is required"
    );
    await expect(page.getByTestId("password-error")).toContainText(
      "Password is required"
    );

    // Submit invalid email
    await page.fill('[data-testid="email-input"]', "invalid-email");
    await page.click('[data-testid="login-submit"]');
    await page.waitForTimeout(100);
    await expect(page.getByTestId("email-error")).toContainText(
      "Invalid email address"
    );

    // Submit invalid password
    await page.fill('[data-testid="email-input"]', "test@example.com");
    await page.fill('[data-testid="password-input"]', "short");
    await page.click('[data-testid="login-submit"]');
    await page.waitForTimeout(100);
    await expect(page.getByTestId("password-error")).toContainText(
      "Password must be at least 8 characters"
    );
  });

  test("handles failed login attempts", async ({ page }) => {
    await page.fill('[data-testid="email-input"]', "nonexistent@example.com");
    await page.fill('[data-testid="password-input"]', "WrongPass123!");
    await page.click('[data-testid="login-submit"]');

    // Wait for error message
    await expect(page.getByTestId("login-error")).toBeVisible();
    await expect(page.getByTestId("login-error")).toContainText(
      "Invalid login credentials"
    );
    await expect(page).toHaveURL("/login");
  });
});
