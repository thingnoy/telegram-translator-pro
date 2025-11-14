// ==UserScript==
// @name         🌐 Telegram Translator Pro by sadoi
// @namespace    sadoi
// @version      3.0
// @description  Liquid Glass UI Telegram Web translator with smart caching. Developed by sadoi
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
      "✨ DOM ready, initializing Telegram Translator Pro v3.0 (Liquid Glass)"
    );
    initializeScript();
  });

  function initializeScript() {
    // 🌊 Liquid Glass UI Style
    GM_addStyle(`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    * {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* Floating Button - Liquid Glass */
    #tg-panel-toggle {
      position: fixed;
      right: 12px;
      bottom: 64px;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      background: linear-gradient(135deg,
        rgba(0, 212, 255, 0.9),
        rgba(0, 153, 255, 0.9));
      backdrop-filter: blur(12px) saturate(180%);
      -webkit-backdrop-filter: blur(12px) saturate(180%);
      color: white;
      border: 1.5px solid rgba(255, 255, 255, 0.25);
      box-shadow:
        0 8px 32px rgba(0, 212, 255, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.25);
      cursor: pointer;
      z-index: 2147483647;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    #tg-panel-toggle:hover {
      transform: translateY(-2px);
      box-shadow:
        0 12px 40px rgba(0, 212, 255, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.35);
      background: linear-gradient(135deg,
        rgba(0, 229, 255, 0.95),
        rgba(0, 170, 255, 0.95));
    }
    #tg-panel-toggle:active {
      transform: scale(0.95);
    }

    /* Main Panel - Liquid Glass */
    #tg-panel {
      position: fixed !important;
      right: 20px !important;
      bottom: 20px !important;
      width: 320px;
      max-height: 85vh;
      overflow-y: auto;
      background: linear-gradient(145deg,
        rgba(25, 30, 40, 0.3),
        rgba(18, 22, 32, 0.3)) !important;
      backdrop-filter: blur(14px) saturate(150%) !important;
      -webkit-backdrop-filter: blur(20px) saturate(150%) !important;
      border-radius: 20px;
      color: white;
      box-shadow:
        0 20px 60px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.12) inset,
        0 2px 4px rgba(255, 255, 255, 0.08) inset;
      padding: 48px 20px 20px 20px;
      display: none;
      border: 1.5px solid rgba(255, 255, 255, 0.15);
      z-index: 2147483647 !important;
      opacity: 0;
      transform: scale(0.95) translateY(10px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    #tg-panel.show {
      opacity: 1;
      transform: scale(1) translateY(0);
    }

    /* Close Button - Glass */
    #tg-close-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid rgba(255, 255, 255, 0.15);
      z-index: 10;
      font-weight: 300;
      line-height: 1;
    }
    #tg-close-btn:hover {
      background: rgba(255, 59, 48, 0.25);
      color: #ff6b6b;
      border-color: rgba(255, 59, 48, 0.4);
      backdrop-filter: blur(15px);
    }
    #tg-close-btn:active {
      transform: scale(0.9);
    }

    /* Main Toggle - Compact */
    .tg-main-toggle {
      margin-bottom: 20px;
    }

    .tg-toggle-info {
      flex: 1;
    }

    .tg-toggle-title {
      display: block;
      font-size: 16px;
      font-weight: 700;
      color: white;
      margin-bottom: 2px;
      letter-spacing: -0.3px;
    }

    .tg-toggle-subtitle {
      display: block;
      font-size: 12px;
      color: #666;
      font-weight: 500;
    }

    /* Sections - Compact Spacing */
    .tg-section {
      margin-bottom: 20px;
    }

    /* Language Picker - Glass */
    .tg-lang-picker {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      border: 1.5px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      transition: all 0.3s ease;
    }
    .tg-lang-picker:hover {
      border-color: rgba(0, 212, 255, 0.5);
      background: rgba(255, 255, 255, 0.12);
      box-shadow: 0 4px 20px rgba(0, 212, 255, 0.2);
    }

    .tg-lang-icon {
      font-size: 28px;
      flex-shrink: 0;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
    }

    .tg-lang-content {
      flex: 1;
    }

    /* Labels - Clean */
    .tg-label {
      font-size: 11px;
      color: #666;
      font-weight: 700;
      margin-bottom: 8px;
      display: block;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Dropdowns - Compact */
    .tg-select {
      width: 100%;
      padding: 8px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: white;
      font-size: 15px;
      font-weight: 600;
      outline: none;
      transition: all 0.2s ease;
      -webkit-appearance: none;
      cursor: pointer;
    }
    .tg-select option {
      background: #1a1a1a;
      color: white;
      font-weight: 500;
      padding: 10px;
    }

    /* Toggle Switch - Liquid Glass */
    .tg-toggle-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      border: 1.5px solid rgba(255, 255, 255, 0.15);
      transition: all 0.3s ease;
      cursor: pointer;
      user-select: none;
    }
    .tg-toggle-container:hover {
      border-color: rgba(0, 212, 255, 0.5);
      background: rgba(255, 255, 255, 0.12);
      box-shadow: 0 4px 20px rgba(0, 212, 255, 0.15);
    }
    .tg-toggle-container:active {
      transform: scale(0.98);
    }

    /* Hide default checkbox */
    .tg-toggle-input {
      display: none;
    }

    /* Toggle Switch - Glass */
    .tg-toggle-switch {
      position: relative;
      width: 50px;
      height: 28px;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      border-radius: 14px;
      transition: all 0.3s ease;
      cursor: pointer;
      flex-shrink: 0;
      box-shadow:
        inset 0 2px 6px rgba(0, 0, 0, 0.2),
        0 1px 2px rgba(255, 255, 255, 0.1);
      border: 1.5px solid rgba(255, 255, 255, 0.15);
    }

    /* Toggle Slider - Glass */
    .tg-toggle-slider {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 24px;
      height: 24px;
      background: linear-gradient(145deg,
        rgba(255, 255, 255, 0.9),
        rgba(230, 230, 230, 0.9));
      border-radius: 50%;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow:
        0 2px 6px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.5);
    }

    /* Checked State - Glowing */
    .tg-toggle-input:checked + .tg-toggle-switch {
      background: linear-gradient(135deg,
        rgba(0, 212, 255, 0.3),
        rgba(0, 153, 255, 0.3));
      box-shadow:
        0 0 20px rgba(0, 212, 255, 0.5),
        inset 0 1px 2px rgba(255, 255, 255, 0.2);
      border-color: rgba(0, 212, 255, 0.6);
    }

    .tg-toggle-input:checked + .tg-toggle-switch .tg-toggle-slider {
      left: 24px;
      background: linear-gradient(145deg,
        rgba(255, 255, 255, 1),
        rgba(255, 255, 255, 0.95));
      box-shadow:
        0 2px 8px rgba(0, 212, 255, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.7);
    }

    /* Active State */
    .tg-toggle-input:checked ~ .tg-toggle-info .tg-toggle-title {
      color: #00d4ff;
      text-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
    }

    /* Button - Simple & Clean */
    .tg-btn.positive {
      width: 100%;
      padding: 14px;
      border-radius: 8px;
      background: #0088cc;
      color: white;
      font-weight: 600;
      font-size: 15px;
      border: none;
      cursor: pointer;
      transition: background 0.2s ease;
      margin-top: 16px;
    }
    .tg-btn.positive:hover {
      background: #0099dd;
    }
    .tg-btn.positive:active {
      background: #0077bb;
    }

    /* Bottom Section - Stats + Version */
    .tg-bottom {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #1a1a1a;
    }

    /* Stats - Liquid Glass */
    .tg-stats-inline {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 10px 14px;
      background: rgba(0, 212, 255, 0.15);
      backdrop-filter: blur(10px);
      border: 1.5px solid rgba(0, 212, 255, 0.3);
      border-radius: 10px;
      box-shadow:
        0 4px 16px rgba(0, 212, 255, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .tg-stat-item {
      display: flex;
      align-items: baseline;
      gap: 5px;
    }

    .tg-stat-value {
      color: #00d4ff;
      font-weight: 700;
      font-size: 17px;
      letter-spacing: -0.5px;
      text-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
    }

    .tg-stat-label {
      color: rgba(255, 255, 255, 0.6);
      font-size: 11px;
      font-weight: 500;
    }

    .tg-stat-divider {
      color: rgba(0, 136, 204, 0.4);
      font-size: 12px;
    }

    /* Version Info */
    .tg-version {
      text-align: center;
      margin-top: 12px;
      color: #444;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.3px;
    }

    /* Translation Display - Liquid Glass */
    .tg-translated-text {
      margin-top: 8px;
      padding: 10px 12px;
      color: #00d4ff;
      font-size: 14px;
      background: linear-gradient(135deg,
        rgba(0, 212, 255, 0.15),
        rgba(0, 153, 255, 0.1));
      backdrop-filter: blur(12px);
      border-left: 3px solid #00d4ff;
      border-radius: 8px;
      font-weight: 600;
      line-height: 1.4;
      border: 1.5px solid rgba(0, 212, 255, 0.3);
      box-shadow:
        0 4px 12px rgba(0, 212, 255, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      text-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
    }

    /* Scrollbar - Minimal */
    #tg-panel::-webkit-scrollbar {
      width: 6px;
    }
    #tg-panel::-webkit-scrollbar-track {
      background: transparent;
    }
    #tg-panel::-webkit-scrollbar-thumb {
      background: #2a2a2a;
      border-radius: 10px;
    }
    #tg-panel::-webkit-scrollbar-thumb:hover {
      background: #444;
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
    <div id="tg-panel-toggle" title="Open Translator (Alt+T)">🌐</div>
    <div id="tg-panel" role="dialog" aria-label="Translator">
      <div id="tg-close-btn" title="Close (Esc)">×</div>

      <!-- BIG Toggle - Main Action -->
      <div class="tg-main-toggle">
        <label class="tg-toggle-container" for="tg-enabled">
          <div class="tg-toggle-info">
            <span class="tg-toggle-title">Translate Messages</span>
            <span class="tg-toggle-subtitle">Auto translate all chats</span>
          </div>
          <input type="checkbox" id="tg-enabled" class="tg-toggle-input">
          <div class="tg-toggle-switch">
            <div class="tg-toggle-slider"></div>
          </div>
        </label>
      </div>

      <!-- Simple Language Picker -->
      <div class="tg-section">
        <div class="tg-lang-picker">
          <div class="tg-lang-icon">🌍</div>
          <div class="tg-lang-content">
            <label class="tg-label">Translate to</label>
            <select id="tg-lang-select" class="tg-select">${langOptions}</select>
          </div>
        </div>
      </div>

      <!-- Stats & Footer - Combined -->
      <div class="tg-bottom">
        <div class="tg-stats-inline">
          <div class="tg-stat-item">
            <span class="tg-stat-value" id="tg-stat-translated">0</span>
            <span class="tg-stat-label">translated</span>
          </div>
          <div class="tg-stat-divider">•</div>
          <div class="tg-stat-item">
            <span class="tg-stat-value" id="tg-stat-persist">0</span>
            <span class="tg-stat-label">saved</span>
          </div>
        </div>
        <div class="tg-version">v3.0 Liquid Glass • Press Alt+T</div>
      </div>

      <!-- Hidden Advanced -->
      <input type="checkbox" id="tg-skip-same-lang" style="display:none">
      <select id="tg-source-lang-select" style="display:none">${sourceOptions}</select>
      <button id="tg-refresh-btn" style="display:none"></button>
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
      refreshBtn: $("tg-refresh-btn"),
      stats: {
        translated: $("tg-stat-translated"),
        cached: $("tg-stat-cached"),
        persist: $("tg-stat-persist"),
        errors: $("tg-stat-errors"),
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

    // 📊 Stats Update & Persistent Cache with localStorage
    const CACHE_KEY = "tg_translation_cache";
    const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Load cache from localStorage
    const loadPersistCache = () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return new Map();

        const parsed = JSON.parse(cached);
        const now = Date.now();
        const filtered = Object.entries(parsed)
          .filter(([_, data]) => now - data.timestamp < MAX_CACHE_AGE)
          .map(([id, data]) => [id, data.text]);

        return new Map(filtered);
      } catch (e) {
        log.error("Failed to load cache:", e);
        return new Map();
      }
    };

    // Save cache to localStorage
    const savePersistCache = (cache) => {
      try {
        const now = Date.now();
        const obj = Object.fromEntries(
          Array.from(cache.entries()).map(([id, text]) => [
            id,
            { text, timestamp: now },
          ])
        );
        localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
      } catch (e) {
        log.error("Failed to save cache:", e);
      }
    };

    const translationPersistCache = loadPersistCache();
    log.info(`✓ Loaded ${translationPersistCache.size} cached translations`);

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

    // 🔔 Notification - Disabled (too distracting)
    const showNotification = (message) => {
      // Notifications disabled - only log to console
      log.info("Notification:", message);
    };

    // 🎮 UI Controls
    const togglePanel = (show) => {
      if (show) {
        elements.panel.style.display = "block";
        elements.toggleBtn.style.visibility = "hidden";
        elements.toggleBtn.style.pointerEvents = "none";
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            elements.panel.classList.add("show");
          });
        });
      } else {
        elements.panel.classList.remove("show");
        // Show button immediately when closing
        elements.toggleBtn.style.visibility = "visible";
        elements.toggleBtn.style.pointerEvents = "auto";
        // Hide panel after animation completes
        setTimeout(() => {
          elements.panel.style.display = "none";
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

    // Auto-enable Skip Same Language
    state.skipSameLang = true;
    elements.skipSameLangInput.checked = true;
    storage.set("tg_skip_same_lang", "true");

    // Auto set source to auto
    state.sourceLang = "auto";
    elements.sourceLangSelect.value = "auto";
    storage.set("tg_source_lang", "auto");

    createSettingHandler("targetLang", elements.langSelect, false, () => {
      if (state.enabled) refreshTranslations();
    });
    createSettingHandler("enabled", elements.enableInput, true, () => {
      if (state.enabled) {
        refreshTranslations();
      } else {
        removeAllTranslations();
      }
    });

    // 💾 Cache Management
    const translateCache = new Map();
    const addToCache = (key, value) => {
      if (translateCache.size >= CONFIG.maxCacheSize) {
        const firstKey = translateCache.keys().next().value;
        translateCache.delete(firstKey);
      }
      translateCache.set(key, value);
    };

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

      // Cache key includes target language
      const cacheKey = `${messageId}:${state.targetLang}`;

      if (translationPersistCache.has(cacheKey)) {
        const cached = translationPersistCache.get(cacheKey);
        renderTranslation(msgElement, cached);
        updateStats();
        log.info(`✓ Restored [${messageId}] (${state.targetLang})`);
        return;
      }

      processedMessages.add(msgElement);

      const translated = await translateText(text);
      if (translated && translated !== text) {
        translationPersistCache.set(cacheKey, translated);
        savePersistCache(translationPersistCache); // Save to localStorage
        renderTranslation(msgElement, translated);
        updateStats();
        log.info(`✓ Translated [${messageId}] → ${state.targetLang}`);
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

          // Cache key includes target language
          const cacheKey = `${messageId}:${state.targetLang}`;

          if (translationPersistCache.has(cacheKey)) {
            renderTranslation(msg, translationPersistCache.get(cacheKey));
            restored++;
          } else {
            const translated = await translateText(text);
            if (translated && translated !== text) {
              translationPersistCache.set(cacheKey, translated);
              renderTranslation(msg, translated);
              processed++;
            }
          }
        }
        await new Promise((r) => setTimeout(r, 50));
      }

      // Save all new translations to localStorage
      if (processed > 0) {
        savePersistCache(translationPersistCache);
        log.info(`✓ Saved ${processed} new translations to localStorage`);
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
