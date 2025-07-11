# Chrome Browser Setup for Automation

The job application automation requires Chrome browser to be installed. Here are the setup instructions for different environments:

## Quick Setup (Ubuntu/WSL)

```bash
# Install Chrome browser
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update
sudo apt install -y google-chrome-stable

# Verify installation
google-chrome --version
```

## Alternative: Install Chromium

```bash
# Install Chromium (lighter alternative)
sudo apt update
sudo apt install -y chromium-browser

# Verify installation
chromium-browser --version
```

## For WSL Environments

If you're using WSL and get display errors, you may need:

```bash
# Install X11 forwarding support
sudo apt install -y xvfb

# Run automation with virtual display
export DISPLAY=:99
Xvfb :99 -screen 0 1024x768x24 &
```

## Current Status

✅ **ChromeDriver**: Auto-downloaded successfully via webdriver-manager  
❌ **Chrome Browser**: Not installed (this is the issue)  
✅ **Python Dependencies**: selenium, webdriver-manager available  

## Error Details

The automation fails with "Status code 127" which means ChromeDriver can't find Chrome browser executable.

## Solution

**Install Chrome browser using one of the methods above**, then the automation should work properly.

## Test Setup

After installing Chrome, test with:

```bash
python3 -c "
from visual_automation import visual_automator
visual_automator.setup_browser()
print('SUCCESS!')
visual_automator.cleanup()
"
```