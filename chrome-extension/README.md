# AI Job Application Assistant - Chrome Extension

An intelligent Chrome extension that automatically fills job application forms with your saved profile data, helping you apply to jobs faster and more efficiently.

## 🎯 Features

- **Smart Form Detection**: Automatically detects job application forms on major ATS platforms
- **Intelligent Form Filling**: Uses semantic matching to accurately fill form fields
- **Profile Management**: Store and manage your professional profile data locally
- **Privacy First**: All data stays on your device - nothing is sent to external servers
- **Major ATS Support**: Works with Lever, Greenhouse, Workday, BambooHR, and many more
- **Import from Backend**: Option to import your profile from the main application backend

## 🔧 Supported Job Sites

- Lever (jobs.lever.co)
- Greenhouse (boards.greenhouse.io)
- Workday (*.workday.com, *.myworkdayjobs.com)
- BambooHR (*.bamboohr.com)
- SmartRecruiters (*.smartrecruiters.com)
- iCIMS (*.icims.com)
- Taleo (*.taleo.net)
- Jobvite (*.jobvite.com)
- Breezy HR (*.breezy.hr)
- Workable (apply.workable.com)
- ADP (recruiting.adp.com)
- And more being added regularly!

## 📦 Installation

### Method 1: Load as Unpacked Extension (Development)

1. **Clone or download** this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer mode** by toggling the switch in the top-right corner
4. **Click "Load unpacked"** and select the `chrome-extension` folder
5. The extension should now appear in your extensions list

### Method 2: From Chrome Web Store (Coming Soon)

The extension will be available on the Chrome Web Store once it passes review.

## 🚀 Quick Start

### 1. Setup Your Profile

1. **Click the extension icon** in your Chrome toolbar
2. **Click "Setup Profile"** to enter your information
3. **Fill in your details**:
   - Personal information (name, email, phone, address)
   - Current work experience
   - Education background
   - Professional links (LinkedIn, GitHub, portfolio)
   - Job preferences

### 2. Import from Backend (Optional)

If you're already using the main AI Job Application Assistant backend:

1. **Click "Import from Backend"** in the popup
2. **Enter your backend URL** (e.g., `http://localhost:8000`)
3. **Enter your User ID** from the main application
4. **Click "Import Profile"** to sync your data

### 3. Start Applying to Jobs

1. **Visit any supported job site** (like jobs.lever.co)
2. **Navigate to a job application page**
3. **Look for the floating AI assistant** that appears automatically
4. **Click "Fill Application Form"** to auto-populate the form
5. **Review the filled information** and make any necessary adjustments
6. **Submit your application** as normal

## 🖥️ How It Works

### Smart Field Detection

The extension uses advanced semantic matching to identify form fields:

- **Label text analysis**: Matches field labels to your profile data
- **Placeholder text**: Uses placeholder hints to understand field purpose
- **Field attributes**: Analyzes HTML attributes like `name` and `id`
- **Context awareness**: Considers surrounding text and form structure

### Intelligent Form Filling

- **Text fields**: Fills name, email, phone, address, etc.
- **Select dropdowns**: Matches options for experience, education level, etc.
- **Checkboxes**: Handles yes/no questions and preferences
- **File uploads**: Shows notification for resume uploads (manual step)

### Privacy & Security

- **Local storage only**: All data stored in Chrome's local storage
- **No external tracking**: No analytics or tracking scripts
- **Secure communication**: Backend imports use secure HTTPS
- **User control**: You control what data is stored and used

## ⚙️ Configuration

### Extension Settings

Access settings through the extension popup:

- **Profile management**: Add, edit, or clear your profile
- **Import/export**: Sync with backend or export data
- **Activity tracking**: View statistics on forms filled

### Customization

The extension automatically adapts to different form layouts and field types. No manual configuration needed!

## 🐛 Troubleshooting

### Extension Not Detecting Forms

1. **Refresh the page** and try again
2. **Check if the site is supported** (see supported sites list)
3. **Ensure your profile is setup** with required information
4. **Look for the floating assistant** - it should appear automatically

### Forms Not Filling Correctly

1. **Review your profile data** for accuracy
2. **Check for empty required fields** in your profile
3. **Try filling forms manually first** to ensure they work
4. **Report issues** via the feedback link in the popup

### Import from Backend Failing

1. **Verify backend URL** is correct and accessible
2. **Check your User ID** in the main application
3. **Ensure backend is running** and accepting requests
4. **Check network connectivity** and firewall settings

## 🔄 Development

### Project Structure

```
chrome-extension/
├── manifest.json          # Extension manifest (Manifest V3)
├── content.js             # Content script injected into pages
├── content.css            # Styles for floating UI
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality
├── popup.css              # Popup styles
├── background.js          # Service worker for background tasks
├── welcome.html           # First-time user welcome page
├── icons/                 # Extension icons
└── README.md              # This file
```

### Key Components

- **Content Script**: Detects forms and handles filling
- **Popup Interface**: Profile management and settings
- **Background Service**: Handles extension lifecycle and API calls
- **Storage**: Uses Chrome's local storage for profile data

### Building & Testing

1. **Load the extension** in developer mode
2. **Test on various job sites** to ensure compatibility
3. **Check browser console** for any errors or warnings
4. **Verify form filling accuracy** on different form types

## 🤝 Contributing

We welcome contributions! Please:

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

### Development Guidelines

- Follow Chrome Extension best practices
- Use semantic versioning for releases
- Test on multiple job sites before submitting
- Keep privacy and security as top priorities

## 📋 Todo / Roadmap

- [ ] Add support for more ATS platforms
- [ ] Implement cover letter auto-generation
- [ ] Add form validation and error handling
- [ ] Create Chrome Web Store listing
- [ ] Add support for multiple profiles
- [ ] Implement backup/restore functionality
- [ ] Add keyboard shortcuts for quick access

## 🆘 Support

- **Documentation**: Check this README and code comments
- **Issues**: Report bugs via GitHub issues
- **Feedback**: Use the feedback link in the extension popup
- **Email**: Contact support team for urgent issues

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## ⚠️ Disclaimer

This extension is designed to assist with form filling for legitimate job applications. Users are responsible for:

- Ensuring accuracy of submitted information
- Compliance with job site terms of service
- Reviewing all auto-filled data before submission
- Maintaining professional and ethical usage

## 🔗 Related Projects

- **Main Backend**: The full AI Job Application Assistant platform
- **Web Interface**: React-based dashboard for job management
- **Resume Parser**: AI-powered resume parsing service
- **Cover Letter Generator**: Automated cover letter creation

---

**Made with ❤️ by the AI Job Application Assistant Team**