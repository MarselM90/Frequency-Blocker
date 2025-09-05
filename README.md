# ⚡ Frequency Blocker

**Frequency Blocker** is a client-side plugin for the FM-DX Webserver that allows blocking access to specific radio frequencies via a customizable list. It enhances frequency navigation by preventing tuning into unwanted or restricted channels while maintaining a smooth user experience.

## 🚀 Features

* Define a list of blocked frequencies (in MHz)
* Displays a warning message when a blocked frequency is accessed
* Remembers the last allowed frequency and reverts to it when a block occurs
* Message box appears in the center of the screen, \~20% from the top
* Supports tuning via scroll, arrow keys, and frequency buttons
* Admin users can access any frequency without restriction

## ⚙️ Configuration

Blocked frequencies are hardcoded in the plugin for simplicity. You can modify them by editing this line in the JavaScript:

const blockedFreqs = [87.8, 96.2, 98, 99.2, 104.1]; // Add/remove frequencies here

Frequencies must be expressed in MHz, with a precision tolerance of ±0.001 MHz.

## 🛠 How It Works

When the user tunes up/down (via scroll, arrow keys, or UI buttons), the plugin checks if the next frequency is blocked.

If blocked:

1. A message is shown:
   `⚠ Frequency X.XXX MHz is blocked and cannot be accessed.`
2. The plugin reverts to the last allowed frequency.
3. On the next attempt in the same direction, the plugin automatically skips the blocked frequency and tunes to the next available one.

This ensures blocked channels cannot be accessed accidentally while still allowing smooth scanning.

## ✅ Compatibility

* Fully compatible with FM-DX Webserver front-end interface
* Works with mouse scroll, keyboard arrow keys, and frequency tuning buttons
* Non-invasive — does not modify server-side code

## 📥 Installation

1. Save the plugin file as `frequency-blocker.js`
2. Place it in your FM-DX Webserver's plugin directory
3. Make sure it's loaded by the web interface (or include via a `<script>` tag if needed)

## 📝 License

This plugin was designed with assistance from ChatGPT for code generation and documentation.

Provided as-is, free for personal and non-commercial use. Attribution appreciated.

