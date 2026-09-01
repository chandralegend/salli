import { forwardRef, type ReactNode } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

import { cn } from "../../lib/utils";

type TextFieldProps = TextInputProps & {
  label: string;
  optionalHint?: string;
  active?: boolean; // draws the focused-blue border (mockup: Full Name field on Onboarding step 2)
  rightIcon?: ReactNode; // trailing glyph (mockup: DOB calendar, IRD chevron)
  className?: string;
};

/** The mockup's recurring boxed field: uppercase tracked-out label, value/input
 * below it, #1a1a1a fill, hairline border (blue when `active`). */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, optionalHint, active, rightIcon, className, style, ...props },
  ref,
) {
  const inner = (
    <>
      <Text
        className={cn(
          "mb-1 text-[13px] font-sans-medium uppercase tracking-wide",
          active ? "text-salli-accent" : "text-foreground/30",
        )}
      >
        {label}
        {optionalHint ? (
          <Text className="text-[13px] font-sans normal-case tracking-normal text-foreground/25">
            {" "}
            · {optionalHint}
          </Text>
        ) : null}
      </Text>
      <TextInput
        ref={ref}
        placeholderTextColor="rgba(128,128,128,0.5)"
        className="text-[17px] font-sans text-foreground"
        style={style}
        {...props}
      />
    </>
  );

  return (
    <View
      className={cn(
        "rounded-control border bg-card px-4 py-3",
        active ? "border-salli-accent" : "border-foreground/10",
        rightIcon ? "flex-row items-center justify-between" : undefined,
        className,
      )}
    >
      {rightIcon ? (
        <>
          <View className="flex-1">{inner}</View>
          {rightIcon}
        </>
      ) : (
        inner
      )}
    </View>
  );
});
