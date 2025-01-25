import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LoginForm } from "@/components/auth/LoginForm";
import { useLogin } from "@/hooks/auth/useLogin";

// Mock the custom hook
vi.mock("@/hooks/auth/useLogin", () => ({
  useLogin: vi.fn(() => ({
    email: "",
    setEmail: vi.fn(),
    password: "",
    setPassword: vi.fn(),
    errors: {},
    isSubmitting: false,
    handleSubmit: vi.fn(),
    handleForgotPassword: vi.fn(),
  })),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all form fields", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it("shows loading state when submitting", () => {
    vi.mocked(useLogin).mockReturnValue({
      ...vi.mocked(useLogin)(),
      isSubmitting: true,
    });

    render(<LoginForm />);

    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
  });

  it("displays validation errors", () => {
    vi.mocked(useLogin).mockReturnValue({
      ...vi.mocked(useLogin)(),
      errors: {
        email: "Invalid email",
        password: "Password required",
        submit: "Login failed",
      },
    });

    render(<LoginForm />);

    expect(screen.getByText("Invalid email")).toBeInTheDocument();
    expect(screen.getByText("Password required")).toBeInTheDocument();
    expect(screen.getByText("Login failed")).toBeInTheDocument();
  });

  it("calls handleSubmit on form submission", () => {
    const handleSubmit = vi.fn();
    vi.mocked(useLogin).mockReturnValue({
      ...vi.mocked(useLogin)(),
      handleSubmit,
    });

    render(<LoginForm />);

    fireEvent.submit(screen.getByRole("form"));

    expect(handleSubmit).toHaveBeenCalled();
  });

  it("updates email and password on input", () => {
    const setEmail = vi.fn();
    const setPassword = vi.fn();
    vi.mocked(useLogin).mockReturnValue({
      ...vi.mocked(useLogin)(),
      setEmail,
      setPassword,
    });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });

    expect(setEmail).toHaveBeenCalledWith("test@example.com");
    expect(setPassword).toHaveBeenCalledWith("password123");
  });

  it("calls handleForgotPassword when forgot password is clicked", () => {
    const handleForgotPassword = vi.fn();
    vi.mocked(useLogin).mockReturnValue({
      ...vi.mocked(useLogin)(),
      handleForgotPassword,
    });

    render(<LoginForm />);

    fireEvent.click(screen.getByText(/forgot password/i));

    expect(handleForgotPassword).toHaveBeenCalled();
  });
});
