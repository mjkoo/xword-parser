/**
 * Buffer polyfill for browser environments
 * This file is injected into the browser build to provide Buffer support
 */

import { Buffer } from "buffer";

if (typeof globalThis !== "undefined" && !globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

export { Buffer };
