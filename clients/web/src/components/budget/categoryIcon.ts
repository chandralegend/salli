import {
  Car,
  Home,
  ShoppingBag,
  Utensils,
  Wallet,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Best-effort glyph for a category name, mirroring the mobile per-row icons. */
export function categoryIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (/food|grocer|supermarket/.test(n)) return ShoppingBag;
  if (/rent|hous|mortgage|home/.test(n)) return Home;
  if (/transport|fuel|travel|vehicle|car/.test(n)) return Car;
  if (/dining|restaurant|entertain|cafe/.test(n)) return Utensils;
  if (/electric|water|util|ceb/.test(n)) return Zap;
  if (/internet|mobile|phone|subscription|stream/.test(n)) return Wifi;
  return Wallet;
}
