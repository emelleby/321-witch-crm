import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type OrganizationType = "join" | "create";

interface OrganizationTypeFieldProps {
  value: OrganizationType;
  onChange: (value: OrganizationType) => void;
  label?: string;
  required?: boolean;
}

export function OrganizationTypeField({
  value,
  onChange,
  label = "Organization",
  required = true,
}: OrganizationTypeFieldProps) {
  return (
    <div className="grid gap-2" data-testid="organization-type-container">
      <Label data-testid="organization-type-label">{label}</Label>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        className="flex flex-col space-y-1"
        required={required}
        data-testid="organization-type-radio-group"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem
            value="join"
            id="join"
            data-testid="join-organization-radio"
          />
          <Label htmlFor="join" data-testid="join-organization-label">
            Join existing organization
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem
            value="create"
            id="create"
            data-testid="create-organization-radio"
          />
          <Label htmlFor="create" data-testid="create-organization-label">
            Create new organization
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
