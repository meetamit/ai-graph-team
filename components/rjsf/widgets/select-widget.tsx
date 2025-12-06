import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import type { WidgetProps } from "@rjsf/utils";

export function SelectWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, placeholder, options } = props;
  const enumOptions = (options.enumOptions ?? []) as { label: string; value: string }[];

  return (
    <div className="space-y-1">
      <Select
        value={value ?? ""}
        onValueChange={(val) => onChange(val)}
        disabled={disabled || readonly}
      >
        <SelectTrigger id={id} className="bg-transparent" >
          <SelectValue placeholder={placeholder ?? "Select..."} />
        </SelectTrigger>
        <SelectContent>
          {enumOptions.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

