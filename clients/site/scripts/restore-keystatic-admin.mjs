// Restores the Keystatic admin routes moved out by strip-keystatic-admin.mjs.
// Wired as both `postbuild` and `predev` so the working tree self-heals even
// if a previous build was interrupted before its postbuild step ran.
import { rename, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const backupDir = path.join(root, ".keystatic-admin-backup");

const moves = [
  ["keystatic", "src/app/keystatic"],
  ["api-keystatic", "src/app/api/keystatic"],
];

for (const [backupName, dest] of moves) {
  const backupPath = path.join(backupDir, backupName);
  const destPath = path.join(root, dest);
  if (existsSync(backupPath) && !existsSync(destPath)) {
    await mkdir(path.dirname(destPath), { recursive: true });
    await rename(backupPath, destPath);
    console.log(`[restore-keystatic-admin] restored ${dest}`);
  }
}
