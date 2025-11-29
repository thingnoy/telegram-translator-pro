// ==UserScript==
// @name         Telegram Ad Filter Pro
// @version      2.3.0
// @description  Beautiful ad filtering with multiple filter modes, debug mode, and Liquid Glass UI
// @license      MIT
// @author       sadoi
// @icon         https://web.telegram.org/favicon.ico
// @namespace    telegram-ad-filter-pro
// @match        https://web.telegram.org/k/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @homepage     https://github.com/sadoi/telegram-tools
// @homepageURL  https://github.com/sadoi/telegram-tools
// @supportURL   https://github.com/sadoi/telegram-tools
// ==/UserScript==

/* jshint esversion: 11 */

(() => {
  "use strict";

  // Filter Modes Configuration
  const FILTER_MODES = {
    BLUR: {
      id: "blur",
      name: "Blur Effect",
      icon: "🌫️",
      description: "Blur advertisements with smooth effect",
    },
    COLLAPSE: {
      id: "collapse",
      name: "Collapse",
      icon: "📦",
      description: "Collapse messages to thin bars",
    },
    DEBUG: {
      id: "debug",
      name: "Debug Mode",
      icon: "🔍",
      description: "Highlight matched words for debugging",
    },
  };

  // Configuration
  const CONFIG = {
    panelWidth: 360,
    animationDuration: 300,
    debounceDelay: 200,
    maxFilteredMessages: 1000,
    defaultBlacklist: [
      "advertisement",
      "promo",
      "sale",
      "discount",
      "offer",
      "deal",
      "buy now",
      "limited time",
      "special offer",
      "click here",
      "free trial",
      "instant access",
      "act now",
      "don't miss",
      "#advertisement",
      "#promo",
      "#paid",
      "#sponsor",
      "#collab",
      "#акция",
      "#взаимопиар",
      "#партнерский",
      "#промо",
      "#продвижение",
      "#реклам",
      "#спонсор",
      "博彩平台",
      "包存取款",
    ],
  };

  // State management
  let isEnabled = true;
  let currentMode = "blur"; // Default mode
  let customWords = [];
  let filteredCount = 0;
  let filterStats = { today: 0, total: 0 };
  let isPanelOpen = false;
  let floatingButton = null;
  let filterPanel = null;
  let filteredMessages = new Set(); // Track filtered message IDs
  let revealedMessages = new Set(); // Track revealed message IDs

  // Liquid Glass UI Styles with Multiple Filter Modes
  const STYLES = `
        /* Base Filtered Message Styles */
        .tgaf-filtered-message {
            position: relative;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
        }

        /* Mode 1: Blur Effect */
        .tgaf-filtered-message.mode-blur {
            opacity: 0.3;
            filter: blur(2px);
            pointer-events: none;
        }

        .tgaf-filtered-message.mode-blur::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg,
                rgba(255, 59, 48, 0.1) 0%,
                rgba(255, 149, 0, 0.1) 100%);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            z-index: 1;
        }

        .tgaf-filtered-message.mode-blur.revealed {
            opacity: 1;
            filter: blur(0);
            pointer-events: auto;
        }

        .tgaf-filtered-message.mode-blur.revealed::before {
            display: none;
        }

        /* Mode 2: Collapse */
        .tgaf-filtered-message.mode-collapse {
            max-height: 32px !important;
            overflow: hidden;
            opacity: 0.8;
            filter: none;
        }

        .tgaf-filtered-message.mode-collapse > *:not(.tgaf-filter-badge) {
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
        }

        .tgaf-filtered-message.mode-collapse .tgaf-collapse-bar {
            display: flex !important;
            align-items: center;
            justify-content: center;
            padding: 8px 16px;
            background: linear-gradient(135deg, #ff3b30 0%, #ff9500 100%);
            color: white;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            margin: 4px;
        }

        .tgaf-filtered-message.mode-collapse.revealed {
            max-height: none !important;
        }

        .tgaf-filtered-message.mode-collapse.revealed > *:not(.tgaf-filter-badge):not(.tgaf-collapse-bar) {
            opacity: 1;
            transform: translateY(0);
        }

        .tgaf-filtered-message.mode-collapse.revealed .tgaf-collapse-bar {
            display: none !important;
        }

        /* Mode 3: Debug */
        .tgaf-filtered-message.mode-debug {
            opacity: 1;
            filter: none;
            border: 2px solid rgba(255, 149, 0, 0.5);
            background: rgba(255, 149, 0, 0.05);
            border-radius: 12px;
            padding: 8px;
            margin: 4px 0;
        }

        .tgaf-filtered-message.mode-debug .tgaf-highlight {
            background: linear-gradient(135deg, rgba(255, 59, 48, 0.3) 0%, rgba(255, 149, 0, 0.3) 100%);
            color: #ff3b30;
            font-weight: 600;
            padding: 2px 4px;
            border-radius: 4px;
            border-bottom: 2px solid #ff9500;
            box-shadow: 0 2px 4px rgba(255, 59, 48, 0.2);
        }

        /* Filter Badge (for all modes) */
        .tgaf-filter-badge {
            position: absolute;
            top: 8px;
            right: 8px;
            background: linear-gradient(135deg, #ff3b30 0%, #ff9500 100%);
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            z-index: 10;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(255, 59, 48, 0.3);
        }

        .tgaf-filter-badge:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(255, 59, 48, 0.4);
        }

        /* Collapse bar and slide tab (hidden by default) */
        .tgaf-collapse-bar, .tgaf-slide-tab {
            display: none;
        }

        /* Floating Button */
        .tgaf-filter-float-btn {
            position: fixed;
            bottom: 100px;
            right: 12px;
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #ff3b30 0%, #ff9500 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10000;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 8px 32px rgba(255, 59, 48, 0.3);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tgaf-filter-float-btn:hover {
            transform: scale(1.1) rotate(10deg);
            box-shadow: 0 12px 48px rgba(255, 59, 48, 0.4);
        }

        .tgaf-filter-float-btn:active {
            transform: scale(0.95);
        }

        .tgaf-filter-float-btn.active {
            background: linear-gradient(135deg, #34c759 0%, #30d158 100%);
            box-shadow: 0 8px 32px rgba(52, 199, 89, 0.3);
        }

        .tgaf-filter-float-btn .tgaf-icon {
            font-size: 24px;
            color: white;
        }

        .tgaf-filter-float-btn .tgaf-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: #ff3b30;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
        }

        /* Filter Panel - Liquid Glass Design */
        .tgaf-filter-panel {
            position: fixed;
            right: 20px;
            bottom: 100px;
            width: ${CONFIG.panelWidth}px;
            max-height: 85vh;
            background: rgba(25, 25, 35, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
            z-index: 10001;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
        }

        .tgaf-filter-panel.open {
            opacity: 1;
            visibility: visible;
        }

        .tgaf-filter-panel .tgaf-panel-header {
            padding: 20px;
            background: linear-gradient(135deg,
                rgba(255, 59, 48, 0.1) 0%,
                rgba(255, 149, 0, 0.1) 100%);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .tgaf-filter-panel .tgaf-panel-title {
            color: white;
            font-size: 18px;
            font-weight: 600;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .tgaf-filter-panel .tgaf-close-btn {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            font-size: 16px;
        }

        .tgaf-filter-panel .tgaf-close-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.1);
        }

        .tgaf-filter-panel .tgaf-panel-content {
            padding: 20px;
            max-height: calc(85vh - 140px);
            overflow-y: auto;
        }

        .tgaf-filter-panel .tgaf-section {
            margin-bottom: 24px;
        }

        .tgaf-filter-panel .tgaf-section-title {
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }

        /* Filter Mode Selector */
        .tgaf-filter-panel .tgaf-mode-selector {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 16px;
        }

        .tgaf-filter-panel .tgaf-mode-option {
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid transparent;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
        }

        .tgaf-filter-panel .tgaf-mode-option:hover {

            background: linear-gradient(135deg,
                rgba(255, 255, 255, 0.12) 0%,
                rgba(255, 255, 255, 0.08) 100%);
            backdrop-filter: blur(10px);
            transform: translateY(-2px);
        }

        .tgaf-filter-panel .tgaf-mode-option.active {
            background: linear-gradient(135deg, rgba(255, 59, 48, 0.2) 0%, rgba(255, 149, 0, 0.2) 100%);
            border-color: rgba(255, 149, 0, 0.5);
        }

        .tgaf-filter-panel .tgaf-mode-icon {
            font-size: 20px;
            margin-bottom: 4px;
            display: block;
        }

        .tgaf-filter-panel .tgaf-mode-name {
            color: white;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 2px;
        }

        .tgaf-filter-panel .tgaf-mode-desc {
            color: rgba(255, 255, 255, 0.6);
            font-size: 10px;
            line-height: 1.3;
        }

        /* Toggle Switch - iOS Style */
        .tgaf-filter-panel .tgaf-toggle-switch {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 18px 22px;
            background: linear-gradient(135deg,
                rgba(255, 255, 255, 0.12) 0%,
                rgba(255, 255, 255, 0.08) 100%);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            margin-bottom: 20px;
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .tgaf-filter-panel .tgaf-toggle-switch:hover {
            background: rgba(255, 255, 255, 0.12);
            border-color: rgba(255, 255, 255, 0.15);
        }

        .tgaf-filter-panel .tgaf-toggle-label {
            color: rgba(255, 255, 255, 0.9);
            font-size: 15px;
            font-weight: 600;
            letter-spacing: 0.3px;
        }

        /* iOS-Style Toggle Switch - Beautiful Design */
        .tgaf-filter-panel .tgaf-switch {
            position: relative;
            width: 51px;
            height: 31px;
            background: linear-gradient(145deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05));
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow:
                inset 0 2px 4px rgba(0, 0, 0, 0.2),
                inset 0 1px 2px rgba(0, 0, 0, 0.1),
                0 1px 2px rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
        }

        .tgaf-filter-panel .tgaf-switch:hover {
            transform: scale(1.02);
            box-shadow:
                inset 0 2px 4px rgba(0, 0, 0, 0.15),
                inset 0 1px 2px rgba(0, 0, 0, 0.08),
                0 2px 8px rgba(255, 255, 255, 0.15);
        }

        .tgaf-filter-panel .tgaf-switch.active {
            background: linear-gradient(145deg, #34c759 0%, #30d158 50%, #32d74b 100%);
            border-color: rgba(50, 215, 75, 0.6);
            box-shadow:
                inset 0 1px 2px rgba(255, 255, 255, 0.3),
                0 2px 12px rgba(52, 199, 89, 0.4),
                0 4px 8px rgba(52, 199, 89, 0.2);
        }

        .tgaf-filter-panel .tgaf-switch-handle {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 27px;
            height: 27px;
            background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 50%, #e9ecef 100%);
            border-radius: 50%;
            transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            box-shadow:
                0 3px 6px rgba(0, 0, 0, 0.16),
                0 3px 6px rgba(0, 0, 0, 0.23),
                0 0 0 1px rgba(255, 255, 255, 0.5) inset,
                0 1px 1px rgba(255, 255, 255, 0.8) inset;
            border: 1px solid rgba(255, 255, 255, 0.8);
            pointer-events: none;
        }

        .tgaf-filter-panel .tgaf-switch-handle::before {
            content: '';
            position: absolute;
            top: 3px;
            left: 3px;
            width: 8px;
            height: 8px;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 70%);
            border-radius: 50%;
            opacity: 0.8;
        }

        .tgaf-filter-panel .tgaf-switch.active .tgaf-switch-handle {
            transform: translateX(20px);
            background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
            box-shadow:
                0 2px 4px rgba(0, 0, 0, 0.2),
                0 4px 8px rgba(52, 199, 89, 0.3),
                0 0 0 1px rgba(255, 255, 255, 0.6) inset,
                0 1px 1px rgba(255, 255, 255, 0.9) inset;
            border-color: rgba(255, 255, 255, 0.9);
        }

        .tgaf-filter-panel .tgaf-switch.active .tgaf-switch-handle::before {
            background: radial-gradient(circle, rgba(52, 199, 89, 0.3) 0%, rgba(52, 199, 89, 0) 70%);
            opacity: 1;
        }

          /* Words Input */
        .tgaf-filter-panel .tgaf-words-input {
            width: 100%;
            min-height: 100px;
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: white;
            font-size: 14px;
            resize: vertical;
            transition: all 0.3s ease;
        }

        .tgaf-filter-panel .tgaf-words-input:focus {
            outline: none;
            border-color: rgba(255, 149, 0, 0.5);

            background: linear-gradient(135deg,
                rgba(255, 255, 255, 0.12) 0%,
                rgba(255, 255, 255, 0.08) 100%);
            backdrop-filter: blur(10px);
        }

        .tgaf-filter-panel .tgaf-words-input::placeholder {
            color: rgba(255, 255, 255, 0.4);
        }

        /* Stats Grid */
        .tgaf-filter-panel .tgaf-stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        .tgaf-filter-panel .tgaf-stat-card {
            padding: 16px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            text-align: center;
        }

        .tgaf-filter-panel .tgaf-stat-value {
            color: #ff9500;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 4px;
        }

        .tgaf-filter-panel .tgaf-stat-label {
            color: rgba(255, 255, 255, 0.6);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Action Buttons */
        .tgaf-filter-panel .tgaf-action-buttons {
            display: flex;
            gap: 12px;
            margin-top: 20px;
        }

        .tgaf-filter-panel .tgaf-btn {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            min-height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
        }

        .tgaf-filter-panel .tgaf-btn-primary {
            background: linear-gradient(135deg, #ff3b30 0%, #ff9500 100%);
            color: white;
        }

        .tgaf-filter-panel .tgaf-btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: white;
        }

        .tgaf-filter-panel .tgaf-btn-clear-storage {
            background: rgba(255, 149, 0, 0.2);
            color: #ff9500;
            border: 1px solid rgba(255, 149, 0, 0.3);
        }

        .tgaf-filter-panel .tgaf-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }

        /* Overlay */
        
        /* Scrollbar Styling */
        .tgaf-filter-panel .tgaf-panel-content::-webkit-scrollbar {
            width: 6px;
        }

        .tgaf-filter-panel .tgaf-panel-content::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
        }

        .tgaf-filter-panel .tgaf-panel-content::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }

        .tgaf-filter-panel .tgaf-panel-content::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }
    `;

  // Initialize styles
  GM_addStyle(STYLES);

  // Storage functions
  function loadSettings() {
    try {
      const saved = GM_getValue("telegramFilterSettings", "{}");
      const settings = JSON.parse(saved);
      isEnabled = settings.enabled !== false;
      currentMode = settings.mode || "blur";
      customWords = settings.customWords || [...CONFIG.defaultBlacklist];
      filterStats = settings.stats || { today: 0, total: 0 };

      // Load filtered messages from localStorage
      loadFilteredMessages();

      // Calculate filtered count from persistent data
      filteredCount = filteredMessages.size;
    } catch (error) {
      console.error("[Telegram Filter] Error loading settings:", error);
      isEnabled = true;
      currentMode = "blur";
      customWords = [...CONFIG.defaultBlacklist];
      filterStats = { today: 0, total: 0 };
    }
  }

  function saveSettings() {
    try {
      const settings = {
        enabled: isEnabled,
        mode: currentMode,
        customWords: customWords,
        stats: filterStats,
        lastUpdated: new Date().toISOString(),
      };
      GM_setValue("telegramFilterSettings", JSON.stringify(settings));
    } catch (error) {
      console.error("[Telegram Filter] Error saving settings:", error);
    }
  }

  // Message persistence functions
  function getMessageId(messageElement) {
    // Try multiple methods to get a unique message ID
    const dataMid = messageElement.getAttribute("data-mid");
    if (dataMid) return `mid:${dataMid}`;

    const messageId = messageElement.getAttribute("id");
    if (messageId) return `id:${messageId}`;

    // Fallback: use text content hash (less reliable but better than nothing)
    const text = messageElement.textContent?.trim();
    if (text) {
      // Create simple hash from text
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return `hash:${Math.abs(hash)}`;
    }

    return null;
  }

  function loadFilteredMessages() {
    try {
      const saved = localStorage.getItem("telegramFilteredMessages");
      if (saved) {
        const data = JSON.parse(saved);
        filteredMessages = new Set(data.filtered || []);
        revealedMessages = new Set(data.revealed || []);

        // Clean old entries (older than 7 days)
        const now = Date.now();
        const cutoff = now - 7 * 24 * 60 * 60 * 1000; // 7 days

        const oldFiltered = localStorage.getItem("telegramFilteredMessagesOld");
        if (oldFiltered) {
          const oldData = JSON.parse(oldFiltered);
          Object.keys(oldData).forEach((id) => {
            if (oldData[id] < cutoff) {
              delete oldData[id];
            }
          });
          localStorage.setItem(
            "telegramFilteredMessagesOld",
            JSON.stringify(oldData)
          );
        }
      }
    } catch (error) {
      console.error(
        "[Telegram Filter] Error loading filtered messages:",
        error
      );
      filteredMessages = new Set();
      revealedMessages = new Set();
    }
  }

  function saveFilteredMessages() {
    try {
      const data = {
        filtered: Array.from(filteredMessages),
        revealed: Array.from(revealedMessages),
        lastUpdated: Date.now(),
      };
      localStorage.setItem("telegramFilteredMessages", JSON.stringify(data));
    } catch (error) {
      console.error("[Telegram Filter] Error saving filtered messages:", error);
      // If localStorage is full, clean old entries
      try {
        localStorage.removeItem("telegramFilteredMessages");
        saveFilteredMessages(); // Try again with fresh storage
      } catch (e) {
        console.error("[Telegram Filter] localStorage cleanup failed:", e);
      }
    }
  }

  const addFilteredMessage = (messageId) => {
    if (messageId && !filteredMessages.has(messageId)) {
      filteredMessages.add(messageId);
      saveFilteredMessages();
    }
  };

  const removeFilteredMessage = (messageId) => {
    if (messageId) {
      filteredMessages.delete(messageId);
      revealedMessages.add(messageId);
      saveFilteredMessages();
    }
  };

  const isMessageFiltered = (messageId) =>
    messageId &&
    filteredMessages.has(messageId) &&
    !revealedMessages.has(messageId);

  // Highlight matched words in debug mode
  function highlightMatchedWords(element, matchedWords) {
    if (!element || !matchedWords || matchedWords.length === 0) return;

    // Create a Set of lowercase words for faster lookup
    const wordsSet = new Set(matchedWords.map(w => w.toLowerCase()));

    // Function to highlight text in a text node
    function highlightTextNode(textNode) {
      const text = textNode.textContent;
      const lowerText = text.toLowerCase();

      // Find all matches
      const matches = [];
      wordsSet.forEach(word => {
        let index = lowerText.indexOf(word);
        while (index !== -1) {
          matches.push({ index, length: word.length, word });
          index = lowerText.indexOf(word, index + 1);
        }
      });

      // Sort matches by index
      matches.sort((a, b) => a.index - b.index);

      // If no matches, return
      if (matches.length === 0) return;

      // Create a document fragment with highlighted text
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      matches.forEach(match => {
        // Add text before match
        if (match.index > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.substring(lastIndex, match.index))
          );
        }

        // Add highlighted match
        const highlight = document.createElement('span');
        highlight.className = 'tgaf-highlight';
        highlight.textContent = text.substring(match.index, match.index + match.length);
        fragment.appendChild(highlight);

        lastIndex = match.index + match.length;
      });

      // Add remaining text
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }

      // Replace text node with fragment
      textNode.parentNode.replaceChild(fragment, textNode);
    }

    // Walk through all text nodes
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip script, style, and already highlighted nodes
          const parent = node.parentElement;
          if (parent && (
            parent.tagName === 'SCRIPT' ||
            parent.tagName === 'STYLE' ||
            parent.classList.contains('tgaf-highlight') ||
            parent.classList.contains('tgaf-filter-badge') ||
            parent.classList.contains('tgaf-collapse-bar')
          )) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim()) {
        textNodes.push(node);
      }
    }

    // Highlight all text nodes
    textNodes.forEach(highlightTextNode);
  }

  // Filter functions
  const shouldFilterMessage = (messageElement) => {
    if (!isEnabled || !messageElement) return { shouldFilter: false, matchedWords: [] };

    const text = (messageElement.textContent || "").toLowerCase();
    const links = Array.from(messageElement.querySelectorAll("a")).map((a) =>
      a.href.toLowerCase()
    );

    const matchedWords = [];

    customWords.forEach((word) => {
      const lowerWord = word.toLowerCase();
      if (text.includes(lowerWord) || links.some((link) => link.includes(lowerWord))) {
        matchedWords.push(word);
      }
    });

    return {
      shouldFilter: matchedWords.length > 0,
      matchedWords
    };
  };

  function filterMessage(messageElement, matchedWords = []) {
    const messageId = getMessageId(messageElement);

    // Check if this message was previously filtered and revealed
    if (messageId && revealedMessages.has(messageId)) {
      return; // Don't re-filter if user revealed it before
    }

    if (!messageElement.classList.contains("tgaf-filtered-message")) {
      messageElement.classList.add(
        "tgaf-filtered-message",
        `mode-${currentMode}`
      );

      // Store message ID for persistence
      if (messageId) {
        addFilteredMessage(messageId);
        messageElement.setAttribute("data-filter-id", messageId);
      }

      // Add mode-specific elements
      if (currentMode === "debug") {
        // Debug mode - highlight matched words
        highlightMatchedWords(messageElement, matchedWords);

        // Add debug badge showing matched words
        const badge = document.createElement("div");
        badge.className = "tgaf-filter-badge";
        badge.textContent = `🔍 ${matchedWords.length} match${matchedWords.length > 1 ? 'es' : ''}`;
        badge.title = `Matched words: ${matchedWords.join(', ')}`;
        badge.style.cursor = "help";

        messageElement.style.position = "relative";
        messageElement.appendChild(badge);
      } else if (currentMode === "collapse") {
        const collapseBar = document.createElement("div");
        collapseBar.className = "tgaf-collapse-bar";
        collapseBar.innerHTML = `🚫 Advertisement (${messageElement.textContent.length} chars) - Click to expand`;

        collapseBar.addEventListener("click", (e) => {
          e.stopPropagation();
          messageElement.classList.add("revealed");
          if (messageId) removeFilteredMessage(messageId);
        });

        messageElement.insertBefore(collapseBar, messageElement.firstChild);
      } else {
        // Blur mode - add filter badge
        const badge = document.createElement("div");
        badge.className = "tgaf-filter-badge";
        badge.textContent = "🚫";
        badge.title = "Click to reveal message";

        badge.addEventListener("click", (e) => {
          e.stopPropagation();
          messageElement.classList.add("revealed");
          if (messageId) removeFilteredMessage(messageId);
          setTimeout(() => {
            badge.remove();
          }, 300);
        });

        messageElement.style.position = "relative";
        messageElement.appendChild(badge);
      }

      // Update stats
      filteredCount = filteredMessages.size;
      filterStats.today++;
      filterStats.total++;
      updateFloatingButton();
    }
  }

  function processMessages() {
    const messages = document.querySelectorAll(".bubble, .message");

    messages.forEach((message) => {
      const messageId = getMessageId(message);

      // Check if this message was previously filtered
      if (messageId && isMessageFiltered(messageId)) {
        // Apply filtering to previously filtered message
        const result = shouldFilterMessage(message);
        filterMessage(message, result.matchedWords);
      } else {
        // Check if it should be filtered now
        const result = shouldFilterMessage(message);
        if (result.shouldFilter) {
          filterMessage(message, result.matchedWords);
        }
      }
    });
  }

  function restoreAllMessages() {
    // Find all filtered messages and remove filtering
    const filteredMessages = document.querySelectorAll(".tgaf-filtered-message");

    filteredMessages.forEach(message => {
      // Remove all filter-related classes and attributes
      message.classList.remove("tgaf-filtered-message", "revealed");

      // Remove mode-specific classes
      Object.values(FILTER_MODES).forEach(mode => {
        message.classList.remove(`mode-${mode.id}`);
      });

      // Remove filter-specific elements
      message.querySelectorAll(".tgaf-filter-badge, .tgaf-collapse-bar, .tgaf-slide-tab")
        .forEach(el => el.remove());

      // Remove highlights from debug mode
      message.querySelectorAll(".tgaf-highlight").forEach(highlight => {
        const text = highlight.textContent;
        const textNode = document.createTextNode(text);
        highlight.parentNode.replaceChild(textNode, highlight);
      });

      // Remove data attributes
      message.removeAttribute("data-filter-id");

      // Remove inline styles that might have been applied
      message.removeAttribute("style");
    });
  }

  // UI Components
  function createFloatingButton() {
    if (floatingButton) return floatingButton;

    floatingButton = document.createElement("div");
    floatingButton.className = "tgaf-filter-float-btn";
    floatingButton.innerHTML = `
            <span class="tgaf-icon">🛡️</span>
            <span class="tgaf-badge" style="display: none;">0</span>
        `;

    floatingButton.addEventListener("click", () => {
      togglePanel();
    });

    document.body.appendChild(floatingButton);
    return floatingButton;
  }

  function updateFloatingButton() {
    if (!floatingButton) return;

    const badge = floatingButton.querySelector(".tgaf-badge");
    if (filteredCount > 0) {
      badge.textContent = filteredCount > 99 ? "99+" : filteredCount;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }

    floatingButton.classList.toggle("active", isEnabled);
  }

  function createFilterPanel() {
    if (filterPanel) return filterPanel;

    // Create mode selector HTML
    const modeOptionsHTML = Object.values(FILTER_MODES)
      .map(
        (mode) => `
            <div class="tgaf-mode-option ${
              currentMode === mode.id ? "active" : ""
            }" data-mode="${mode.id}">
                <span class="tgaf-mode-icon">${mode.icon}</span>
                <div class="tgaf-mode-name">${mode.name}</div>
                <div class="tgaf-mode-desc">${mode.description}</div>
            </div>
        `
      )
      .join("");

    // Panel
    filterPanel = document.createElement("div");
    filterPanel.className = "tgaf-filter-panel";
    filterPanel.innerHTML = `
            <div class="tgaf-panel-header">
                <h3 class="tgaf-panel-title">
                    <span>🛡️</span>
                    <span>Ad Filter Pro</span>
                </h3>
                <button class="tgaf-close-btn">✕</button>
            </div>
            <div class="tgaf-panel-content">
                <div class="tgaf-section">
                    <div class="tgaf-toggle-switch">
                        <span class="tgaf-toggle-label">Enable Filtering</span>
                        <div class="tgaf-switch ${isEnabled ? "active" : ""}">
                            <div class="tgaf-switch-handle"></div>
                        </div>
                    </div>
                </div>

                <div class="tgaf-section">
                    <div class="tgaf-section-title">Filter Mode</div>
                    <div class="tgaf-mode-selector">
                        ${modeOptionsHTML}
                    </div>
                </div>

                <div class="tgaf-section">
                    <div class="tgaf-section-title">Filter Statistics</div>
                    <div class="tgaf-stats-grid">
                        <div class="tgaf-stat-card">
                            <div class="tgaf-stat-value">${
                              filterStats.today
                            }</div>
                            <div class="tgaf-stat-label">Today</div>
                        </div>
                        <div class="tgaf-stat-card">
                            <div class="tgaf-stat-value">${
                              filterStats.total
                            }</div>
                            <div class="tgaf-stat-label">Total</div>
                        </div>
                    </div>
                </div>

                <div class="tgaf-section">
                    <div class="tgaf-section-title">Blocked Words (one per line)</div>
                    <textarea class="tgaf-words-input" placeholder="Enter words or phrases to filter...">${customWords.join(
                      "\n"
                    )}</textarea>
                </div>

                <div class="tgaf-action-buttons">
                    <button class="tgaf-btn tgaf-btn-secondary">Reset</button>
                    <button class="tgaf-btn tgaf-btn-clear-storage">Clear Storage</button>
                    <button class="tgaf-btn tgaf-btn-primary">Save</button>
                </div>
            </div>
        `;

    // Helper function for button feedback
    const showButtonFeedback = (btn, text, color = "#34c759") => {
      const originalText = btn.textContent;
      const originalBg = btn.style.background;
      const originalColor = btn.style.color;
      const originalBorder = btn.style.borderColor;

      btn.textContent = text;
      btn.style.background = `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`;
      if (btn.classList.contains("tgaf-btn-clear-storage")) {
        btn.style.color = "white";
        btn.style.borderColor = "transparent";
      }

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = originalBg;
        btn.style.color = originalColor;
        btn.style.borderColor = originalBorder;
      }, 2000);
    };

    // Event listeners
    const elements = {
      closeBtn: filterPanel.querySelector(".tgaf-close-btn"),
      toggleSwitch: filterPanel.querySelector(".tgaf-switch"),
      modeOptions: filterPanel.querySelectorAll(".tgaf-mode-option"),
      saveBtn: filterPanel.querySelector(".tgaf-btn-primary"),
      resetBtn: filterPanel.querySelector(".tgaf-btn-secondary"),
      clearStorageBtn: filterPanel.querySelector(".tgaf-btn-clear-storage"),
      wordsInput: filterPanel.querySelector(".tgaf-words-input"),
    };

    // Debug: Check if toggle switch was found
    console.log("[Ad Filter] Toggle switch element:", elements.toggleSwitch);
    if (!elements.toggleSwitch) {
      console.error("[Ad Filter] Toggle switch not found!");
    }

    elements.closeBtn.addEventListener("click", closePanel);

    // Add event listener to both the toggle switch and its container
    const toggleContainer = filterPanel.querySelector(".tgaf-toggle-switch");

    elements.toggleSwitch.addEventListener("click", (e) => {
      console.log("[Ad Filter] Toggle clicked, current state:", isEnabled);
      isEnabled = !isEnabled;
      elements.toggleSwitch.classList.toggle("active", isEnabled);
      updateFloatingButton();
      saveSettings();

      if (isEnabled) {
        // Enable filtering - apply filters to all messages
        processMessages();
        console.log("[Ad Filter] Filtering enabled - applying filters");
      } else {
        // Disable filtering - restore all messages
        restoreAllMessages();
        console.log("[Ad Filter] Filtering disabled - restoring all messages");
      }

      console.log("[Ad Filter] New state:", isEnabled);
    });

    // Also make the entire toggle container clickable
    if (toggleContainer) {
      toggleContainer.addEventListener("click", (e) => {
        if (e.target !== elements.toggleSwitch) {
          console.log("[Ad Filter] Toggle container clicked");
          elements.toggleSwitch.click();
        }
      });
    }

    elements.modeOptions.forEach((option) => {
      option.addEventListener("click", () => {
        elements.modeOptions.forEach((opt) => opt.classList.remove("active"));
        option.classList.add("active");
        currentMode = option.dataset.mode;
        saveSettings();
        reprocessMessages();
      });
    });

    elements.saveBtn.addEventListener("click", () => {
      const newWords = elements.wordsInput.value
        .split("\n")
        .map((word) => word.trim())
        .filter((word) => word.length > 0);

      if (newWords.length) {
        customWords = newWords;
        saveSettings();
        reprocessMessages();
        showButtonFeedback(elements.saveBtn, "✓ Saved");
      }
    });

    elements.resetBtn.addEventListener("click", () => {
      customWords = [...CONFIG.defaultBlacklist];
      elements.wordsInput.value = customWords.join("\n");
      filterStats = { today: 0, total: 0 };
      saveSettings();
      updateFloatingButton();
      reprocessMessages();
    });

    elements.clearStorageBtn.addEventListener("click", () => {
      if (
        confirm(
          "Clear all stored filtered messages? This will remove persistence for all filtered ads."
        )
      ) {
        filteredMessages.clear();
        revealedMessages.clear();
        saveFilteredMessages();
        showButtonFeedback(elements.clearStorageBtn, "✓ Cleared");
        updateFloatingButton();
        reprocessMessages();
      }
    });

    document.body.appendChild(filterPanel);
    return filterPanel;
  }

  function reprocessMessages() {
    // First remove all current filtering
    document.querySelectorAll(".tgaf-filtered-message").forEach((msg) => {
      msg.classList.remove("tgaf-filtered-message", "revealed");
      Object.values(FILTER_MODES).forEach((mode) =>
        msg.classList.remove(`mode-${mode.id}`)
      );
      msg
        .querySelectorAll(
          ".tgaf-filter-badge, .tgaf-collapse-bar, .tgaf-slide-tab"
        )
        .forEach((el) => el.remove());

      // Remove highlights from debug mode
      msg.querySelectorAll(".tgaf-highlight").forEach(highlight => {
        const text = highlight.textContent;
        const textNode = document.createTextNode(text);
        highlight.parentNode.replaceChild(textNode, highlight);
      });

      msg.removeAttribute("data-filter-id");
    });

    filteredCount = filteredMessages.size;
    updateFloatingButton();

    // Only re-apply filters if filtering is enabled
    if (isEnabled) {
      processMessages();
    }
  }

  const togglePanel = () => (isPanelOpen ? closePanel() : openPanel());

  function openPanel() {
    if (!filterPanel) createFilterPanel();

    setTimeout(() => {
      filterPanel.classList.add("open");
    }, 10);

    isPanelOpen = true;
  }

  function closePanel() {
    if (filterPanel) {
      filterPanel.classList.remove("open");
    }

    isPanelOpen = false;
  }

  // Keyboard shortcut
  function handleKeyboard(e) {
    if (e.altKey && e.key === "f") {
      e.preventDefault();
      togglePanel();
    }
  }

  // Mutation observer for new messages
  const setupObserver = () => {
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;

      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              (node.matches(".bubble, .message") ||
                node.querySelector(".bubble, .message"))
            ) {
              shouldProcess = true;
            }
          });
        }
      });

      if (shouldProcess && isEnabled) {
        setTimeout(processMessages, CONFIG.debounceDelay);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  };

  // Initialize
  const init = () => {
    loadSettings();
    createFloatingButton();
    updateFloatingButton();

    setTimeout(() => {
    if (isEnabled) {
      processMessages();
    }
  }, 2000);
    setupObserver();
    document.addEventListener("keydown", handleKeyboard);

    // Daily stats reset
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    setTimeout(() => {
      const resetDailyStats = () => {
        filterStats.today = 0;
        saveSettings();
      };
      resetDailyStats();
      setInterval(resetDailyStats, 24 * 60 * 60 * 1000);
    }, tomorrow.getTime() - now.getTime());

    console.log(
      `[Telegram Filter Pro by sadoi] Initialized with mode: ${currentMode}`
    );
  };

  // Start when DOM is ready
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
