# 🌐 Telegram Translator Pro

Advanced real-time translation userscript for Telegram Web with intelligent caching, virtual scrolling support, and data-mid persistence.

## ✨ Features

- **Real-time Translation**: Automatically translates messages as they appear
- **Smart Caching**: Dual-layer cache system (API + Persistent) for optimal performance
- **Language Auto-detection**: Automatically detects source language
- **Virtual Scrolling Support**: Works seamlessly with Telegram's virtual scrolling
- **Message ID Tracking**: Uses Telegram's data-mid for reliable cache persistence
- **Customizable Settings**: Full control over translation behavior
- **Elegant UI**: Beautiful gradient-based control panel
- **Keyboard Shortcuts**: Quick access with Alt+T and Alt+R
- **Skip Same Language**: Option to skip translation if already in target language
- **Debug Mode**: Built-in debugging for troubleshooting

## 🚀 Installation

1. Install a userscript manager:
   - [Violentmonkey](https://violentmonkey.github.io/) (Recommended)
   - [Tampermonkey](https://www.tampermonkey.net/)
   - [Greasemonkey](https://www.greasespot.net/)

2. Click on the userscript file: `telegram-translator-pro.user.js`

3. Your userscript manager should prompt you to install it

4. Visit [Telegram Web](https://web.telegram.org/k/) and the translator will activate automatically

## 📖 Usage

### Opening the Control Panel

- Click the floating **💬** button in the bottom-right corner
- Or press **Alt+T** on your keyboard

### Settings

| Setting | Description |
|---------|-------------|
| **Enable Translation** | Toggle translation on/off |
| **Target Language** | Language to translate messages into |
| **Source Language** | Source language (or auto-detect) |
| **Skip Same Language** | Don't translate if already in target language |
| **Debug Mode** | Enable console logging for troubleshooting |
| **Minimum Text Length** | Minimum characters required to trigger translation |

### Keyboard Shortcuts

- **Alt+T**: Toggle translator panel
- **Alt+R**: Refresh all translations
- **Esc**: Close panel

### Buttons

- **Clear Cache**: Remove all cached translations
- **Refresh All**: Re-translate all visible messages

## 🌍 Supported Languages

Arabic, Chinese (Simplified/Traditional), Czech, Dutch, English, Finnish, French, German, Greek, Hebrew, Hindi, Indonesian, Italian, Japanese, Korean, Persian, Polish, Portuguese, Romanian, Russian, Spanish, Swedish, Thai, Turkish, Ukrainian, Vietnamese, and more.

## 🔧 Configuration

The script stores settings in `localStorage`:
- `tg_enabled`: Translation enabled state
- `tg_target_lang`: Target language code
- `tg_source_lang`: Source language code
- `tg_skip_same_lang`: Skip same language option
- `tg_debug_mode`: Debug mode state
- `tg_min_length`: Minimum text length

## 🐛 Troubleshooting

### Translations not appearing?

1. Enable **Debug Mode** in settings
2. Open browser console (F12)
3. Check for error messages
4. Click **Refresh All** button

### Cache issues?

1. Click **Clear Cache** button
2. Click **Refresh All** to re-translate

### Script not loading?

1. Make sure your userscript manager is enabled
2. Check that you're on `https://web.telegram.org/k/*`
3. Refresh the page
4. Check browser console for errors

## 🏗️ Technical Details

### Architecture

- **Message Detection**: Uses multiple selectors to find Telegram message containers
- **ID System**: Leverages Telegram's `data-mid` attributes for persistent caching
- **Translation Engine**: Google Translate API via `GM_xmlhttpRequest`
- **Request Queue**: Manages concurrent API requests (max 3 simultaneous)
- **Mutation Observer**: Detects new messages in real-time
- **Debouncing**: Prevents excessive processing during rapid scrolling

### Performance Features

- LRU cache with configurable size limit (1000 entries)
- Request debouncing (200ms)
- Concurrent request limiting
- Retry mechanism with exponential backoff
- Text validation to skip dates, URLs, and numbers

### Configuration Constants

```javascript
CONFIG = {
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
}
```

## 📊 Statistics

The panel displays real-time statistics:
- **Translated**: Number of new translations
- **API Cache**: Cached API responses
- **Persist Cache**: Messages cached with data-mid
- **Errors**: Failed translation attempts
- **Skipped**: Messages skipped (too short, same language, etc.)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📜 License

MIT License - See [LICENSE](LICENSE) file for details

## 👨‍💻 Author

**sadoi**

## 🙏 Acknowledgments

- Google Translate API for translation services
- Telegram Web for the awesome platform
- Violentmonkey/Tampermonkey for userscript support

## 📝 Changelog

### Version 1.4
- Fixed Telegram Web K structure detection
- Improved data-mid caching system
- Enhanced virtual scrolling support
- Better message ID tracking
- Optimized performance

### Version 1.3
- Added persistent cache with data-mid
- Improved statistics display
- Enhanced UI design

### Version 1.2
- Added skip same language option
- Improved debug mode
- Enhanced error handling

### Version 1.1
- Initial public release
- Basic translation functionality
- Cache system implementation

---

**Note**: This is a community-developed tool and is not officially affiliated with Telegram.
