import { useMutation, useQuery } from "@tanstack/react-query";

import {
  deleteMyAccountOnboardingAccountDelete,
  exportMyDataOnboardingExportGet,
  getProfileOnboardingProfileGet,
} from "@/lib/api/sdk.gen";

export type Profile = { display_name: string | null; email: string | null; id: string };

/** The onboarding profile carries the account email we confirm deletion against. */
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await getProfileOnboardingProfileGet({ throwOnError: true });
      return data as unknown as Profile;
    },
  });
}

export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await exportMyDataOnboardingExportGet({ throwOnError: true });
      return data as unknown;
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (confirmEmail: string) => {
      await deleteMyAccountOnboardingAccountDelete({
        body: { confirm_email: confirmEmail },
        throwOnError: true,
      });
    },
  });
}
