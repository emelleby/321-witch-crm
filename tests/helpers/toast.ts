import { expect, type Page } from "@playwright/test";

/**
 * Helper function to wait for and verify toast content
 */
export async function expectToast(
  page: Page,
  options: {
    text: string;
    variant?: "default" | "destructive";
  }
) {
  // Look for any element containing the text (non-exact match)
  const element = page.getByText(options.text, { exact: false });

  // Wait for the text to be visible with a longer timeout
  await expect(element).toBeVisible({ timeout: 5000 });

  // Verify the text content
  await expect(element).toContainText(options.text);

  return element;
}

/**
 * Helper function to wait for success toast
 */
export async function expectSuccessToast(page: Page, text: string) {
  return expectToast(page, { text, variant: "default" });
}

/**
 * Helper function to wait for error toast
 */
export async function expectErrorToast(page: Page, text: string) {
  return expectToast(page, { text, variant: "destructive" });
}
