import { Alert } from "react-native";

/** Standard destructive confirmation (Cancel / <destructive action>). Replaces
 * the many hand-rolled Alert.alert delete/deactivate confirms across screens. */
export function confirmDestructive({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
}: {
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}
