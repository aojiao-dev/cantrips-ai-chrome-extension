/**
 * The main entry point of the extension configuration for WXT.
 * The main configurations for a vinallia chrome extension codebase
 * is the manifest file, which is a child in the defineConfig() here.
 */

import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Cantrips.ai: Auto Rename Downloaded Files Based on Content",
    description: "Automatically replace messy filenames with consistent and meaningful ones.",
    permissions: [
      "downloads",
      "tabs",
      "storage",
      "offscreen",
      "scripting",
      "activeTab",
    ],
    host_permissions: [
      "*://*.amazonaws.com/*",
      "*://*.amazoncognito.com/*",
      "<all_urls>",
    ],
  },
  extensionApi: "chrome",
});
