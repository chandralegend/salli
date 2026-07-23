// Dev-only admin UI (see ../layout.tsx and keystatic.config.ts). This whole
// directory is moved out of the tree before a production static-export build
// by scripts/strip-keystatic-admin.mjs, so no export-compatibility guards
// are needed here.
export default function Page() {
  return null;
}
