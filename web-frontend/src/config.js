/**
 * Runtime configuration for the web frontend.
 *
 * Values prefixed with REACT_APP_ are baked in at build time by CRA.
 * For deploy-time overrides, mount a config.js file into the nginx
 * container that sets window.__RUNTIME_CONFIG__ before the app bundle loads.
 *
 * Example override (served by nginx at /config.js):
 *   window.__RUNTIME_CONFIG__ = { APP_URL: "https://app.ghostedbyhr.com" };
 */

const runtimeConfig = window.__RUNTIME_CONFIG__ || {};

const config = {
  APP_URL: runtimeConfig.APP_URL || import.meta.env.VITE_APP_URL || '/app',
  API_URL: runtimeConfig.API_URL || import.meta.env.VITE_API_URL || '/api',
};

export default config;
