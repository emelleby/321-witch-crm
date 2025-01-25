import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { expectSuccessToast, expectErrorToast } from "../helpers/toast";

// Initialize Supabase client with service role key for test cleanup
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

test.describe("Registration Flow", () => {
  // Clean up any test data before running tests
  test.beforeAll(async () => {
    // Delete test users and organizations
    await supabase
      .from("profiles")
      .delete()
      .like("email", "%@example.com")
      .or(
        "email.like.%@newcompany.com,email.like.%@different.com,email.like.%@multiagent.com"
      );

    await supabase
      .from("organizations")
      .delete()
      .filter("domain", "in", ["newcompany.com", "multiagent.com"]);
  });

  // Clean up after each test
  test.afterEach(async () => {
    // Delete test users and organizations
    await supabase
      .from("profiles")
      .delete()
      .like("email", "%@example.com")
      .or(
        "email.like.%@newcompany.com,email.like.%@different.com,email.like.%@multiagent.com"
      );

    await supabase
      .from("organizations")
      .delete()
      .filter("domain", "in", ["newcompany.com", "multiagent.com"]);
  });

  test.beforeEach(async ({ page }) => {
    // Ensure we start fresh
    await page.goto("/register");
    await page.waitForSelector('[data-testid="register-form"]', {
      state: "visible",
    });
  });

  // Helper function to wait for user creation and verify email
  async function verifyUserEmail(
    supabase: any,
    email: string,
    maxAttempts = 5
  ) {
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

  test("customer registration", async ({ page }) => {
    // Fill in registration form
    await page.fill('[data-testid="fullName-input"]', "Test User");
    await page.fill('[data-testid="email-input"]', "customer@example.com");
    await page.fill('[data-testid="password-input"]', "Test123!@#");

    // Select customer type
    await page.getByTestId("customer-radio").click();

    // Submit form and wait for loading state
    await page.click('[data-testid="register-button"]');
    await expect(page.getByText("Creating Account...")).toBeVisible();

    // Should redirect to verify email page
    await expect(page).toHaveURL("/verify-email");

    // Wait for development mode alert to be visible
    await expect(page.getByTestId("development-mode-alert")).toBeVisible();

    // Get the user and manually confirm their email
    await verifyUserEmail(supabase, "customer@example.com");

    // Refresh page to trigger verification check
    await page.reload();

    // Should redirect to customer dashboard
    await expect(page).toHaveURL("/customer/dashboard");
  });

  test("agent registration with new organization", async ({ page }) => {
    // Fill in registration form
    await page.fill('[data-testid="fullName-input"]', "Test Agent");
    await page.fill('[data-testid="email-input"]', "agent@newcompany.com");
    await page.fill('[data-testid="password-input"]', "Test123!@#");

    // Select agent type
    await page.getByTestId("agent-radio").click();

    // Select "Create new organization"
    await page.getByTestId("create-organization-radio").click();

    // Fill organization details
    await page.fill('[data-testid="organizationName-input"]', "New Company");
    await page.fill(
      '[data-testid="organizationDomain-input"]',
      "newcompany.com"
    );

    // Submit form
    await page.click('[data-testid="register-button"]');

    // Should redirect to verify email page
    await expect(page).toHaveURL("/verify-email");

    // Wait for development mode alert to be visible
    await expect(page.getByTestId("development-mode-alert")).toBeVisible();

    // Get the user and manually confirm their email
    await verifyUserEmail(supabase, "agent@newcompany.com");

    // Refresh page to trigger verification check
    await page.reload();

    // Should redirect to admin dashboard
    await expect(page).toHaveURL("/admin/dashboard");
  });

  test("agent registration with mismatched email domain", async ({ page }) => {
    // Fill in registration form
    await page.fill('[data-testid="fullName-input"]', "Test Agent");
    await page.fill('[data-testid="email-input"]', "agent@wrongdomain.com");
    await page.fill('[data-testid="password-input"]', "Test123!@#");

    // Select agent type
    await page.getByTestId("agent-radio").click();

    // Select "Create new organization"
    await page.getByTestId("create-organization-radio").click();

    // Fill organization details with mismatched domain
    await page.fill('[data-testid="organizationName-input"]', "New Company");
    await page.fill(
      '[data-testid="organizationDomain-input"]',
      "newcompany.com"
    );

    // Submit form with mismatched domain
    await page.click('[data-testid="register-button"]');

    await expect(page).toHaveURL("/register");
  });

  test("agent joining existing organization", async ({ page }) => {
    // First create an organization with an admin
    await page.goto("/register");
    await page.waitForSelector('[data-testid="register-form"]');

    await page.fill('[data-testid="fullName-input"]', "First Admin");
    await page.fill('[data-testid="email-input"]', "admin@newcompany.com");
    await page.fill('[data-testid="password-input"]', "Test123!@#");

    // Select agent type and wait for organization fields
    await page.getByTestId("agent-radio").click();
    await page.waitForSelector('[data-testid="organization-fields"]');

    // Select "Create new organization"
    await page.getByTestId("create-organization-radio").click();

    await page.fill('[data-testid="organizationName-input"]', "New Company");
    await page.fill(
      '[data-testid="organizationDomain-input"]',
      "newcompany.com"
    );

    // Submit form and wait for loading state
    await page.click('[data-testid="register-button"]');
    await expect(page.getByText("Creating Account...")).toBeVisible();

    // Should redirect to verify email page
    await expect(page).toHaveURL("/verify-email");

    // Wait for development mode alert to be visible
    await expect(page.getByTestId("development-mode-alert")).toBeVisible();

    // Get the admin user and manually confirm their email
    await verifyUserEmail(supabase, "admin@newcompany.com");

    // Refresh page to trigger verification check
    await page.reload();

    // Should redirect to admin dashboard
    await expect(page).toHaveURL("/admin/dashboard");

    // Now test second agent joining
    await page.goto("/register");
    await page.waitForSelector('[data-testid="register-form"]');

    await page.fill('[data-testid="fullName-input"]', "Second Agent");
    await page.fill('[data-testid="email-input"]', "agent2@newcompany.com");
    await page.fill('[data-testid="password-input"]', "Test123!@#");

    // Select agent type and wait for organization fields
    await page.getByTestId("agent-radio").click();
    await page.waitForSelector('[data-testid="organization-fields"]');

    // Select "Join existing organization"
    await page.getByTestId("join-organization-radio").click();

    // Fill organization domain and wait for auto-fill
    await page.fill(
      '[data-testid="organizationDomain-input"]',
      "newcompany.com"
    );
    await expect(
      page.locator('[data-testid="organizationName-input"]')
    ).toHaveValue("New Company");
    await expect(
      page.locator('[data-testid="organizationName-input"]')
    ).toBeDisabled();

    // Submit form and wait for loading state
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL("/verify-email");

    // Wait for development mode alert to be visible
    await expect(page.getByTestId("development-mode-alert")).toBeVisible();

    // Get the second agent and manually confirm their email
    await verifyUserEmail(supabase, "agent2@newcompany.com");

    // Refresh page to trigger verification check
    await page.reload();

    // Should redirect to agent dashboard
    await expect(page).toHaveURL("/agent/dashboard");
  });

  test("validates password requirements", async ({ page }) => {
    await page.fill('[data-testid="fullName-input"]', "Test User");
    await page.fill('[data-testid="email-input"]', "test@example.com");

    // Test missing uppercase
    await page.fill('[data-testid="password-input"]', "lowercase123!");
    await page.click('[data-testid="register-button"]');
    await expect(page.getByTestId("password-error")).toBeVisible();
    await expect(page.getByTestId("password-error")).toContainText("uppercase");

    // Test missing number
    await page.fill('[data-testid="password-input"]', "NoNumber!");
    await page.click('[data-testid="register-button"]');
    await expect(page.getByTestId("password-error")).toBeVisible();
    await expect(page.getByTestId("password-error")).toContainText("number");

    // Test missing special character
    await page.fill('[data-testid="password-input"]', "NoSpecial123");
    await page.click('[data-testid="register-button"]');
    await expect(page.getByTestId("password-error")).toBeVisible();
    await expect(page.getByTestId("password-error")).toContainText(
      "special character"
    );
  });

  test("validates organization name requirements", async ({ page }) => {
    // Fill basic info
    await page.fill('[data-testid="fullName-input"]', "Test Agent");
    await page.fill('[data-testid="email-input"]', "agent@newcompany.com");
    await page.fill('[data-testid="password-input"]', "Test123!@#");

    // Select agent type and wait for organization fields
    await page.getByTestId("agent-radio").click();
    await page.waitForSelector('[data-testid="organization-fields"]');

    // Select "Create new organization"
    await page.getByTestId("create-organization-radio").click();

    // Fill organization domain but leave name empty
    await page.fill(
      '[data-testid="organizationDomain-input"]',
      "newcompany.com"
    );

    // Submit form
    await page.click('[data-testid="register-button"]');

    // Wait for error message
    await expect(page.getByTestId("organizationName-error")).toBeVisible();
    await expect(page.getByTestId("organizationName-error")).toContainText(
      "Organization name is required"
    );

    // Verify we stay on the registration page
    await expect(page).toHaveURL("/register");
  });

  test("multiple agents can join same organization", async ({ page }) => {
    // First create an organization and admin
    await page.goto("/register");
    await page.waitForSelector('[data-testid="register-form"]');

    await page.fill('[data-testid="fullName-input"]', "First Admin");
    await page.fill('[data-testid="email-input"]', "admin@multiagent.com");
    await page.fill('[data-testid="password-input"]', "Test123!@#");

    // Select agent type and wait for organization fields
    await page.getByTestId("agent-radio").click();
    await page.waitForSelector('[data-testid="organization-fields"]');

    // Select "Create new organization"
    await page.getByTestId("create-organization-radio").click();

    await page.fill(
      '[data-testid="organizationName-input"]',
      "Multi Agent Org"
    );
    await page.fill(
      '[data-testid="organizationDomain-input"]',
      "multiagent.com"
    );

    // Submit form and wait for loading state
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL("/verify-email");

    // Simulate email verification for admin
    await verifyUserEmail(supabase, "admin@multiagent.com");

    // Register second agent
    await page.goto("/register");
    await page.waitForSelector('[data-testid="register-form"]');

    await page.fill('[data-testid="fullName-input"]', "Second Agent");
    await page.fill('[data-testid="email-input"]', "agent2@multiagent.com");
    await page.fill('[data-testid="password-input"]', "Test123!@#");
    await page.getByTestId("agent-radio").click();

    // Organization fields should appear and auto-fill
    await page.waitForSelector('[data-testid="organizationDomain-input"]', {
      state: "visible",
    });
    await page.fill(
      '[data-testid="organizationDomain-input"]',
      "multiagent.com"
    );

    // Organization name should auto-fill and be disabled
    await expect(
      page.locator('[data-testid="organizationName-input"]')
    ).toHaveValue("Multi Agent Org");
    await expect(
      page.locator('[data-testid="organizationName-input"]')
    ).toBeDisabled();

    await page.click('[data-testid="register-button"]');

    // Register third agent
    await page.goto("/register");
    await page.waitForSelector('[data-testid="register-form"]');

    await page.fill('[data-testid="fullName-input"]', "Third Agent");
    await page.fill('[data-testid="email-input"]', "agent3@multiagent.com");
    await page.fill('[data-testid="password-input"]', "Test123!@#");
    await page.getByTestId("agent-radio").click();

    await page.waitForSelector('[data-testid="organizationDomain-input"]', {
      state: "visible",
    });
    await page.fill(
      '[data-testid="organizationDomain-input"]',
      "multiagent.com"
    );

    await expect(
      page.locator('[data-testid="organizationName-input"]')
    ).toHaveValue("Multi Agent Org");
    await expect(
      page.locator('[data-testid="organizationName-input"]')
    ).toBeDisabled();

    await page.click('[data-testid="register-button"]');

    // Verify all users are in same organization
    const { data: users } = await supabase
      .from("profiles")
      .select("organization_id")
      .in("email", [
        "admin@multiagent.com",
        "agent2@multiagent.com",
        "agent3@multiagent.com",
      ]);

    expect(users).toHaveLength(3);
    const orgIds = new Set(users?.map((u) => u.organization_id));
    expect(orgIds.size).toBe(1); // All users should be in same org
  });
});
