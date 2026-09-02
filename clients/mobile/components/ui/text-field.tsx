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

/**
 * The recurring boxed field: uppercase tracked-out label above the input.
 *
 * Brutalist, so the field IS its 2px ink border — but deliberately with no hard
 * shadow. A shadow on an input reads as "pressable", and there are up to six of
 * these stacked on the onboarding steps; six floating blocks in a column is
 * noise. Focus is shown by swapping the border to brand orange, which on a 2px
 * border is far more legible than it was on a hairline.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, optionalHint, active, rightIcon, className, style, ...props },
  ref,
) {
  const inner = (
    <>
      <Text
        className={cn(
          "mb-1 text-[11px] font-mono uppercase tracking-widest",
          active ? "text-salli-accent" : "text-muted-foreground",
        )}
      >
        {label}
        {optionalHint ? (
          <Text className="text-[13px] font-sans normal-case tracking-normal text-muted-foreground">
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
        "rounded-card border-2 bg-card px-4 py-3",
        active ? "border-salli-accent" : "border-foreground",
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
