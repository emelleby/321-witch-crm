import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AccountTypeSelector } from "@/components/auth/AccountTypeSelector";

describe("AccountTypeSelector", () => {
  const defaultProps = {
    userType: "customer" as const,
    setUserType: vi.fn(),
  };

  it("renders both customer and agent options", () => {
    render(<AccountTypeSelector {...defaultProps} />);

    expect(screen.getByLabelText(/customer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/support agent/i)).toBeInTheDocument();
  });

  it("selects customer by default", () => {
    render(<AccountTypeSelector {...defaultProps} />);

    const customerRadio = screen.getByRole("radio", { name: /customer/i });
    const agentRadio = screen.getByRole("radio", { name: /support agent/i });

    expect(customerRadio).toHaveAttribute("data-state", "checked");
    expect(agentRadio).toHaveAttribute("data-state", "unchecked");
  });

  it("calls setUserType when selection changes", () => {
    const setUserType = vi.fn();
    render(<AccountTypeSelector {...defaultProps} setUserType={setUserType} />);

    fireEvent.click(screen.getByLabelText(/support agent/i));

    expect(setUserType).toHaveBeenCalledWith("agent");
  });

  it("reflects the provided userType", () => {
    render(<AccountTypeSelector userType="agent" setUserType={vi.fn()} />);

    const customerRadio = screen.getByRole("radio", { name: /customer/i });
    const agentRadio = screen.getByRole("radio", { name: /support agent/i });

    expect(customerRadio).toHaveAttribute("data-state", "unchecked");
    expect(agentRadio).toHaveAttribute("data-state", "checked");
  });
});
