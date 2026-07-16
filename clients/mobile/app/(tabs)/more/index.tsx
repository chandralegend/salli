import { View, Text, Pressable } from "react-native";
import { Link } from "expo-router";
import {
  Percent,
  Bell,
  FileText,
  Upload,
  Settings,
  CreditCard,
  ChevronRight,
  Wallet,
  TrendingDown,
  PieChart,
  Shield,
  Repeat,
  FileBarChart,
  ScrollText,
} from "lucide-react-native";
import { ScreenShell, PageHeader, CardContainer } from "@/components/ui/page-shell";
import { useThemeColors } from "@/lib/theme";

const ITEMS = [
  { href: "/(tabs)/more/budget", label: "Budget", sub: "Category limits & variance", icon: Wallet },
  { href: "/(tabs)/more/debt", label: "Debt", sub: "Payoff plan & schedule", icon: TrendingDown },
  { href: "/(tabs)/more/portfolio", label: "Portfolio", sub: "Holdings & allocation", icon: PieChart },
  { href: "/(tabs)/more/insurance", label: "Insurance", sub: "Policies & coverage gaps", icon: Shield },
  { href: "/(tabs)/more/subscriptions", label: "Subscriptions", sub: "Recurring charges & alerts", icon: Repeat },
  { href: "/(tabs)/more/reports", label: "Reports", sub: "Balance sheet & net worth", icon: FileBarChart },
  { href: "/(tabs)/more/audit-log", label: "Audit Log", sub: "Agent decisions & params", icon: ScrollText },
  { href: "/(tabs)/more/tax", label: "Tax", sub: "Computation & bands", icon: Percent },
  { href: "/(tabs)/more/reminders", label: "Reminders", sub: "Filing calendar & deadlines", icon: Bell },
  { href: "/(tabs)/more/documents", label: "Documents", sub: "Agent notes & memories", icon: FileText },
  { href: "/(tabs)/more/statements", label: "Statements", sub: "Upload & approve", icon: Upload },
  { href: "/(tabs)/more/billing", label: "Billing", sub: "Plan & usage", icon: CreditCard },
  { href: "/(tabs)/more/settings", label: "Settings", sub: "Session & appearance", icon: Settings },
] as const;

export default function MoreScreen() {
  const theme = useThemeColors();

  return (
    <ScreenShell>
      <PageHeader title="More" subtitle="Tax, reminders, documents & settings" />

      <CardContainer className="p-0" style={{ padding: 0, overflow: "hidden" }}>
        {ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable
                className={`flex-row items-center gap-3.5 px-5 py-4 active:bg-muted ${
                  i === ITEMS.length - 1 ? "" : "border-b border-border"
                }`}
              >
                <View className="w-9 h-9 rounded-full bg-muted items-center justify-center">
                  <Icon color={theme.foreground} size={17} />
                </View>
                <View className="flex-1">
                  <Text className="text-foreground text-[14.5px]" style={{ fontFamily: "DMSans_700Bold" }}>
                    {item.label}
                  </Text>
                  <Text className="text-muted-foreground text-[12px] mt-0.5">{item.sub}</Text>
                </View>
                <ChevronRight color={theme.mutedForeground} size={18} />
              </Pressable>
            </Link>
          );
        })}
      </CardContainer>
    </ScreenShell>
  );
}
