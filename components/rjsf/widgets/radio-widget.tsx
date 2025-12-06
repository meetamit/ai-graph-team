import * as React from "react";
import type { WidgetProps } from "@rjsf/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export function RadioWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, options, onChange, onBlur, onFocus } = props;
  const enumOptions = (options.enumOptions ?? []) as { label: string; value: any; }[];
  const handleChange = (val: string) => { onChange(val); };

  const handleBlur = () => {
    if (onBlur) { onBlur(id, value); }
  };

  const handleFocus = () => {
    if (onFocus) { onFocus(id, value); }
  };

  const isDisabled = disabled || readonly;

  return (
    <RadioGroup
      id={id}
      value={value}
      onValueChange={handleChange}
      disabled={isDisabled}
      className="flex"
      onBlur={handleBlur}
      onFocus={handleFocus}
    >
      {enumOptions.map((opt, index) => {
        const optionId = `${id}-${index}`;
        const optionValue = opt.value;
        return (
          <div key={optionValue} className="flex items-center space-x-2">
            <RadioGroupItem value={optionValue} id={optionId} />
            <Label htmlFor={optionId} className="text-sm">
              {opt.label}
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
}

