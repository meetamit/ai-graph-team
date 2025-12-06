import { Textarea } from "@/components/ui/textarea";
import type { WidgetProps } from "@rjsf/utils";

export function TextareaWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, placeholder, options } = props;
  return <Textarea
    id={id}
    value={value ?? ""}
    disabled={disabled || readonly}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
  />;
}

