// Removing an Expo plugin does not disable native dependency autolinking.
module.exports = process.env.EXPO_PUBLIC_MANAGED_AI === 'true'
  ? { dependencies: { 'llama.rn': { platforms: { android: null, ios: null } } } }
  : {};
