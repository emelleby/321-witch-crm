import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OrganizationNameField } from "@/components/auth/fields/OrganizationNameField";

describe("OrganizationNameField", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
  };

  it("renders with default props", () => {
    render(<OrganizationNameField {...defaultProps} />);

    const input = screen.getByLabelText(
      /organization name/i
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.required).toBe(true);
    expect(input.value).toBe("");
  });

  it("displays provided value", () => {
    render(
      <OrganizationNameField {...defaultProps} value="Witch House Inc." />
    );

    const input = screen.getByLabelText(/organization name/i);
    expect(input).toHaveValue("Witch House Inc.");
  });

  it("calls onChange when value changes", () => {
    const onChange = vi.fn();
    render(<OrganizationNameField {...defaultProps} onChange={onChange} />);

    const input = screen.getByLabelText(/organization name/i);
    fireEvent.change(input, { target: { value: "New Company" } });

    expect(onChange).toHaveBeenCalledWith("New Company");
  });

  it("displays error message when provided", () => {
    render(
      <OrganizationNameField {...defaultProps} error="Name is required" />
    );

    expect(screen.getByText("Name is required")).toBeInTheDocument();
  });

  it("can be optional", () => {
    render(<OrganizationNameField {...defaultProps} required={false} />);

    const input = screen.getByLabelText(
      /organization name/i
    ) as HTMLInputElement;
    expect(input.required).toBe(false);
  });

  it("uses custom label", () => {
    render(<OrganizationNameField {...defaultProps} label="Company Name" />);

    expect(screen.getByLabelText("Company Name")).toBeInTheDocument();
  });

  it("uses custom placeholder", () => {
    render(
      <OrganizationNameField
        {...defaultProps}
        placeholder="Enter company name"
      />
    );

    expect(
      screen.getByPlaceholderText("Enter company name")
    ).toBeInTheDocument();
  });
});
