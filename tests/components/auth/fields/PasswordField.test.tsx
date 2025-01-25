import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PasswordField } from "@/components/auth/fields/PasswordField";

describe("PasswordField", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
  };

  it("renders with default props", () => {
    render(<PasswordField {...defaultProps} />);

    const input = screen.getByLabelText(/password/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe("password");
    expect(input.required).toBe(true);
    expect(input.minLength).toBe(8);
  });

  it("displays provided value", () => {
    render(<PasswordField {...defaultProps} value="mypassword" />);

    const input = screen.getByLabelText(/password/i);
    expect(input).toHaveValue("mypassword");
  });

  it("calls onChange when value changes", () => {
    const onChange = vi.fn();
    render(<PasswordField {...defaultProps} onChange={onChange} />);

    const input = screen.getByLabelText(/password/i);
    fireEvent.change(input, { target: { value: "newpassword" } });

    expect(onChange).toHaveBeenCalledWith("newpassword");
  });

  it("displays error message when provided", () => {
    render(<PasswordField {...defaultProps} error="Password is too weak" />);

    expect(screen.getByText("Password is too weak")).toBeInTheDocument();
  });

  it("shows requirements text by default", () => {
    render(<PasswordField {...defaultProps} />);

    expect(
      screen.getByText(/must be at least 8 characters/i)
    ).toBeInTheDocument();
  });

  it("can hide requirements text", () => {
    render(<PasswordField {...defaultProps} showRequirements={false} />);

    expect(
      screen.queryByText(/must be at least 8 characters/i)
    ).not.toBeInTheDocument();
  });

  it("uses custom label", () => {
    render(<PasswordField {...defaultProps} label="New Password" />);

    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
  });

  it("uses custom placeholder", () => {
    render(<PasswordField {...defaultProps} placeholder="Enter password" />);

    expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
  });

  it("can be optional", () => {
    render(<PasswordField {...defaultProps} required={false} />);

    const input = screen.getByLabelText(/password/i) as HTMLInputElement;
    expect(input.required).toBe(false);
  });

  it("uses custom minLength", () => {
    render(<PasswordField {...defaultProps} minLength={12} />);

    const input = screen.getByLabelText(/password/i) as HTMLInputElement;
    expect(input.minLength).toBe(12);
  });
});
