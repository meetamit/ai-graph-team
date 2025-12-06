import { Input } from "@/components/ui/input";
import type { WidgetProps } from "@rjsf/utils";

export function TextWidget(props: WidgetProps) {
  const { id, value, type, disabled, readonly, onChange, placeholder, schema, options } = props;

  // RJSF expects `onChange` to be called with the raw value
  return (
    <div className="space-y-1">
      <Input
        id={id}
        type={type}
        min={type === "number" ? schema.minimum : undefined}
        max={type === "number" ? schema.maximum : undefined}
        value={value ?? ""}
        disabled={disabled || readonly}
        placeholder={(options as any)?.placeholder ?? placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent"
      />
    </div>
  );
}

