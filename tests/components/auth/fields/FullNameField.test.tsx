import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FullNameField } from "@/components/auth/fields/FullNameField";

describe("FullNameField", () => {
  it("renders with default props", () => {
    render(<FullNameField />);

    const input = screen.getByLabelText(/full name/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.required).toBe(true);
    expect(input.value).toBe("");
  });

  it("displays provided value", () => {
    render(<FullNameField value="John Doe" />);

    const input = screen.getByLabelText(/full name/i);
    expect(input).toHaveValue("John Doe");
  });

  it("calls onChange when value changes", () => {
    const onChange = vi.fn();
    render(<FullNameField onChange={onChange} />);

    const input = screen.getByLabelText(/full name/i);
    fireEvent.change(input, { target: { value: "Jane Doe" } });

    expect(onChange).toHaveBeenCalledWith("Jane Doe");
  });

  it("displays error message when provided", () => {
    render(<FullNameField error="Name is required" />);

    expect(screen.getByText("Name is required")).toBeInTheDocument();
  });

  it("can be optional", () => {
    render(<FullNameField required={false} />);

    const input = screen.getByLabelText(/full name/i) as HTMLInputElement;
    expect(input.required).toBe(false);
  });

  it("has correct placeholder", () => {
    render(<FullNameField />);

    const input = screen.getByPlaceholderText("Salem Witch");
    expect(input).toBeInTheDocument();
  });
});
