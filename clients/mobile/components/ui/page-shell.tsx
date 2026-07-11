import { View, Text, ScrollView, type ViewProps } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { cn } from "@/lib/utils";

// ── ScreenShell ───────────────────────────────────────────────────────────────

interface ScreenShellProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Safe-area edges to inset for. Defaults to top+left+right — screens that
   * sit under a native Stack header (e.g. everything in (tabs)/more/*, which
   * already gets top-inset from the header) should pass `edges={["left","right"]}`
   * to avoid double top spacing between the header and the content.
   */
  edges?: readonly Edge[];
}

// Content is allowed to scroll underneath the floating dock (see
// FloatingTabBar) — its blur + gradient backdrop fades content out
// gracefully as it approaches the bottom, so no hard clearance is reserved
// here. A little extra bottom padding just gives the last item room to clear
// the dock's opaque pill rather than sitting flush behind it.
export function ScreenShell({ children, className, edges = ["top", "left", "right"] }: ScreenShellProps) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={edges}>
      <ScrollView
        className={cn("flex-1", className)}
        contentContainerStyle={{ padding: 20, paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  actions,
  titleSize = 30,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Reduce for long titles (e.g. "Financial Independence") that would otherwise wrap. */
  titleSize?: number;
}) {
  return (
    <View className="flex-row items-end justify-between mb-5 gap-4">
      <View className="flex-1">
        <Text
          className="text-foreground"
          style={{ fontFamily: "DMSans_900Black", fontSize: titleSize, letterSpacing: -1, lineHeight: titleSize + 4 }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text className="text-muted-foreground text-[12px] mt-1.5 font-medium">{subtitle}</Text>
        )}
      </View>
      {actions && <View className="flex-row items-center gap-2 shrink-0">{actions}</View>}
    </View>
  );
}

// ── CardContainer ─────────────────────────────────────────────────────────────

export function CardContainer({
  title,
  children,
  className,
  style,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  style?: ViewProps["style"];
}) {
  return (
    <View className={cn("bg-card rounded-card p-5", className)} style={style}>
      {title && (
        <Text className="text-foreground text-[14px] mb-3" style={{ fontFamily: "DMSans_700Bold", letterSpacing: -0.3 }}>
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}

// ── SectionTitle ──────────────────────────────────────────────────────────────

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground mb-2 mt-1">
      {children}
    </Text>
  );
}
