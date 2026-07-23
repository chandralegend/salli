// Moves the Keystatic admin UI routes out of src/app before a production
// static-export build, restored afterwards by restore-keystatic-admin.mjs
// (wired as `postbuild`/`predev` so it self-heals even if a build fails
// mid-way). They're dev-only (see keystatic.config.ts's `showAdminUI`) and a
// writable route can't be part of `output: "export"` — Next's exporter
// requires full static-param enumeration even for a route that would always
// 404, which these dynamic catch-all routes can't satisfy. Moving them out
// for the build is simpler and more robust than fighting that validator with
// dynamicParams/generateStaticParams guards.
import { rename, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const backupDir = path.join(root, ".keystatic-admin-backup");

const moves = [
  ["src/app/keystatic", "keystatic"],
  ["src/app/api/keystatic", "api-keystatic"],
];

await mkdir(backupDir, { recursive: true });

for (const [src, backupName] of moves) {
  const srcPath = path.join(root, src);
  const backupPath = path.join(backupDir, backupName);
  if (existsSync(srcPath)) {
    await rename(srcPath, backupPath);
    console.log(`[strip-keystatic-admin] moved ${src} -> .keystatic-admin-backup/${backupName}`);
  }
}
