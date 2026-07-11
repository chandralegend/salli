module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // worklets/reanimated: false — the app doesn't use Reanimated; babel-preset-expo
      // auto-applies its Babel plugin project-wide whenever react-native-worklets is
      // resolvable (a hard transitive dep of expo-router), and that plugin instruments
      // any `style={{ ... x.value ... }}` pattern, mistaking plain object property
      // access for a missed useAnimatedStyle — crashing at runtime on real devices.
      ["babel-preset-expo", { jsxImportSource: "nativewind", worklets: false, reanimated: false }],
      "nativewind/babel",
    ],
  };
};
