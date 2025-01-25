import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RegisterForm from "@/components/auth/RegisterForm";
import { useRegistration } from "@/hooks/auth/useRegistration";

// Mock the custom hook
vi.mock("@/hooks/auth/useRegistration", () => ({
  useRegistration: vi.fn(() => ({
    email: "",
    setEmail: vi.fn(),
    password: "",
    setPassword: vi.fn(),
    errors: {},
    userType: "customer",
    setUserType: vi.fn(),
    organizationType: "create",
    setOrganizationType: vi.fn(),
    organizationName: "",
    setOrganizationName: vi.fn(),
    organizationDomain: "",
    setOrganizationDomain: vi.fn(),
    isSubmitting: false,
    handleSubmit: vi.fn(),
  })),
}));

// Mock child components
vi.mock("../../../components/auth/BasicInfoFields", () => ({
  BasicInfoFields: () => (
    <div data-testid="basic-info-fields">Basic Info Fields</div>
  ),
}));

vi.mock("../../../components/auth/AccountTypeSelector", () => ({
  AccountTypeSelector: () => (
    <div data-testid="account-type-selector">Account Type Selector</div>
  ),
}));

vi.mock("../../../components/auth/OrganizationFields", () => ({
  OrganizationFields: () => (
    <div data-testid="organization-fields">Organization Fields</div>
  ),
}));

vi.mock("../../../components/auth/SocialSignIn", () => ({
  SocialSignIn: () => <div data-testid="social-sign-in">Social Sign In</div>,
}));

describe("RegisterForm", () => {
  it("renders all form sections", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByTestId("account-type-selector")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
  });

  it("shows loading state when submitting", () => {
    vi.mocked(useRegistration).mockReturnValue({
      ...vi.mocked(useRegistration)(),
      isSubmitting: true,
    });

    render(<RegisterForm />);

    expect(
      screen.getByRole("button", { name: /creating account/i })
    ).toBeDisabled();
  });

  it("shows organization fields for agent user type", () => {
    vi.mocked(useRegistration).mockReturnValue({
      ...vi.mocked(useRegistration)(),
      userType: "agent",
    });

    render(<RegisterForm />);

    expect(screen.getByTestId("organization-fields")).toBeInTheDocument();
    expect(screen.getByText("Organization")).toBeInTheDocument();
  });

  it("shows organization details for agent with create type", () => {
    vi.mocked(useRegistration).mockReturnValue({
      ...vi.mocked(useRegistration)(),
      userType: "agent",
      organizationType: "create",
    });

    render(<RegisterForm />);

    expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/organization domain/i)).toBeInTheDocument();
  });

  it("hides organization details for agent with join type", () => {
    vi.mocked(useRegistration).mockReturnValue({
      ...vi.mocked(useRegistration)(),
      userType: "agent",
      organizationType: "join",
    });

    render(<RegisterForm />);

    expect(
      screen.queryByLabelText(/organization name/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/organization domain/i)
    ).not.toBeInTheDocument();
  });

  it("hides organization fields for customer user type", () => {
    vi.mocked(useRegistration).mockReturnValue({
      ...vi.mocked(useRegistration)(),
      userType: "customer",
    });

    render(<RegisterForm />);

    expect(screen.queryByTestId("organization-fields")).not.toBeInTheDocument();
  });

  it("displays validation errors", () => {
    vi.mocked(useRegistration).mockReturnValue({
      ...vi.mocked(useRegistration)(),
      userType: "agent",
      organizationType: "create",
      errors: {
        email: "Invalid email",
        password: "Password too short",
        organizationName: "Name required",
        organizationDomain: "Invalid domain",
      },
    });

    render(<RegisterForm />);

    expect(screen.getByText("Invalid email")).toBeInTheDocument();
    expect(screen.getByText("Password too short")).toBeInTheDocument();
    expect(screen.getByText("Name required")).toBeInTheDocument();
    expect(screen.getByText("Invalid domain")).toBeInTheDocument();
  });
});
