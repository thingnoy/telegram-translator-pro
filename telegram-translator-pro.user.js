// ==UserScript==
// @name         🌐 Telegram Translator Pro by sadoi
// @namespace    sadoi
// @version      1.4
// @description  Advanced Telegram Web translator with proper structure detection, data-mid caching, virtual scrolling support. Developed by sadoi
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
  let DEBUG = true; // Start with debug enabled
  const CONFIG = {
    maxCacheSize: 1000,
    maxConcurrentRequests: 3,
    requestTimeout: 10000,
    retryAttempts: 2,
    retryDelay: 1000,
    debounceDelay: 200,
    minTextLength: 3,
    initialScanDelay: 3000,
    scrollDebounceDelay: 150,
    intersectionThreshold: 0.1
  };

  // 🔍 Debug Logger
  const log = {
    info: (...args) => DEBUG && console.log("[Translator]", ...args),
    error: (...args) => DEBUG && console.error("[Translator]", ...args),
    warn: (...args) => DEBUG && console.warn("[Translator]", ...args)
  };

  // Wait for DOM to be ready
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

  // Initialize script
  waitForDOM().then(() => {
    log.info("✨ DOM ready, initializing Telegram Translator Pro v1.4");
    initializeScript();
  });

  function initializeScript() {

  // 💠 Styles
  GM_addStyle(`
    #tg-panel-toggle {
      transition: filter 0.3s ease !important;
      position: fixed !important;
      right: 20px !important;
      bottom: 20px !important;
      width: 56px !important;
      height: 56px !important;
      border-radius: 16px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 28px !important;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important;
      box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4) !important;
      cursor: pointer !important;
      z-index: 2147483647 !important;
      backdrop-filter: blur(10px) !important;
    }
    #tg-panel-toggle:hover {
      box-shadow: 0 12px 48px rgba(102, 126, 234, 0.5) !important;
    }
    #tg-panel {
      position: fixed !important;
      right: 20px !important;
      bottom: 20px !important;
      width: 320px;
      max-height: 85vh;
      overflow-y: auto;
      background: linear-gradient(145deg, #1e1e2e 0%, #2d2d44 100%);
      border-radius: 20px;
      color: #e0e0ff;
      box-shadow: 0 20px 60px rgba(102, 126, 234, 0.3);
      padding: 20px;
      display: none;
      backdrop-filter: blur(20px);
      border: 1px solid rgba(102, 126, 234, 0.2);
      z-index: 2147483647 !important;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    #tg-panel.show {
      opacity: 1;
    }
    #tg-close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: #e0e0ff;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    #tg-close-btn:hover {
      background: rgba(255, 100, 100, 0.3);
      transform: rotate(90deg);
    }
    #tg-panel h3 {
      margin: 0 0 16px 0;
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 700;
      letter-spacing: 0.5px;
      font-size: 18px;
    }
    .tg-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin: 12px 0;
    }
    .tg-label {
      font-size: 12px;
      color: #a0a0ff;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .tg-select, .tg-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(102, 126, 234, 0.08);
      border: 1.5px solid rgba(102, 126, 234, 0.2);
      color: #e0e0ff;
      font-size: 13px;
      outline: none;
      transition: all 0.2s ease;
    }
    .tg-select:focus, .tg-input:focus {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.12);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    .tg-select option { background: #1e1e2e; color: #e0e0ff; }
    .tg-btn {
      width: 100%;
      padding: 10px;
      margin-top: 8px;
      border-radius: 12px;
      background: rgba(102, 126, 234, 0.15);
      border: 1.5px solid rgba(102, 126, 234, 0.3);
      cursor: pointer;
      color: #e0e0ff;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .tg-btn:hover {
      background: rgba(102, 126, 234, 0.25);
      transform: translateY(-1px);
    }
    .tg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .tg-btn.positive {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
    }
    .tg-btn.positive:hover {
      box-shadow: 0 6px 24px rgba(102, 126, 234, 0.4);
      transform: translateY(-2px);
    }
    .tg-stats {
      margin-top: 16px;
      padding: 12px;
      background: rgba(102, 126, 234, 0.08);
      border-radius: 12px;
      font-size: 11px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      border: 1px solid rgba(102, 126, 234, 0.15);
    }
    .tg-stat-item {
      text-align: center;
      padding: 6px;
      border-radius: 8px;
      background: rgba(102, 126, 234, 0.05);
    }
    .tg-stat-item:last-child {
      grid-column: span 2;
    }
    .tg-stat-value {
      color: #667eea;
      font-weight: 700;
      font-size: 16px;
    }
    .tg-stat-label {
      color: #8888aa;
      font-size: 10px;
      margin-top: 2px;
    }
    .tg-footer {
      margin-top: 16px;
      text-align: center;
      font-size: 11px;
      color: #8888aa;
    }
    .tg-footer > div:first-child {
      color: #667eea;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .tg-translated-text {
      margin-top: 8px;
      padding: 8px 12px;
      color: #a594f9;
      font-size: 0.9em;
      background: rgba(102, 126, 234, 0.12);
      border-left: 3px solid #667eea;
      border-radius: 8px;
      animation: fadeInSlide 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes fadeInSlide {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    .tg-checkbox-container {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 10px;
      background: rgba(102, 126, 234, 0.05);
      transition: all 0.2s ease;
    }
    .tg-checkbox-container:hover {
      background: rgba(102, 126, 234, 0.1);
    }
    .tg-checkbox-container input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #667eea;
    }
    .tg-checkbox-container label {
      cursor: pointer;
      font-size: 13px;
      color: #c0c0e0;
    }
    @keyframes slideInTop {
      from { opacity: 0; transform: translateY(-30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut { to { opacity: 0; }}

    #tg-panel::-webkit-scrollbar {
      width: 6px;
    }
    #tg-panel::-webkit-scrollbar-track {
      background: rgba(102, 126, 234, 0.05);
      border-radius: 10px;
    }
    #tg-panel::-webkit-scrollbar-thumb {
      background: rgba(102, 126, 234, 0.3);
      border-radius: 10px;
    }
    #tg-panel::-webkit-scrollbar-thumb:hover {
      background: rgba(102, 126, 234, 0.5);
    }
  `);

  // 🌐 Language Options
  const languages = [
    ["ar", "العربية (Arabic)"],
    ["en", "English"],
    ["fr", "Français (French)"],
    ["es", "Español (Spanish)"],
    ["de", "Deutsch (German)"],
    ["ru", "Русский (Russian)"],
    ["zh-CN", "中文简体 (Chinese Simplified)"],
    ["zh-TW", "中文繁體 (Chinese Traditional)"],
    ["ja", "日本語 (Japanese)"],
    ["it", "Italiano (Italian)"],
    ["pt", "Português (Portuguese)"],
    ["tr", "Türkçe (Turkish)"],
    ["ko", "한국어 (Korean)"],
    ["hi", "हिन्दी (Hindi)"],
    ["nl", "Nederlands (Dutch)"],
    ["sv", "Svenska (Swedish)"],
    ["pl", "Polski (Polish)"],
    ["uk", "Українська (Ukrainian)"],
    ["id", "Bahasa Indonesia"],
    ["th", "ไทย (Thai)"],
    ["fa", "فارسی (Persian)"],
    ["he", "עברית (Hebrew)"],
    ["vi", "Tiếng Việt (Vietnamese)"],
    ["ro", "Română (Romanian)"],
    ["cs", "Čeština (Czech)"],
    ["fi", "Suomi (Finnish)"],
    ["el", "Ελληνικά (Greek)"]
  ];

  // 🎨 Create UI
  const langOptions = languages.map(([code, name]) => `<option value="${code}">${name}</option>`).join("");
  const sourceOptions = `<option value="auto">🔍 Auto-detect</option>${langOptions}`;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="tg-panel-toggle" title="Open Translator (Alt+T)">💬</div>
    <div id="tg-panel" role="dialog" aria-label="Translator Pro Settings">
      <div id="tg-close-btn" title="Close (Esc)">×</div>
      <h3>✨ Translator Pro ✨</h3>
      <div class="tg-row">
        <label class="tg-checkbox-container">
          <input type="checkbox" id="tg-enabled">
          <label for="tg-enabled">Enable Translation</label>
        </label>
      </div>
      <div class="tg-row">
        <label class="tg-label">Target Language:</label>
        <select id="tg-lang-select" class="tg-select">${langOptions}</select>
      </div>
      <div class="tg-row">
        <label class="tg-label">Source Language:</label>
        <select id="tg-source-lang-select" class="tg-select">${sourceOptions}</select>
      </div>
      <div class="tg-row">
        <label class="tg-checkbox-container">
          <input type="checkbox" id="tg-skip-same-lang">
          <label for="tg-skip-same-lang">Skip if already in target language</label>
        </label>
      </div>
      <div class="tg-row">
        <label class="tg-checkbox-container">
          <input type="checkbox" id="tg-debug-mode">
          <label for="tg-debug-mode">🐛 Debug Mode (Console Logs)</label>
        </label>
      </div>
      <div class="tg-row">
        <label class="tg-label">Minimum text length to translate:</label>
        <input type="number" id="tg-min-length" class="tg-input" min="1" max="100" value="3">
      </div>
      <button id="tg-clear-btn" class="tg-btn">🗑️ Clear Cache</button>
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
          <div class="tg-stat-label">Persist Cache</div>
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
        <div style="margin-top: 4px; font-size: 10px;">Version 1.4 - Structure Fixed</div>
        <div style="font-size: 10px; margin-top: 6px; opacity: 0.7;">Alt+T • Alt+R</div>
      </div>
    </div>
  `);

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
    debugModeInput: $("tg-debug-mode"),
    minLengthInput: $("tg-min-length"),
    clearBtn: $("tg-clear-btn"),
    refreshBtn: $("tg-refresh-btn"),
    stats: {
      translated: $("tg-stat-translated"),
      cached: $("tg-stat-cached"),
      persist: $("tg-stat-persist"),
      errors: $("tg-stat-errors"),
      skipped: $("tg-stat-skipped")
    }
  };

  log.info("✓ UI elements created");

  // 💾 State Management
  const storage = {
    get: (key, defaultValue) => localStorage.getItem(key) ?? defaultValue,
    set: (key, value) => localStorage.setItem(key, value),
    getBool: (key, defaultValue = false) => localStorage.getItem(key) === "true" || (localStorage.getItem(key) === null && defaultValue)
  };

  const state = {
    targetLang: storage.get("tg_target_lang", "th"),
    sourceLang: storage.get("tg_source_lang", "auto"),
    enabled: storage.getBool("tg_enabled", true),
    skipSameLang: storage.getBool("tg_skip_same_lang", false),
    debugMode: storage.getBool("tg_debug_mode", true),
    minLength: parseInt(storage.get("tg_min_length", CONFIG.minTextLength)),
    stats: { translated: 0, cached: 0, errors: 0, skipped: 0 }
  };

  // Apply initial state to UI
  DEBUG = state.debugMode;
  elements.langSelect.value = state.targetLang;
  elements.sourceLangSelect.value = state.sourceLang;
  elements.enableInput.checked = state.enabled;
  elements.skipSameLangInput.checked = state.skipSameLang;
  elements.debugModeInput.checked = state.debugMode;
  elements.minLengthInput.value = state.minLength;

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

  // 🔔 Notification System
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
  const createSettingHandler = (key, element, isBoolean = false, callback = null) => {
    element.onchange = () => {
      const value = isBoolean ? element.checked : (element.type === "number" ? parseInt(element.value) : element.value);
      state[key] = value;
      storage.set(`tg_${key.replace(/([A-Z])/g, "_$1").toLowerCase()}`, value);
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
  createSettingHandler("debugMode", elements.debugModeInput, true, () => {
    DEBUG = state.debugMode;
    log.info(`Debug mode ${DEBUG ? 'enabled' : 'disabled'}`);
    showNotification(`🐛 Debug mode ${DEBUG ? 'ON' : 'OFF'}`);
  });
  createSettingHandler("minLength", elements.minLengthInput);

  // 💾 Cache Management
  const translateCache = new Map();
  const addToCache = (key, value) => {
    if (translateCache.size >= CONFIG.maxCacheSize) {
      const firstKey = translateCache.keys().next().value;
      translateCache.delete(firstKey);
    }
    translateCache.set(key, value);
  };

  elements.clearBtn.onclick = () => {
    translateCache.clear();
    translationPersistCache.clear();
    state.stats = { translated: 0, cached: 0, errors: 0, skipped: 0 };
    updateStats();
    log.info("✓ All caches cleared");
    showNotification("✨ All caches cleared!");
  };

  elements.refreshBtn.onclick = () => refreshTranslations();

  // 🔍 Text Validation
  const shouldSkipText = (text) => {
    if (!text || text.length < state.minLength) return true;
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
          await new Promise(r => requestQueue.push(r));
        }

        const wasIdle = activeRequests === 0;
        activeRequests++;

        if (wasIdle) {
          elements.toggleBtn.style.filter = "grayscale(100%) brightness(1.2)";
        }

        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${state.sourceLang}&tl=${state.targetLang}&dt=t&q=${encodeURIComponent(trimmedText)}`;

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
            setTimeout(() => translateText(text, retries - 1).then(resolve), CONFIG.retryDelay);
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
              if (!result?.[0] || !Array.isArray(result[0])) throw new Error("Invalid response");

              const translated = result[0]
                .filter(t => t?.[0])
                .map(t => t[0])
                .join("")
                .trim();

              if (state.skipSameLang && translated === trimmedText) {
                state.stats.skipped++;
                updateStats();
                return resolve(null);
              }

              handleResponse(translated && translated !== trimmedText, translated);
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
          }
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
    $$(".tg-translated-text").forEach(el => el.remove());
    log.info("All translations removed");
  };

  // 🎯 Message Detection - Telegram Web K Structure
  const MESSAGE_SELECTORS = [
    ".message .translatable-message",  // Primary text container in TG Web K
    ".translatable-message",
    ".message-text",
    ".message .text",
    ".text-content"
  ];

  const getMessageId = (msgElement) => {
    // Find parent bubble with data-mid
    const bubble = msgElement.closest('.bubble[data-mid]');
    if (bubble) {
      const mid = bubble.getAttribute('data-mid');
      return mid;
    }

    // Try any parent with data-mid
    const anyParent = msgElement.closest('[data-mid]');
    if (anyParent) {
      return anyParent.getAttribute('data-mid');
    }

    // Fallback: hash
    const text = msgElement.innerText?.trim();
    if (text) {
      let hash = 0;
      for (let i = 0; i < Math.min(text.length, 100); i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
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
    if (!text || text.length < state.minLength) return;

    if (msgElement.querySelector(".tg-translated-text")) return;

    const messageId = getMessageId(msgElement);
    if (!messageId) return;

    // Check cache
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
      log.info(`✓ Translated [${messageId}]: "${text.substring(0, 30)}..."`);
    }
  };

  // 🔄 Refresh Translations
  const refreshTranslations = async () => {
    if (!state.enabled) {
      showNotification("⚠️ Translation disabled");
      return;
    }

    log.info("=== Refreshing translations ===");
    removeAllTranslations();

    let allMessages = [];
    for (const selector of MESSAGE_SELECTORS) {
      const found = $$(selector);
      if (found.length > 0) {
        log.info(`✓ Found ${found.length} with: ${selector}`);
        allMessages = [...new Set([...allMessages, ...found])];
      }
    }

    log.info(`Total: ${allMessages.length} messages`);
    let processed = 0;
    let restored = 0;

    for (const msg of allMessages) {
      const text = msg.innerText?.trim();
      if (text && text.length >= state.minLength) {
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
      await new Promise(r => setTimeout(r, 50));
    }

    log.info(`=== Done: ${processed} new, ${restored} cached ===`);
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
            if (text && text.length >= state.minLength) {
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

      // Debug info
      const debugSelectors = [
        ...MESSAGE_SELECTORS,
        ".bubble[data-mid]",
        "[data-mid]"
      ];

      debugSelectors.forEach(sel => {
        const found = $$(sel);
        if (found.length > 0) {
          log.info(`✓ ${found.length} × ${sel}`);
          if (sel.includes("data-mid") && found.length > 0) {
            const mids = Array.from(found).slice(0, 3).map(el => el.getAttribute('data-mid') || 'null');
            log.info(`  📍 data-mid examples: [${mids.join(', ')}]`);
          }
        }
      });

      refreshTranslations();
    }
  }, CONFIG.initialScanDelay);

  log.info("✨ Telegram Translator Pro v1.4 initialized!");

  } // end initializeScript
})();
