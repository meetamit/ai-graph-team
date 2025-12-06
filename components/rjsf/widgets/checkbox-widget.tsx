import { Checkbox } from "@/components/ui/checkbox";
import type { WidgetProps } from "@rjsf/utils";

export function CheckboxWidget({ id, value, disabled, readonly, onChange, label }: WidgetProps) {
  const checked = Boolean(value);
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled || readonly}
        onCheckedChange={(val) => onChange(Boolean(val))}
      />
      {label && <label htmlFor={id} className="text-sm">{label}</label>}
    </div>
  );
}

