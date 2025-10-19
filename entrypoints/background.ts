/**
 * Service Worker runs independently of any web page and handle extension-wide tasks.
 * The entry point is `defineBackground()` which registers a bunch of listeners
 * to track browser activity (e.g. when a file is downloaded, an auth tab opened).
 */

import mammoth from "mammoth";
import { serverEndpointV2, authEndpoint, falbackEndpoint } from "./config";

// =========================================================
// Configs and Metadata
// =========================================================

const TXT_CHARACTER_LIMIT = 10000;
const DEFAULT_DATE_FORMAT = "YYYYMMDD";
const DEFAULT_FILENAME_FORMAT = "{date} - {filename}";

const TXT_TYPE = "text/plain";
const HTML_TYPE = "text/html";
const PDF_TYPE = "application/pdf";
const DOCX_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const allowedFileMimeType = [TXT_TYPE, HTML_TYPE, PDF_TYPE, DOCX_TYPE];

// =========================================================
// Auxilary functions.
// =========================================================

async function GetAccessToken() {
  const authToken = await storage.getItem("local:access_token");
  console.log("[app auth token] local:access_token: ", authToken);
  return authToken;
}

async function GetAppStatus() {
  const status = await storage.getItem("local:app_active");
  console.log("[app status] local:app_active: ", status);
  return status;
}

async function GetDateFormat() {
  const format = await storage.getItem("local:app_date_format");
  console.log("[app date format] local:app_date_format: ", format);
  if (!format) {
    return DEFAULT_DATE_FORMAT;
  }
  return format;
}

async function GetFilenameFormat() {
  const format = await storage.getItem("local:app_filename_format");
  console.log("[app filename format] local:app_filename_format: ", format);
  if (!format) {
    return DEFAULT_FILENAME_FORMAT;
  }
  return format;
}

// Creates an offscreen document to process file data in the background.
let creating: Promise<void> | undefined;
async function maybeCreateOffscreen() {
  const offscreenUrl = chrome.runtime.getURL("/offscreen.html");
  const existingContexts = browser.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"] as chrome.runtime.ContextType[],
    documentUrls: [offscreenUrl],
  });

  const existingOffscreens = (await existingContexts).length;
  console.log("[existing offscreen count] ", existingOffscreens);

  if (creating) {
    await creating;
  } else if (existingOffscreens == 0) {
    creating = chrome.offscreen.createDocument({
      url: "/offscreen.html",
      reasons: [chrome.offscreen.Reason.BLOBS],
      justification: "offscreen document to process file blob data",
    });
    await creating.catch((error) => {
      console.log("[create offscreen error] ", error);
    });
    creating = undefined;
    console.log("[offscreen created]");
  }
}

// Extract text content from file, sending to offscreen for processing if needed.
async function extractTextFromFile(
  downloadItem: chrome.downloads.DownloadItem,
  response: Response
): Promise<string> {
  const mime = downloadItem.mime;

  if (!allowedFileMimeType.includes(mime ?? "")) {
    console.log("[file mime not supported] ", mime);
    return "";
  }

  if (mime === TXT_TYPE || mime === HTML_TYPE) {
    const slicedTextData = (await response.text()).slice(
      0,
      TXT_CHARACTER_LIMIT
    );
    return slicedTextData;
  }

  if (mime === DOCX_TYPE) {
    const file_blob = await response.blob();
    const file_array_buffer = await file_blob.arrayBuffer();
    const result = await mammoth.extractRawText({
      arrayBuffer: file_array_buffer,
    });
    return result.value.slice(0, TXT_CHARACTER_LIMIT);
  }

  // Convert blob data to binary format. This step is crucial because
  // message interface only able to transfer JSON-like data types.
  const file_blob = await response.blob();
  const file_array_buffer = await file_blob.arrayBuffer();
  const file_uint8_array = new Uint8Array(file_array_buffer);
  const file_array_data = Array.from(file_uint8_array);

  // Try to create an offscreen for background processing if it doesn't exist.
  await maybeCreateOffscreen();

  // Now we start processing non-text files in offscreen.
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        target: "offscreen",
        action: "parseFileContent",
        blob: {
          type: file_blob.type,
          data: file_array_data,
        },
        mimeType: mime,
      },
      function (response) {
        // resolve if response.data exists
        if (response && response.data) {
          resolve(response.data.slice(0, TXT_CHARACTER_LIMIT));
        }
      }
    );
  });
}

// Calls AWS server to generate AI filename.
async function generateFilenameAws(textContent: string) {
  const dateFormat = await GetDateFormat();
  const filenameFormat = await GetFilenameFormat();
  const localTime = new Date().toLocaleDateString("en-CA");
  const authToken = "Bearer " + (await GetAccessToken());

  console.log("[aws server request] ", localTime, dateFormat, filenameFormat);

  const response = await fetch(serverEndpointV2, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      Authorization: authToken,
    },
    body: JSON.stringify({
      text: textContent,
      date_format: dateFormat,
      filename_format: filenameFormat,
      local_time: localTime,
    }),
  });

  const status = response.status;
  const result = await response.text();
  console.log("[aws server status response] ", status, result);

  // Force logout if unauthorized.
  if (status === 401) {
    storage.removeItem("local:access_token");
  }

  return status === 200 && result ? result : undefined;
}

function getFilenameWithExtension(filename: string, mime: string) {
  // add .txt extension if mime type is text/plain
  if (!filename) {
    return "";
  }

  if (mime === TXT_TYPE) {
    return filename + ".txt";
  }

  if (mime === HTML_TYPE) {
    return filename + ".html";
  }

  if (mime === PDF_TYPE) {
    return filename + ".pdf";
  }

  if (mime === DOCX_TYPE) {
    return filename + ".docx";
  }

  return "";
}

async function enableLoadingUI(): Promise<number | undefined> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    if (currentTab?.id) {
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: createLoadingUI,
      });
      return currentTab.id;
    }
  } catch (error) {
    console.log("[loading state notification error]", error);
  }
  return undefined;
}

async function disableLoadingUI(tabId: Promise<number | undefined>) {
  tabId.then((tabIdResponse) => {
    if (tabIdResponse) {
      chrome.scripting.executeScript({
        target: { tabId: tabIdResponse },
        func: removeLoadingUI,
      });
    }
  });
}

function createLoadingUI() {
  if (!document.getElementById("cantrips-loading-section")) {
    const loadingSection = document.createElement("div");
    loadingSection.id = "cantrips-loading-section";
    loadingSection.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 2147483647;
    `;

    const spinner = document.createElement("div");
    spinner.style.cssText = `
      width: 20px;
      height: 20px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `;

    const text = document.createElement("div");
    text.style.cssText = `
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
    `;
    text.textContent = "Generating filename...";

    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;

    loadingSection.appendChild(spinner);
    loadingSection.appendChild(text);
    document.head.appendChild(style);
    document.body.appendChild(loadingSection);
    loadingSection.style.animation = "slideIn 0.5s ease-out forwards";
  }
}

function removeLoadingUI() {
  const loadingSection = document.getElementById("cantrips-loading-section");
  if (loadingSection) {
    loadingSection.style.animation = "slideOut 0.5s ease-in forwards";
    setTimeout(() => loadingSection.remove(), 500);
  }
}

// =========================================================
// Main entry of the background script.
// =========================================================

export default defineBackground(() => {
  // Listens to tab updates and extract auth token.
  browser.tabs.onUpdated.addListener(async function listener(
    tabId,
    changeInfo
  ) {
    if (!changeInfo.url) {
      return;
    }

    const url = new URL(changeInfo.url);
    if (changeInfo.url === falbackEndpoint) {
      console.log("[cantrips ai fallback url detected] ");
      await chrome.tabs.remove(tabId);
      return;
    }

    if (url.hostname != authEndpoint) {
      return;
    }

    console.log("[auth hostname matched] ", url.hostname);

    const hashParams = new URL(url).hash.substring(1);
    const params = new URLSearchParams(hashParams);
    const token = params.get("access_token");
    if (token) {
      await storage.setItem("local:access_token", token);
      await storage.setItem("local:app_active", "true");
      await chrome.tabs.remove(tabId);
      console.log("[auth_token set] ", token);
    } else {
      console.log("[auth token not found on url] ", url);
    }
  });

  // Listens to download filename suggestion event.
  chrome.downloads.onDeterminingFilename.addListener(function (
    item,
    __suggest
  ) {
    if (!allowedFileMimeType.includes(item.mime ?? "")) {
      console.log("[file mime not supported] ", item.mime);
      return;
    }

    console.log("[download item mime] ", item.mime);
    console.log("[download item url] ", item.url);
    console.log("[download item filename] ", item.filename);

    const access_token = GetAccessToken();
    access_token.then((token) => {
      if (!token) {
        console.log("[app not authenticated]", token);
        __suggest({
          filename: item.filename,
          conflictAction: "overwrite",
        });
        return true;
      }
      const app_status = GetAppStatus();
      app_status.then((status) => {
        if (!status || status !== "true") {
          console.log("[app not active]", status);
          __suggest({
            filename: item.filename,
            conflictAction: "overwrite",
          });
          return true;
        }
        const fetchRequest = fetch(item.url);
        fetchRequest.then((fetchResponse) => {
          console.log("[fetch response] ", fetchResponse);
          if (!fetchResponse.ok) {
            console.log("[fetch response not ok] ", fetchResponse);
            __suggest({
              filename: item.filename,
              conflictAction: "overwrite",
            });
            return true;
          }
          const extractionRequest = extractTextFromFile(item, fetchResponse);
          extractionRequest.then((extractionResponse) => {
            if (!extractionResponse || extractionResponse.length < 10) {
              console.log("[extracted text content not found] ");
              __suggest({
                filename: item.filename,
                conflictAction: "overwrite",
              });
              return true;
            }
            console.log("[extracted text content] ", extractionResponse);
            const tabId = enableLoadingUI();
            const fileRenameRequest = generateFilenameAws(extractionResponse);
            fileRenameRequest.then((fileRenameResponse) => {
              if (!fileRenameResponse) {
                console.log("[generated ai filename not found] ");
                __suggest({
                  filename: item.filename,
                  conflictAction: "overwrite",
                });
                disableLoadingUI(tabId);
                return true;
              }
              console.log("[generated ai filename] ", fileRenameResponse);
              const filenameWithExtension = getFilenameWithExtension(
                fileRenameResponse ?? "",
                item.mime
              );
              __suggest({
                filename: filenameWithExtension ?? item.filename,
                conflictAction: "overwrite",
              });
              disableLoadingUI(tabId);
            });
          });
        });
      });
    });

    return true;
  });
});
