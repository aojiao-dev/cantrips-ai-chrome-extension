/**
 * Scripts to process data in the background. This is especially important
 * for processing pdfs that need rely on pdfjsLib which can't run in background.ts.
 * This is because pdfjsLib uses dynamic import() in its implementation.
 * Use chrome://inspect/#pages to test offscreen logs.
 */

// https://mozilla.github.io/pdf.js/examples/
// Loading a local snapshot from node_modules as a temporary solution.
// We need figure out how to automatically export npm package to output dir.

import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.worker.mjs";

const PDF_PAGE_LIMIT = 5;
const PDF_CHARACTER_LIMIT = 40000;
const PDF_TYPE = "application/pdf";

interface BlobData {
  type: string;
  data: ArrayBuffer;
}

async function pdfScanner(data: BlobData) {
  const uint8Array = new Uint8Array(data.data);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdfDocument = await loadingTask.promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    if (pageNum > PDF_PAGE_LIMIT || fullText.length > PDF_CHARACTER_LIMIT) {
      break;
    }
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}

async function parseFileContent(data: BlobData) {
  if (data.type === PDF_TYPE) {
    return await pdfScanner(data);
  }

  return "";
}

async function generateFileUrl(blobData: BlobData) {
  const uint8Array = new Uint8Array(blobData.data);
  const blob = new Blob([uint8Array], { type: blobData.type });
  return URL.createObjectURL(blob);
}

// Main entry of the offscreen worker, listening to messages.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Listens for `parseFileContent` message action in the background.
  if (message.target === "offscreen" && message.action === "parseFileContent") {
    parseFileContent(message.blob)
      .then((result) => {
        console.log("[offscreen parse file output] ", { data: result });
        sendResponse({ data: result });
        return true;
      })
      .catch((error) => {
        console.log("[offscreen parse file error] ", error);
        sendResponse();
        return true;
      });
    return true;
  }

  // Listens for `generateFileUrl` message action in the background.
  if (message.target === "offscreen" && message.action === "generateFileUrl") {
    generateFileUrl(message.blob)
      .then((result) => {
        console.log("[offscreen generate url output] ", { data: result });
        sendResponse({ data: result });
        return true;
      })
      .catch((error) => {
        console.log("[offscreen generate url error] ", error);
        sendResponse();
        return true;
      });
    return true;
  }

  return true;
});
