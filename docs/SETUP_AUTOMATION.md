# Visual Automation Setup Guide

The job application automation feature requires ChromeDriver to control a browser for form filling. This guide explains setup options.

## Option 1: Automatic ChromeDriver (Recommended)

Install `webdriver-manager` to automatically download and manage ChromeDriver:

```bash
cd backend
pip install webdriver-manager
```

This will automatically download the correct ChromeDriver version when needed.

## Option 2: Manual ChromeDriver Installation

### Linux/WSL:
```bash
# Install Chrome browser
sudo apt update
sudo apt install -y google-chrome-stable

# Install ChromeDriver
sudo apt install -y chromium-chromedriver
```

### macOS:
```bash
# Install Chrome
brew install --cask google-chrome

# Install ChromeDriver
brew install chromedriver
```

### Windows:
1. Download Chrome from https://www.google.com/chrome/
2. Download ChromeDriver from https://chromedriver.chromium.org/
3. Add ChromeDriver to your PATH

## Option 3: Manual Fallback Mode

If ChromeDriver is not available, the automation will automatically fall back to manual mode:
- Opens job application pages in new browser tabs
- User fills forms manually
- Returns to automation modal to mark completion

## Verifying Setup

Test if ChromeDriver is available:
```bash
chromedriver --version
```

If working, you should see output like: `ChromeDriver 120.0.6099.109`

## Dependencies

The automation requires:
- **selenium** (already in requirements.txt)
- **webdriver-manager** (optional, for auto-download)
- **Chrome browser** (user must install)
- **ChromeDriver** (auto-downloaded or manually installed)

## Production Deployment

For production servers:
1. Install Chrome browser
2. Add `webdriver-manager` to requirements.txt
3. The system will automatically handle ChromeDriver
4. Consider running in headless mode for server environments

## Troubleshooting

**"ChromeDriver not available" error:**
- Install Chrome browser first
- Add webdriver-manager: `pip install webdriver-manager`
- Or manually install ChromeDriver

**Browser doesn't open:**
- Check if running in GUI environment (not pure terminal)
- Verify Chrome is installed
- Check ChromeDriver permissions

**Forms not filling correctly:**
- Different job sites use different form structures
- Manual fallback mode is available for complex forms
- Visual automation continuously improves form detection