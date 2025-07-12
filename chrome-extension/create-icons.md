# Creating Icons for the Extension

## Option 1: Use Online Converter
1. Go to https://convertio.co/svg-png/
2. Upload the `icons/icon.svg` file
3. Download and rename the files:
   - Resize to 16x16 → save as `icon16.png`
   - Resize to 48x48 → save as `icon48.png` 
   - Resize to 128x128 → save as `icon128.png`
4. Place them in the `icons/` folder

## Option 2: Simple Emoji Icons
Create simple colored squares with emoji:

1. Create 16x16, 48x48, 128x128 PNG files
2. Use a solid color background with the 🤖 emoji
3. Save as icon16.png, icon48.png, icon128.png

## Option 3: Use Built-in Chrome Icons
For testing, you can use Chrome's default extension icon by not specifying any icons in the manifest (current setup).

## Re-enable Icons in Manifest
Once you have the PNG files, add this back to manifest.json:

```json
"action": {
  "default_popup": "popup.html",
  "default_title": "AI Job Application Assistant",
  "default_icon": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
},

"icons": {
  "16": "icons/icon16.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
},
```