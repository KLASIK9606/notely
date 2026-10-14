const base = require('./app.json').expo;
module.exports = () => ({ ...base, plugins: process.env.EXPO_PUBLIC_MANAGED_AI === 'true' ? base.plugins.filter(plugin => (Array.isArray(plugin) ? plugin[0] : plugin) !== 'llama.rn') : base.plugins });
