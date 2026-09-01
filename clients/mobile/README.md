# Salli mobile

Expo (dev client) + React Native. `pnpm exec tsc --noEmit` to typecheck.

## Running locally on the iOS Simulator

Three environment traps have to be cleared before a local build works. All
three are already handled by the config in this directory plus the commands
below — this section exists so the next person does not rediscover them.

```bash
# 1. Boot a simulator.
xcrun simctl boot "iPhone 17 Pro" ; open -a Simulator

# 2. Pods. LANG is not optional — see below.
cd ios && LANG=en_US.UTF-8 pod install && cd ..

# 3. Build. Use xcodebuild directly, not `expo run:ios` — see below.
LANG=en_US.UTF-8 xcodebuild \
  -workspace ios/Salli.xcworkspace -scheme Salli \
  -configuration Debug -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,id=<UDID>' -quiet build

# 4. Metro, then install and launch the .app from
#    ~/Library/Developer/Xcode/DerivedData/Salli-*/Build/Products/Debug-iphonesimulator/
pnpm exec expo start
```

### Why the incantations

**`LANG=en_US.UTF-8` for anything that runs CocoaPods.** With `LANG` unset,
Ruby 4 returns `Dir.pwd` as ASCII-8BIT and CocoaPods calls `unicode_normalize`
on it, dying with `Unicode Normalization not appropriate for ASCII-8BIT`
(`cocoapods/config.rb:167`). Setting it in your shell profile is the better fix.

**`publicHoistPattern` in `pnpm-workspace.yaml`.** React Native's Xcode script
phase resolves `@react-native/codegen` by bare specifier, and pnpm's default
layout exposes only *direct* dependencies at the package root. Without the hoist
the build dies in the ReactCodegen target with `Cannot find module
'@react-native/codegen/package.json'`. Note this setting belongs in
`pnpm-workspace.yaml`, not `.npmrc` — pnpm 11 no longer reads pnpm-specific
settings from `.npmrc`, so putting it there fails silently.

**`xcodebuild`, not `expo run:ios`.** On this Xcode, Expo's device detection
reports `Unexpected devicectl JSON version output from devicectl`, then treats a
simulator UDID as a physical device and fails with `No code signing
certificates are available to use`. Passing the simulator *name* does not help;
it resolves back to the UDID.

**Default DerivedData.** Do not pass `-derivedDataPath` outside the repo. RN's
codegen script phase inherits Xcode's working directory and does no `cd` of its
own, so a DerivedData path outside the project puts Node somewhere that cannot
resolve the project's `node_modules` — the same `Cannot find module` failure,
from a different cause.

## Release

`gh workflow run mobile-release.yml -f profile=production` builds on EAS and
auto-submits to App Store Connect. EAS is unaffected by all of the above: it
prebuilds in a clean environment and applies its own pnpm hoisting, which is
why store builds kept succeeding while no local build worked.
