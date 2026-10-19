// Only public configuration belongs here. Provider credentials stay on the server.
export const managedAI = process.env.EXPO_PUBLIC_MANAGED_AI === 'true';
export const requireAILogin = managedAI && process.env.EXPO_PUBLIC_REQUIRE_AI_LOGIN === 'true';
export const managedApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '') || '';
