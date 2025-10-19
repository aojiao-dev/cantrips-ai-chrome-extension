/**
 * Content scripts run in the context of web pages and have direct access to the DOM.
 * We can statically trigger scripts by specifying targeted webpages in the manifest.
 * Or it can be programmatically triggered from for example service workers.
 */

export default defineContentScript({
  matches: ['*://*.google.com/*'],
  main() {
    console.log('Hello content.');
  },
});
