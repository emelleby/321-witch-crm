import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmailFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  autoComplete?: string;
}

export function EmailField({
  value,
  onChange,
  error,
  required = true,
  autoComplete = "email",
}: EmailFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="email" data-testid="email-label">
        Email
      </Label>
      <Input
        id="email"
        name="email"
        type="email"
        placeholder="wicked@witch.house"
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-errormessage={error ? "email-error" : undefined}
        data-testid="email-input"
      />
      {error && (
        <p
          className="text-xs text-red-600"
          id="email-error"
          data-testid="email-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
