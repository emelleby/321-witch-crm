import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface AccountTypeSelectorProps {
  userType: "customer" | "agent";
  setUserType: (value: "customer" | "agent") => void;
}

export function AccountTypeSelector({
  userType,
  setUserType,
}: AccountTypeSelectorProps) {
  return (
    <div className="grid gap-2" data-testid="account-type-selector">
      <Label>Account Type</Label>
      <RadioGroup
        value={userType}
        onValueChange={setUserType}
        className="flex flex-col space-y-1"
        data-testid="account-type-radio-group"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem
            value="customer"
            data-testid="customer-radio"
            id="customer"
            defaultChecked={true}
            className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
          <Label htmlFor="customer">Customer</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem
            value="agent"
            data-testid="agent-radio"
            id="agent"
            className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
          <Label htmlFor="agent">Support Agent</Label>
        </div>
      </RadioGroup>
    </div>
  );
}
