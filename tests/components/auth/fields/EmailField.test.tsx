import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { EmailField } from "@/components/auth/fields/EmailField";

describe("EmailField", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
  };

  it("renders with required props", () => {
    render(<EmailField {...defaultProps} />);

    const input = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe("email");
    expect(input.required).toBe(true);
  });

  it("displays provided value", () => {
    render(<EmailField {...defaultProps} value="test@example.com" />);

    const input = screen.getByLabelText(/email/i);
    expect(input).toHaveValue("test@example.com");
  });

  it("calls onChange when value changes", () => {
    const onChange = vi.fn();
    render(<EmailField {...defaultProps} onChange={onChange} />);

    const input = screen.getByLabelText(/email/i);
    fireEvent.change(input, { target: { value: "new@example.com" } });

    expect(onChange).toHaveBeenCalledWith("new@example.com");
  });

  it("displays error message when provided", () => {
    render(<EmailField {...defaultProps} error="Invalid email" />);

    expect(screen.getByText("Invalid email")).toBeInTheDocument();
  });

  it("can be optional", () => {
    render(<EmailField {...defaultProps} required={false} />);

    const input = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(input.required).toBe(false);
  });

  it("has correct placeholder", () => {
    render(<EmailField {...defaultProps} />);

    const input = screen.getByPlaceholderText("wicked@witch.house");
    expect(input).toBeInTheDocument();
  });

  it("uses provided autoComplete value", () => {
    render(<EmailField {...defaultProps} autoComplete="new-email" />);

    const input = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(input.autocomplete).toBe("new-email");
  });
});
