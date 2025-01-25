import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OrganizationTypeField } from "@/components/auth/fields/OrganizationTypeField";

describe("OrganizationTypeField", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
  };

  it("renders with default props", () => {
    render(<OrganizationTypeField {...defaultProps} />);

    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getByText("Join existing organization")).toBeInTheDocument();
    expect(screen.getByText("Create new organization")).toBeInTheDocument();
  });

  it("displays selected value", () => {
    render(<OrganizationTypeField {...defaultProps} value="join" />);

    expect(screen.getByText("Join existing organization")).toBeInTheDocument();
  });

  it("calls onChange when value changes", () => {
    const onChange = vi.fn();
    render(<OrganizationTypeField {...defaultProps} onChange={onChange} />);

    fireEvent.click(screen.getByText("Create new organization"));

    expect(onChange).toHaveBeenCalledWith("create");
  });

  it("uses custom label", () => {
    render(<OrganizationTypeField {...defaultProps} label="Company Type" />);

    expect(screen.getByText("Company Type")).toBeInTheDocument();
  });

  it("can be optional", () => {
    render(<OrganizationTypeField {...defaultProps} required={false} />);

    const select = screen.getByRole("radiogroup");
    expect(select).not.toHaveAttribute("required");
  });
});
