import { describe, it, expect } from "vitest";
import { validateEmail, validatePassword } from "@/lib/utils/validation";

describe("Validation Utils", () => {
  describe("validateEmail", () => {
    it("returns true for valid email addresses", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name+tag@example.co.uk")).toBe(true);
      expect(validateEmail("test.email@subdomain.example.com")).toBe(true);
    });

    it("returns false for invalid email addresses", () => {
      expect(validateEmail("")).toBe(false);
      expect(validateEmail("invalid")).toBe(false);
      expect(validateEmail("test@")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("test@.com")).toBe(false);
    });
  });

  describe("validatePassword", () => {
    it("returns true for valid passwords", () => {
      expect(validatePassword("Password123!")).toBe(true);
      expect(validatePassword("Complex1!Password")).toBe(true);
      expect(validatePassword("Abcd1234!@")).toBe(true);
    });

    it("returns false for invalid passwords", () => {
      expect(validatePassword("")).toBe(false);
      expect(validatePassword("short1!")).toBe(false);
      expect(validatePassword("nodigits!")).toBe(false);
      expect(validatePassword("NoSpecial1")).toBe(false);
      expect(validatePassword("nouppercase1!")).toBe(false);
    });
  });
});
