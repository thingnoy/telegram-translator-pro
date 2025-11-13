// ==UserScript==
// @name         🌐 Telegram Translator Pro by sadoi
// @namespace    sadoi
// @version      2.0
// @description  Clean & minimal Telegram Web translator with smart caching and data-mid tracking. Developed by sadoi
// @author       sadoi
// @match        https://web.telegram.org/k/*
// @license      MIT
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      translate.googleapis.com
// ==/UserScript==

(function () {
  "use strict";

  // ⚙️ Configuration
  let DEBUG = true;
  const CONFIG = {
    maxCacheSize: 1000,
    maxConcurrentRequests: 3,
    requestTimeout: 10000,
    retryAttempts: 2,
    retryDelay: 1000,
    debounceDelay: 200,
    minTextLength: 3, // Fixed value, not configurable in UI
    initialScanDelay: 3000,
    scrollDebounceDelay: 150,
    intersectionThreshold: 0.1,
  };

  const log = {
    info: (...args) => DEBUG && console.log("[Translator]", ...args),
    error: (...args) => DEBUG && console.error("[Translator]", ...args),
    warn: (...args) => DEBUG && console.warn("[Translator]", ...args),
  };

  const waitForDOM = () => {
    return new Promise((resolve) => {
      if (document.body) {
        resolve();
      } else {
        const observer = new MutationObserver(() => {
          if (document.body) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(document.documentElement, { childList: true });
      }
    });
  };

  waitForDOM().then(() => {
    log.info(
      "✨ DOM ready, initializing Telegram Translator Pro v2.0 (Clean UI)"
    );
    initializeScript();
  });

  function initializeScript() {
    // 💠 iOS Glass Style
    GM_addStyle(`
    #tg-panel-toggle {
      position: fixed !important;
      right: 24px !important;
      bottom: 24px !important;
      width: 60px !important;
      height: 60px !important;
      border-radius: 20px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 30px !important;
      background: rgba(255, 255, 255, 0.8) !important;
      color: #007AFF !important;
      box-shadow: 0 8px 32px rgba(0, 122, 255, 0.2), 
                  0 2px 8px rgba(0, 0, 0, 0.08) !important;
      cursor: pointer !important;
      z-index: 2147483647 !important;
      backdrop-filter: blur(20px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
      border: 0.5px solid rgba(255, 255, 255, 0.8) !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    #tg-panel-toggle:hover { 
      transform: scale(1.05) !important;
      box-shadow: 0 12px 48px rgba(0, 122, 255, 0.3), 
                  0 4px 12px rgba(0, 0, 0, 0.12) !important;
    }
    #tg-panel-toggle:active {
      transform: scale(0.95) !important;
    }
    
    #tg-panel {
      position: fixed !important;
      right: 24px !important;
      bottom: 24px !important;
      width: 320px;
      max-height: 80vh;
      overflow-y: auto;
      background: rgba(255, 255, 255, 0.7) !important;
      backdrop-filter: blur(40px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(40px) saturate(180%) !important;
      border-radius: 20px;
      color: #1d1d1f;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15),
                  0 0 0 0.5px rgba(255, 255, 255, 0.8) inset;
      padding: 20px;
      display: none;
      border: 0.5px solid rgba(255, 255, 255, 0.8);
      z-index: 2147483647 !important;
      opacity: 0;
      transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    #tg-panel.show {
      opacity: 1;
    }
    
    #tg-close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 28px;
      height: 28px;
      border-radius: 14px;
      background: rgba(120, 120, 128, 0.16);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: #1d1d1f;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      font-weight: 500;
    }
    #tg-close-btn:hover { 
      background: rgba(120, 120, 128, 0.24);
      transform: scale(1.1);
    }
    #tg-close-btn:active {
      transform: scale(0.95);
    }
    
    #tg-panel h3 {
      margin: 0 0 20px 0;
      padding-bottom: 12px;
      text-align: center;
      color: #1d1d1f;
      font-weight: 600;
      letter-spacing: -0.3px;
      font-size: 20px;
      border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
    }
    
    .tg-row { 
      display: flex; 
      flex-direction: column; 
      gap: 6px; 
      margin: 16px 0; 
    }
    
    .tg-label {
      font-size: 13px;
      color: #86868b;
      font-weight: 500;
      letter-spacing: -0.08px;
      text-transform: uppercase;
      font-size: 11px;
    }
    
    .tg-select, .tg-input {
      width: 100%;
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(120, 120, 128, 0.12);
      border: none;
      color: #1d1d1f;
      font-size: 15px;
      outline: none;
      transition: all 0.2s ease;
      font-weight: 400;
      -webkit-appearance: none;
    }
    .tg-select:focus, .tg-input:focus { 
      background: rgba(120, 120, 128, 0.16);
      box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
    }
    .tg-select option { 
      background: white; 
      color: #1d1d1f; 
    }
    
    .tg-btn {
      width: 100%;
      padding: 12px;
      margin-top: 8px;
      border-radius: 12px;
      background: rgba(120, 120, 128, 0.12);
      border: none;
      cursor: pointer;
      color: #1d1d1f;
      font-size: 15px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .tg-btn:hover { 
      background: rgba(120, 120, 128, 0.16);
      transform: translateY(-1px);
    }
    .tg-btn:active {
      transform: scale(0.98);
    }
    .tg-btn:disabled { 
      opacity: 0.4; 
      cursor: not-allowed; 
    }
    .tg-btn.positive { 
      background: #007AFF;
      color: white;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0, 122, 255, 0.25);
    }
    .tg-btn.positive:hover {
      background: #0051D5;
      box-shadow: 0 4px 12px rgba(0, 122, 255, 0.35);
      transform: translateY(-2px);
    }
    .tg-btn.positive:active {
      transform: scale(0.98);
    }
    
    .tg-stats {
      margin-top: 20px;
      padding: 16px;
      background: rgba(120, 120, 128, 0.08);
      border-radius: 16px;
      font-size: 11px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      border: 0.5px solid rgba(0, 0, 0, 0.04);
    }
    .tg-stat-item { 
      text-align: center;
      padding: 12px 8px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.5);
    }
    .tg-stat-item:last-child {
      grid-column: span 2;
    }
    .tg-stat-value {
      color: #007AFF;
      font-weight: 700;
      font-size: 24px;
      letter-spacing: -0.5px;
    }
    .tg-stat-label {
      color: #86868b;
      font-size: 11px;
      margin-top: 4px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .tg-footer {
      margin-top: 20px;
      padding-top: 16px;
      text-align: center;
      font-size: 11px;
      color: #86868b;
      border-top: 0.5px solid rgba(0, 0, 0, 0.08);
    }
    .tg-footer > div:first-child { 
      color: #1d1d1f;
      font-weight: 600;
      margin-bottom: 4px;
      font-size: 13px;
    }
    
    .tg-translated-text {
      margin-top: 12px;
      padding: 12px 16px;
      color: #1d1d1f;
      font-size: 15px;
      background: rgba(0, 122, 255, 0.08);
      border-left: 3px solid #007AFF;
      border-radius: 12px;
      font-weight: 400;
      line-height: 1.4;
      animation: fadeInSlide 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    @keyframes fadeInSlide {
      from { 
        opacity: 0; 
        transform: translateY(-8px);
      }
      to { 
        opacity: 1; 
        transform: translateY(0);
      }
    }
    
    .tg-checkbox-container {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(120, 120, 128, 0.12);
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .tg-checkbox-container:hover {
      background: rgba(120, 120, 128, 0.16);
    }
    .tg-checkbox-container input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
      accent-color: #007AFF;
    }
    .tg-checkbox-container label {
      cursor: pointer;
      font-size: 15px;
      color: #1d1d1f;
      font-weight: 400;
    }
    
    .tg-debug-toggle {
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.2s;
      user-select: none;
      display: inline-block;
      padding: 4px 8px;
      border-radius: 6px;
    }
    .tg-debug-toggle:hover {
      opacity: 0.8;
      background: rgba(120, 120, 128, 0.08);
    }
    .tg-debug-toggle:active {
      transform: scale(0.95);
    }
    
    @keyframes slideInTop {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut { 
      to { opacity: 0; }
    }
    
    #tg-panel::-webkit-scrollbar {
      width: 6px;
    }
    #tg-panel::-webkit-scrollbar-track {
      background: transparent;
    }
    #tg-panel::-webkit-scrollbar-thumb {
      background: rgba(120, 120, 128, 0.3);
      border-radius: 10px;
    }
    #tg-panel::-webkit-scrollbar-thumb:hover {
      background: rgba(120, 120, 128, 0.5);
    }
  `);

    // 🌐 Language Options
    const languages = [
      ["ar", "العربية"],
      ["en", "English"],
      ["fr", "Français"],
      ["es", "Español"],
      ["de", "Deutsch"],
      ["ru", "Русский"],
      ["zh-CN", "中文简体"],
      ["zh-TW", "中文繁體"],
      ["ja", "日本語"],
      ["it", "Italiano"],
      ["pt", "Português"],
      ["tr", "Türkçe"],
      ["ko", "한국어"],
      ["hi", "हिन्दी"],
      ["nl", "Nederlands"],
      ["sv", "Svenska"],
      ["pl", "Polski"],
      ["uk", "Українська"],
      ["id", "Bahasa Indonesia"],
      ["th", "ไทย"],
      ["fa", "فارسی"],
      ["he", "עברית"],
      ["vi", "Tiếng Việt"],
      ["ro", "Română"],
      ["cs", "Čeština"],
      ["fi", "Suomi"],
      ["el", "Ελληνικά"],
    ];

    // 🎨 Create Clean UI
    const langOptions = languages
      .map(([code, name]) => `<option value="${code}">${name}</option>`)
      .join("");
    const sourceOptions = `<option value="auto">🔍 Auto</option>${langOptions}`;

    document.body.insertAdjacentHTML(
      "beforeend",
      `
    <div id="tg-panel-toggle" title="Open Translator (Alt+T)">💬</div>
    <div id="tg-panel" role="dialog" aria-label="Translator Pro">
      <div id="tg-close-btn" title="Close (Esc)">×</div>
      <h3>✨ Translator Pro ✨</h3>
      
      <div class="tg-row">
        <label class="tg-checkbox-container">
          <input type="checkbox" id="tg-enabled">
          <label for="tg-enabled">Enable Auto-Translate</label>
        </label>
      </div>
      
      <div class="tg-row">
        <label class="tg-label">Translate to:</label>
        <select id="tg-lang-select" class="tg-select">${langOptions}</select>
      </div>
      
      <div class="tg-row">
        <label class="tg-label">Detect from:</label>
        <select id="tg-source-lang-select" class="tg-select">${sourceOptions}</select>
      </div>
      
      <div class="tg-row">
        <label class="tg-checkbox-container">
          <input type="checkbox" id="tg-skip-same-lang">
          <label for="tg-skip-same-lang">Skip same language</label>
        </label>
      </div>
      
      <button id="tg-refresh-btn" class="tg-btn positive">⚡ Refresh All</button>
      
      <div class="tg-stats">
        <div class="tg-stat-item">
          <div class="tg-stat-value" id="tg-stat-translated">0</div>
          <div class="tg-stat-label">Translated</div>
        </div>
        <div class="tg-stat-item">
          <div class="tg-stat-value" id="tg-stat-cached">0</div>
          <div class="tg-stat-label">API Cache</div>
        </div>
        <div class="tg-stat-item">
          <div class="tg-stat-value" id="tg-stat-persist">0</div>
          <div class="tg-stat-label">Saved</div>
        </div>
        <div class="tg-stat-item">
          <div class="tg-stat-value" id="tg-stat-errors">0</div>
          <div class="tg-stat-label">Errors</div>
        </div>
        <div class="tg-stat-item">
          <div class="tg-stat-value" id="tg-stat-skipped">0</div>
          <div class="tg-stat-label">Skipped</div>
        </div>
      </div>
      
      <div class="tg-footer">
        <div>🚀 by sadoi</div>
        <div style="margin-top: 2px;">v2.0 Clean • Alt+T • Alt+R</div>
        <div class="tg-debug-toggle" id="tg-debug-toggle" title="Click to toggle debug mode">
          <span style="font-size: 6px;">🐛 <span id="tg-debug-status">ON</span></span>
        </div>
      </div>
    </div>
  `
    );

    // 📝 DOM Elements
    const $ = (id) => document.getElementById(id);
    const $$ = (selector) => document.querySelectorAll(selector);

    const elements = {
      toggleBtn: $("tg-panel-toggle"),
      panel: $("tg-panel"),
      closeBtn: $("tg-close-btn"),
      langSelect: $("tg-lang-select"),
      sourceLangSelect: $("tg-source-lang-select"),
      enableInput: $("tg-enabled"),
      skipSameLangInput: $("tg-skip-same-lang"),
      debugToggle: $("tg-debug-toggle"),
      debugStatus: $("tg-debug-status"),
      refreshBtn: $("tg-refresh-btn"),
      stats: {
        translated: $("tg-stat-translated"),
        cached: $("tg-stat-cached"),
        persist: $("tg-stat-persist"),
        errors: $("tg-stat-errors"),
        skipped: $("tg-stat-skipped"),
      },
    };

    log.info("✓ UI elements created");

    // 💾 State Management
    const storage = {
      get: (key, defaultValue) => localStorage.getItem(key) ?? defaultValue,
      set: (key, value) => localStorage.setItem(key, value),
      getBool: (key, defaultValue = false) =>
        localStorage.getItem(key) === "true" ||
        (localStorage.getItem(key) === null && defaultValue),
    };

    const state = {
      targetLang: storage.get("tg_target_lang", "th"),
      sourceLang: storage.get("tg_source_lang", "auto"),
      enabled: storage.getBool("tg_enabled", true),
      skipSameLang: storage.getBool("tg_skip_same_lang", false),
      debugMode: storage.getBool("tg_debug_mode", true),
      stats: { translated: 0, cached: 0, errors: 0, skipped: 0 },
    };

    // Apply initial state
    DEBUG = state.debugMode;
    elements.langSelect.value = state.targetLang;
    elements.sourceLangSelect.value = state.sourceLang;
    elements.enableInput.checked = state.enabled;
    elements.skipSameLangInput.checked = state.skipSameLang;
    elements.debugStatus.textContent = DEBUG ? "ON" : "OFF";

    // 📊 Stats Update
    const translationPersistCache = new Map();

    const updateStats = () => {
      Object.entries(state.stats).forEach(([key, value]) => {
        if (elements.stats[key]) {
          elements.stats[key].textContent = value;
        }
      });
      if (elements.stats.persist) {
        elements.stats.persist.textContent = translationPersistCache.size;
      }
    };
    updateStats();

    // 🔔 Notification
    const showNotification = (message) => {
      const notification = document.createElement("div");
      notification.textContent = message;
      notification.style.cssText = `
      position: fixed; top: 24px; right: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; padding: 14px 24px; border-radius: 12px;
      box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
      z-index: 2147483648;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px; font-weight: 600;
      animation: slideInTop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), fadeOut 0.3s ease 2.7s;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    };

    // 🎮 UI Controls
    const togglePanel = (show) => {
      if (show) {
        elements.panel.style.display = "block";
        elements.toggleBtn.style.visibility = "hidden";
        elements.toggleBtn.style.pointerEvents = "none";
        requestAnimationFrame(() => {
          elements.panel.classList.add("show");
        });
      } else {
        elements.panel.classList.remove("show");
        setTimeout(() => {
          elements.panel.style.display = "none";
          elements.toggleBtn.style.visibility = "visible";
          elements.toggleBtn.style.pointerEvents = "auto";
        }, 200);
      }
    };

    elements.toggleBtn.onclick = () => togglePanel(true);
    elements.closeBtn.onclick = () => togglePanel(false);

    // Debug toggle in footer
    elements.debugToggle.onclick = () => {
      DEBUG = !DEBUG;
      state.debugMode = DEBUG;
      storage.set("tg_debug_mode", DEBUG);
      elements.debugStatus.textContent = DEBUG ? "ON" : "OFF";
      log.info(`Debug mode ${DEBUG ? "enabled" : "disabled"}`);
      showNotification(`🐛 Debug ${DEBUG ? "ON" : "OFF"}`);
    };

    // ⌨️ Keyboard Shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.altKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        togglePanel(elements.panel.style.display !== "block");
      }
      if (e.altKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        refreshTranslations();
      }
      if (e.key === "Escape" && elements.panel.style.display === "block") {
        togglePanel(false);
      }
    });

    // ⚡ Settings Handlers
    const createSettingHandler = (
      key,
      element,
      isBoolean = false,
      callback = null
    ) => {
      element.onchange = () => {
        const value = isBoolean ? element.checked : element.value;
        state[key] = value;
        storage.set(
          `tg_${key.replace(/([A-Z])/g, "_$1").toLowerCase()}`,
          value
        );
        log.info(`${key} changed to:`, value);
        callback?.();
      };
    };

    createSettingHandler("targetLang", elements.langSelect);
    createSettingHandler("sourceLang", elements.sourceLangSelect);
    createSettingHandler("enabled", elements.enableInput, true, () => {
      state.enabled ? refreshTranslations() : removeAllTranslations();
    });
    createSettingHandler("skipSameLang", elements.skipSameLangInput, true);

    // 💾 Cache Management
    const translateCache = new Map();
    const addToCache = (key, value) => {
      if (translateCache.size >= CONFIG.maxCacheSize) {
        const firstKey = translateCache.keys().next().value;
        translateCache.delete(firstKey);
      }
      translateCache.set(key, value);
    };

    elements.refreshBtn.onclick = () => refreshTranslations();

    // 🔍 Text Validation
    const shouldSkipText = (text) => {
      if (!text || text.length < CONFIG.minTextLength) return true;
      if (/^[\d:\s.,\/\-]+$/.test(text)) return true;
      if (/^https?:\/\//.test(text)) return true;
      if (/^\d+[\/\-\.]\d+[\/\-\.]\d+/.test(text)) return true;
      return false;
    };

    // 🧠 Translation Engine
    let activeRequests = 0;
    const requestQueue = [];

    const translateText = async (text, retries = CONFIG.retryAttempts) => {
      return new Promise((resolve) => {
        if (!state.enabled) {
          state.stats.skipped++;
          updateStats();
          return resolve(null);
        }

        const trimmedText = text.trim();
        if (shouldSkipText(trimmedText)) {
          state.stats.skipped++;
          updateStats();
          return resolve(null);
        }

        const cacheKey = `${state.sourceLang}:${state.targetLang}:${trimmedText}`;
        if (translateCache.has(cacheKey)) {
          state.stats.cached++;
          updateStats();
          return resolve(translateCache.get(cacheKey));
        }

        const processRequest = async () => {
          if (activeRequests >= CONFIG.maxConcurrentRequests) {
            await new Promise((r) => requestQueue.push(r));
          }

          const wasIdle = activeRequests === 0;
          activeRequests++;

          if (wasIdle) {
            elements.toggleBtn.style.filter = "grayscale(100%) brightness(1.2)";
          }

          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${
            state.sourceLang
          }&tl=${state.targetLang}&dt=t&q=${encodeURIComponent(trimmedText)}`;

          const handleResponse = (success, result = null) => {
            activeRequests--;

            if (activeRequests === 0) {
              elements.toggleBtn.style.filter = "none";
            }

            if (requestQueue.length > 0) requestQueue.shift()();

            if (success && result) {
              addToCache(cacheKey, result);
              state.stats.translated++;
              updateStats();
              resolve(result);
            } else if (retries > 0) {
              setTimeout(
                () => translateText(text, retries - 1).then(resolve),
                CONFIG.retryDelay
              );
            } else {
              state.stats.errors++;
              updateStats();
              resolve(null);
            }
          };

          GM_xmlhttpRequest({
            method: "GET",
            url,
            timeout: CONFIG.requestTimeout,
            onload: (res) => {
              try {
                const result = JSON.parse(res.responseText);
                if (!result?.[0] || !Array.isArray(result[0]))
                  throw new Error("Invalid response");

                const translated = result[0]
                  .filter((t) => t?.[0])
                  .map((t) => t[0])
                  .join("")
                  .trim();

                if (state.skipSameLang && translated === trimmedText) {
                  state.stats.skipped++;
                  updateStats();
                  return resolve(null);
                }

                handleResponse(
                  translated && translated !== trimmedText,
                  translated
                );
              } catch (error) {
                log.error("Parse error:", error);
                handleResponse(false);
              }
            },
            onerror: (error) => {
              log.error("Request error:", error);
              handleResponse(false);
            },
            ontimeout: () => {
              log.error("Request timeout");
              handleResponse(false);
            },
          });
        };

        processRequest();
      });
    };

    // 🧩 Translation Rendering
    const renderTranslation = (el, translated) => {
      if (!el || !translated) return;

      const existing = el.querySelector(".tg-translated-text");
      if (existing) existing.remove();

      const div = document.createElement("div");
      div.className = "tg-translated-text";
      div.textContent = translated;
      el.appendChild(div);
    };

    const removeAllTranslations = () => {
      $$(".tg-translated-text").forEach((el) => el.remove());
      log.info("All translations removed");
    };

    // 🎯 Message Detection
    const MESSAGE_SELECTORS = [
      ".message .translatable-message",
      ".translatable-message",
      ".message-text",
      ".message .text",
      ".text-content",
    ];

    const getMessageId = (msgElement) => {
      const bubble = msgElement.closest(".bubble[data-mid]");
      if (bubble) {
        return bubble.getAttribute("data-mid");
      }

      const anyParent = msgElement.closest("[data-mid]");
      if (anyParent) {
        return anyParent.getAttribute("data-mid");
      }

      const text = msgElement.innerText?.trim();
      if (text) {
        let hash = 0;
        for (let i = 0; i < Math.min(text.length, 100); i++) {
          hash = (hash << 5) - hash + text.charCodeAt(i);
          hash = hash & hash;
        }
        return `fallback_${hash}_${text.length}`;
      }

      return null;
    };

    const processedMessages = new WeakSet();

    const processMessage = async (msgElement) => {
      if (!state.enabled || !msgElement) return;

      const text = msgElement.innerText?.trim();
      if (!text || text.length < CONFIG.minTextLength) return;

      if (msgElement.querySelector(".tg-translated-text")) return;

      const messageId = getMessageId(msgElement);
      if (!messageId) return;

      if (translationPersistCache.has(messageId)) {
        const cached = translationPersistCache.get(messageId);
        renderTranslation(msgElement, cached);
        updateStats();
        log.info(`✓ Restored [${messageId}]`);
        return;
      }

      processedMessages.add(msgElement);

      const translated = await translateText(text);
      if (translated && translated !== text) {
        translationPersistCache.set(messageId, translated);
        renderTranslation(msgElement, translated);
        updateStats();
        log.info(`✓ Translated [${messageId}]`);
      }
    };

    // 🔄 Refresh Translations
    const refreshTranslations = async () => {
      if (!state.enabled) {
        showNotification("⚠️ Translation disabled");
        return;
      }

      log.info("=== Refreshing ===");
      removeAllTranslations();

      let allMessages = [];
      for (const selector of MESSAGE_SELECTORS) {
        const found = $$(selector);
        if (found.length > 0) {
          log.info(`✓ ${found.length} × ${selector}`);
          allMessages = [...new Set([...allMessages, ...found])];
        }
      }

      log.info(`Total: ${allMessages.length}`);
      let processed = 0;
      let restored = 0;

      for (const msg of allMessages) {
        const text = msg.innerText?.trim();
        if (text && text.length >= CONFIG.minTextLength) {
          const messageId = getMessageId(msg);
          if (!messageId) continue;

          if (translationPersistCache.has(messageId)) {
            renderTranslation(msg, translationPersistCache.get(messageId));
            restored++;
          } else {
            const translated = await translateText(text);
            if (translated && translated !== text) {
              translationPersistCache.set(messageId, translated);
              renderTranslation(msg, translated);
              processed++;
            }
          }
        }
        await new Promise((r) => setTimeout(r, 50));
      }

      log.info(`Done: ${processed} new, ${restored} cached`);
      if (processed > 0 || restored > 0) {
        showNotification(`⚡ ${processed} new + ${restored} cached`);
      } else {
        showNotification(`ℹ️ No messages found`);
      }
    };

    // 🔁 Mutation Observer
    let debounceTimer = null;

    const observer = new MutationObserver((mutations) => {
      if (!state.enabled) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        mutations.forEach((m) => {
          m.addedNodes.forEach(async (node) => {
            if (node.nodeType !== 1) return;

            let messages = [];
            for (const selector of MESSAGE_SELECTORS) {
              const found = node.querySelectorAll?.(selector) || [];
              messages = [...messages, ...found];
              if (node.matches?.(selector)) messages.push(node);
            }

            for (const msg of messages) {
              const text = msg.innerText?.trim();
              if (text && text.length >= CONFIG.minTextLength) {
                await processMessage(msg);
              }
            }
          });
        });
      }, CONFIG.debounceDelay);
    });

    // 🎯 Start Observing
    const containers = ["#column-center", ".messages-container", "body"];

    for (const selector of containers) {
      const container = document.querySelector(selector);
      if (container) {
        observer.observe(container, { childList: true, subtree: true });
        log.info(`✓ Observing: ${selector}`);
        break;
      }
    }

    // Initial scan
    setTimeout(() => {
      if (state.enabled) {
        log.info("=== Initial scan ===");

        const debugSelectors = [
          ...MESSAGE_SELECTORS,
          ".bubble[data-mid]",
          "[data-mid]",
        ];

        debugSelectors.forEach((sel) => {
          const found = $$(sel);
          if (found.length > 0) {
            log.info(`✓ ${found.length} × ${sel}`);
            if (sel.includes("data-mid") && found.length > 0) {
              const mids = Array.from(found)
                .slice(0, 3)
                .map((el) => el.getAttribute("data-mid") || "null");
              log.info(`  📍 [${mids.join(", ")}]`);
            }
          }
        });

        refreshTranslations();
      }
    }, CONFIG.initialScanDelay);

    log.info("✨ Telegram Translator Pro v2.0 Clean initialized!");
  }
})();
