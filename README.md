# Cantrips.ai – Auto Rename Downloaded Files Based on Content

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/fnaemmlnchphilapbdjejjlhoomcpblk.svg)](https://chromewebstore.google.com/detail/cantripsai-auto-rename-do/fnaemmlnchphilapbdjejjlhoomcpblk)

**Cantrips.ai** automatically renames your downloaded files into clean, meaningful filenames — so your Downloads folder stays organized without any manual effort.

---

## 🚀 Features

- Automatically replaces messy filenames like  
  `1706.03762.pdf` → `20170612 - Attention Is All You Need - Vaswani - LLM`
- Supports multiple file types: research papers, financial filings, books, etc.
- Custom naming rules coming soon — define templates like  
  `Interviewee_Company_Position_Topic_Date`
- Works out-of-the-box: install, sign in, and toggle “Auto Rename” on.

---

## 🧩 Why Use It

- Keep your Downloads folder tidy and searchable.  
- No more guessing what `document(3).pdf` means.  
- Save time during research, study, or work sessions.

---

## ⚙️ Quick Start

1. [Install from the Chrome Web Store](https://chromewebstore.google.com/detail/cantripsai-auto-rename-do/fnaemmlnchphilapbdjejjlhoomcpblk)  
2. Click the extension icon → sign in  
3. Toggle **Auto Rename** to enable automatic renaming  
4. Download any file — watch it instantly renamed based on its content

---

## 📦 Supported File Types

✅ PDFs (papers, reports, filings)  
✅ Text-based documents (.txt, .docx)  
⚙️ More formats coming soon (images, spreadsheets, etc.)

---

## 🛡️ Privacy

Cantrips.ai **does not collect or share** your personal data.  
All renaming happens locally or via secured API calls to analyze file content.

---

## 🤝 Contributing

Pull requests are welcome!  
You can:
- Report bugs or feature requests via Issues  
- Improve naming templates  
- Add localization or documentation

---

## 📄 License

This project is licensed under the **MIT License** — see below:

## 🧑‍💻 Try Out Locally

### Setup Configuration
1. Copy `entrypoints/config.example.ts` to `entrypoints/config.ts`
2. Fill in your actual API endpoints and authentication URLs in `config.ts`
3. Note: `config.ts` is gitignored to prevent leaking sensitive credentials

### Build and Run
1. Run `npm install` to download all dependencies
2. Run `npx wxt zip` to create a runnable binary

### Backend
1. lambda_function.py is the script used by backend
