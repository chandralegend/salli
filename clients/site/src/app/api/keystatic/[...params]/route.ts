// Dev-only (see keystatic.config.ts). This whole directory is moved out of
// the tree before a production static-export build by
// scripts/strip-keystatic-admin.mjs, so no export-compatibility guards are
// needed here.
import { makeRouteHandler } from "@keystatic/next/route-handler";
import config from "../../../../../keystatic.config";

export const { GET, POST } = makeRouteHandler({ config });
