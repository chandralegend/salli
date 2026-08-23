import { useWindowDimensions } from "react-native";

/** iPad mini's portrait width (744pt) is the narrowest tablet; standard iPads
 * run 810-820pt. 700pt sits safely between the widest phones (iPhone 17 Pro
 * Max is ~440pt) and iPad mini, so it cleanly separates "phone" from "tablet"
 * without needing Platform.isPad (which misses iPad Split View/Slide Over,
 * where the app can run at a phone-like width on tablet hardware). */
const TABLET_BREAKPOINT = 700;

export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= TABLET_BREAKPOINT;
}
