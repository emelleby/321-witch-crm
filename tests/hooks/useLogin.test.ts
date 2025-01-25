import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useLogin } from "@/hooks/auth/useLogin";
import { useRouter } from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// Mock auth service
const mockAuthService = {
  signIn: vi.fn(),
  getUser: vi.fn(),
  getUserProfile: vi.fn(),
};

describe("useLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with empty values and no errors", () => {
    const { result } = renderHook(() =>
      useLogin({ authService: mockAuthService })
    );

    expect(result.current.email).toBe("");
    expect(result.current.password).toBe("");
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
  });

  it("updates email and password values", () => {
    const { result } = renderHook(() =>
      useLogin({ authService: mockAuthService })
    );

    act(() => {
      result.current.setEmail("test@example.com");
      result.current.setPassword("Password123!");
    });

    expect(result.current.email).toBe("test@example.com");
    expect(result.current.password).toBe("Password123!");
  });

  it("validates required fields", async () => {
    const { result } = renderHook(() =>
      useLogin({ authService: mockAuthService })
    );

    await act(async () => {
      const form = document.createElement("form");
      const event = { preventDefault: vi.fn(), currentTarget: form } as any;
      await result.current.handleSubmit(event);
    });

    expect(result.current.errors.email).toBe("Email is required");
    expect(result.current.errors.password).toBe("Password is required");
    expect(mockAuthService.signIn).not.toHaveBeenCalled();
  });

  it("validates email format", async () => {
    const { result } = renderHook(() =>
      useLogin({ authService: mockAuthService })
    );

    await act(async () => {
      result.current.setEmail("invalid-email");
      result.current.setPassword("Password123!");
      const form = document.createElement("form");
      const event = { preventDefault: vi.fn(), currentTarget: form } as any;
      await result.current.handleSubmit(event);
    });

    expect(result.current.errors.email).toBe("Invalid email address");
    expect(mockAuthService.signIn).not.toHaveBeenCalled();
  });

  it("handles successful login", async () => {
    const router = { push: vi.fn() };
    vi.mocked(useRouter).mockReturnValue(router);

    mockAuthService.signIn.mockResolvedValueOnce({
      user: { id: "test-user-id", email: "test@example.com" },
      error: null,
    });
    mockAuthService.getUserProfile.mockResolvedValueOnce({
      role: "customer",
    });

    const { result } = renderHook(() =>
      useLogin({ authService: mockAuthService })
    );

    await act(async () => {
      result.current.setEmail("test@example.com");
      result.current.setPassword("Password123!");
      const form = document.createElement("form");
      const event = { preventDefault: vi.fn(), currentTarget: form } as any;
      await result.current.handleSubmit(event);
    });

    expect(mockAuthService.signIn).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "Password123!",
    });
    expect(router.push).toHaveBeenCalledWith("/customer/dashboard");
  });

  it("handles login error", async () => {
    mockAuthService.signIn.mockResolvedValueOnce({
      user: null,
      error: new Error("Invalid credentials"),
    });

    const { result } = renderHook(() =>
      useLogin({ authService: mockAuthService })
    );

    await act(async () => {
      result.current.setEmail("test@example.com");
      result.current.setPassword("WrongPassword123!");
      const form = document.createElement("form");
      const event = { preventDefault: vi.fn(), currentTarget: form } as any;
      await result.current.handleSubmit(event);
    });

    expect(result.current.errors.submit).toBe("Invalid credentials");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("handles network error", async () => {
    mockAuthService.signIn.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() =>
      useLogin({ authService: mockAuthService })
    );

    await act(async () => {
      result.current.setEmail("test@example.com");
      result.current.setPassword("Password123!");
      const form = document.createElement("form");
      const event = { preventDefault: vi.fn(), currentTarget: form } as any;
      await result.current.handleSubmit(event);
    });

    expect(result.current.errors.submit).toBe("An error occurred during login");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("navigates to forgot password page", () => {
    const router = { push: vi.fn() };
    vi.mocked(useRouter).mockReturnValue(router);

    const { result } = renderHook(() =>
      useLogin({ authService: mockAuthService })
    );

    act(() => {
      result.current.handleForgotPassword();
    });

    expect(router.push).toHaveBeenCalledWith("/forgot-password");
  });
});
