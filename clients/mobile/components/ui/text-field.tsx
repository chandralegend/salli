import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils";

/** Mirrors the pill inputs in clients/web/src/app/login/page.tsx */
export function TextField({ className, ...props }: TextInputProps & { className?: string }) {
  return (
    <TextInput
      placeholderTextColor="#7DA6A9"
      className={cn(
        "w-full px-4 py-3.5 border-[1.5px] border-border rounded-[14px] text-[15px] text-foreground bg-muted",
        className,
      )}
      style={{ fontFamily: "DMSans_400Regular" }}
      {...props}
    />
  );
}
