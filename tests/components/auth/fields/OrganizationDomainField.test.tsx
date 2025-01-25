import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OrganizationDomainField } from "@/components/auth/fields/OrganizationDomainField";

describe("OrganizationDomainField", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
  };

  it("renders with default props", () => {
    render(<OrganizationDomainField {...defaultProps} />);

    const input = screen.getByLabelText(
      /organization domain/i
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.required).toBe(true);
    expect(input.value).toBe("");
  });

  it("displays provided value", () => {
    render(<OrganizationDomainField {...defaultProps} value="witch.house" />);

    const input = screen.getByLabelText(/organization domain/i);
    expect(input).toHaveValue("witch.house");
  });

  it("calls onChange when value changes", () => {
    const onChange = vi.fn();
    render(<OrganizationDomainField {...defaultProps} onChange={onChange} />);

    const input = screen.getByLabelText(/organization domain/i);
    fireEvent.change(input, { target: { value: "company.com" } });

    expect(onChange).toHaveBeenCalledWith("company.com");
  });

  it("displays error message when provided", () => {
    render(
      <OrganizationDomainField {...defaultProps} error="Invalid domain" />
    );

    expect(screen.getByText("Invalid domain")).toBeInTheDocument();
  });

  it("can be optional", () => {
    render(<OrganizationDomainField {...defaultProps} required={false} />);

    const input = screen.getByLabelText(
      /organization domain/i
    ) as HTMLInputElement;
    expect(input.required).toBe(false);
  });

  it("uses custom label", () => {
    render(
      <OrganizationDomainField {...defaultProps} label="Company Domain" />
    );

    expect(screen.getByLabelText("Company Domain")).toBeInTheDocument();
  });

  it("uses custom placeholder", () => {
    render(
      <OrganizationDomainField {...defaultProps} placeholder="domain.com" />
    );

    expect(screen.getByPlaceholderText("domain.com")).toBeInTheDocument();
  });
});
