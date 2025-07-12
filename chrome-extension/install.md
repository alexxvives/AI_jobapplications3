# Chrome Extension Installation Guide

## Quick Installation Steps

### 1. Enable Developer Mode
1. Open Chrome and go to `chrome://extensions/`
2. Toggle **"Developer mode"** in the top-right corner

### 2. Load the Extension
1. Click **"Load unpacked"**
2. Navigate to and select the `chrome-extension` folder
3. The extension should appear in your extensions list

### 3. Pin the Extension (Recommended)
1. Click the **puzzle piece icon** in Chrome's toolbar
2. Find **"AI Job Application Assistant"**
3. Click the **pin icon** to keep it visible

### 4. Setup Your Profile
1. Click the extension icon in your toolbar
2. Click **"Setup Profile"**
3. Fill in your information and click **"Save Profile"**

## Testing the Extension

### Quick Test on Lever
1. Go to any Lever job posting (e.g., `https://jobs.lever.co/company/position/apply`)
2. You should see a floating AI assistant appear
3. Click **"Fill Application Form"** to test the form filling

### Quick Test on Greenhouse
1. Go to any Greenhouse job posting (e.g., `https://boards.greenhouse.io/company/jobs/123456`)
2. Look for the floating assistant
3. Test the form filling functionality

## Troubleshooting

### Extension Not Loading
- Make sure you selected the correct folder (`chrome-extension`)
- Check for any error messages in the Extensions page
- Ensure all files are present in the folder

### Assistant Not Appearing
- Refresh the job application page
- Check if the site is supported (see README.md for full list)
- Look in the browser console for any error messages

### Forms Not Filling
- Ensure your profile is completely set up
- Try manually filling one field to ensure the form works
- Check that required fields in your profile are not empty

## Creating Icons (Optional)

The extension includes an SVG icon that needs to be converted to PNG:

```bash
# Using ImageMagick (if available)
convert icons/icon.svg -resize 16x16 icons/icon16.png
convert icons/icon.svg -resize 48x48 icons/icon48.png
convert icons/icon.svg -resize 128x128 icons/icon128.png
```

Or use an online SVG to PNG converter.

## Next Steps

1. **Test on various job sites** to ensure compatibility
2. **Set up your complete profile** with all relevant information
3. **Start applying to jobs** and track your time savings!

## Need Help?

- Check the main README.md for detailed documentation
- Report issues via GitHub
- Use the feedback link in the extension popup