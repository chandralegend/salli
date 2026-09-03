import { Text, View } from "react-native";

import { Chip, Hero, Rule, SectionLabel, Strong } from "@/components/ui/blocks";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useAuditLog } from "@/hooks/useAuditLog";
import { formatDateTime } from "@/lib/format";

/** A tool call's params as mono key/value rows. Mono because these are the
 *  literal arguments the agent sent, not prose. */
function ParamRows({ params }: { params: Record<string, unknown> }) {
  const entries = Object.entries(params ?? {});
  if (entries.length === 0) return null;
  return (
    <View className="mt-2.5 gap-1 border-t border-foreground/15 pt-2.5">
      {entries.map(([key, value]) => (
        <View key={key} className="flex-row justify-between gap-3">
          <Text className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {key.replace(/_/g, " ")}
          </Text>
          <Text numberOfLines={1} className="min-w-0 flex-1 text-right text-[13px] text-foreground">
            {typeof value === "object" ? JSON.stringify(value) : String(value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Every write the agent asked to make, and what you decided.
 *
 * The three-box summary strip (Total / Approved / Denied) is one sentence now,
 * and the All/Approved/Denied filter pills are gone with it: the counts are in
 * the sentence, and an audit log's job is to be read in order.
 *
 * Colour marks the exception only. A denied row is outlined and chipped in
 * destructive red; an approved row gets a plain chip. Accenting every approved
 * row — which is nearly all of them — would make the colour decorative.
 */
export default function AuditLogScreen() {
  const entries = useAuditLog();

  const all = entries.data ?? [];
  const denied = all.filter((e) => e.decision === "denied").length;

  return (
    <PageShell header={<ScreenHeader title="Audit log" back />}>
      <View className="px-5">
        {all.length === 0 ? (
          <>
            <Hero>Salli hasn&rsquo;t written anything to your ledger.</Hero>
            <Text className="mt-2 text-[16px] leading-[23px] text-muted-foreground">
              Every write it asks to make is recorded here with the arguments it sent and whether
              you allowed it.
            </Text>
          </>
        ) : (
          <>
            <Hero>
              Salli has asked to write{" "}
              <Strong>
                {all.length} time{all.length === 1 ? "" : "s"}
              </Strong>
              .
            </Hero>
            <Text
              className={`mt-2 text-[16px] leading-[23px] ${
                denied > 0 ? "font-sans-semibold text-destructive" : "text-muted-foreground"
              }`}
            >
              {denied > 0
                ? `You denied ${denied} of them.`
                : all.length === 1
                  ? "You allowed it."
                  : "You allowed all of them."}
            </Text>
          </>
        )}
      </View>

      {all.length > 0 ? (
        <>
          <Rule />
          <SectionLabel>Newest first</SectionLabel>
          <View className="mt-3 gap-[9px] px-5">
            {all.map((e, i) => {
              const refused = e.decision === "denied";
              return (
                <Card
                  key={i}
                  className={`p-3.5 ${refused ? "border-destructive" : ""}`}
                >
                  <View className="flex-row items-center gap-2.5">
                    <Text
                      numberOfLines={1}
                      className="min-w-0 flex-1 font-sans-bold text-[16px] capitalize text-foreground"
                    >
                      {e.action.replace(/_/g, " ")}
                    </Text>
                    <Chip tone={refused ? "danger" : "plain"}>{refused ? "Denied" : "Allowed"}</Chip>
                  </View>
                  <Text className="mt-1 text-[13.5px] text-muted-foreground">
                    {formatDateTime(e.created_at)}
                  </Text>
                  <ParamRows params={e.params} />
                </Card>
              );
            })}
          </View>
        </>
      ) : null}
      <View className="h-7" />
    </PageShell>
  );
}
