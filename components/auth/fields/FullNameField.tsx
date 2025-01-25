import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FullNameFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  error?: string;
}

export function FullNameField({
  value = "",
  onChange,
  required = true,
  error,
}: FullNameFieldProps) {
  return (
    <div className="grid gap-2" data-testid="fullName-container">
      <Label htmlFor="fullName" data-testid="fullName-label">
        Full Name
      </Label>
      <Input
        id="fullName"
        name="fullName"
        type="text"
        placeholder="Salem Witch"
        required={required}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        aria-invalid={!!error}
        aria-errormessage={error ? "fullName-error" : undefined}
        data-testid="fullName-input"
      />
      {error && (
        <p
          className="text-xs text-red-600"
          id="fullName-error"
          data-testid="fullName-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
