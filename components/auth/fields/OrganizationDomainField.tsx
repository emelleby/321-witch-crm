import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface OrganizationDomainFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function OrganizationDomainField({
  value,
  onChange,
  error,
  label = "Organization Domain",
  required = true,
  placeholder = "company.com",
  className,
}: OrganizationDomainFieldProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor="organizationDomain">{label}</Label>
      <Input
        id="organizationDomain"
        name="organizationDomain"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className={error ? "border-red-500" : ""}
        aria-invalid={!!error}
        aria-errormessage={error ? "organizationDomain-error" : undefined}
        data-testid="organizationDomain-input"
      />
      {error && (
        <p
          className="text-sm text-red-500"
          id="organizationDomain-error"
          data-testid="organizationDomain-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
