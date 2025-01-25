import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  showRequirements?: boolean;
  minLength?: number;
  label?: string;
  placeholder?: string;
  autoComplete?: string;
}

export function PasswordField({
  value,
  onChange,
  error,
  required = true,
  showRequirements = true,
  minLength = 8,
  label = "Password",
  placeholder = "••••••••",
  autoComplete = "current-password",
}: PasswordFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="password">{label}</Label>
      <Input
        id="password"
        name="password"
        type="password"
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-errormessage={error ? "password-error" : undefined}
        data-testid="password-input"
        autoComplete={autoComplete}
      />
      {error ? (
        <p
          className="text-xs text-red-600"
          id="password-error"
          data-testid="password-error"
        >
          {error}
        </p>
      ) : showRequirements ? (
        <p
          className="text-muted-foreground text-sm"
          data-testid="password-requirements"
        >
          Password must be at least 8 characters and include uppercase, number,
          and special character
        </p>
      ) : null}
    </div>
  );
}
