import KeystaticApp from "./keystatic";

// Dev-only admin UI. This whole directory is moved out of the tree before a
// production static-export build: see scripts/strip-keystatic-admin.mjs and
// keystatic.config.ts.
export default function KeystaticLayout() {
  return <KeystaticApp />;
}
