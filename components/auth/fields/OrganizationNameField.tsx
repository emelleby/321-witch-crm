import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface OrganizationNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function OrganizationNameField({
  value,
  onChange,
  error,
  label = "Organization Name",
  required = true,
  placeholder = "Witch House Inc.",
  className,
}: OrganizationNameFieldProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor="organizationName">{label}</Label>
      <Input
        id="organizationName"
        name="organizationName"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className={error ? "border-red-500" : ""}
        aria-invalid={!!error}
        aria-errormessage={error ? "organizationName-error" : undefined}
        data-testid="organizationName-input"
      />
      {error && (
        <p
          className="text-sm text-red-500"
          id="organizationName-error"
          data-testid="organizationName-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
