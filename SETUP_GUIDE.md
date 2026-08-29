# 🚀 2nd PC Setup Guide (A to Z)

Ye guide follow karke aap apne naye ya 2nd PC mein pura project starting se set up kar sakte ho. Isme sab kuch step-by-step cover kiya gaya hai.

---

## Step 1: Git aur Node.js Install Karna
Kyunki aapke 2nd PC mein Git aur Node.js nahi hai, hum isko sidha terminal (PowerShell) se install karenge (Windows 10/11 ke liye).

1. Apne 2nd PC mein **Start Menu** open karein aur type karein `PowerShell`.
2. **Windows PowerShell** par right-click karein aur **"Run as Administrator"** (Run as admin) select karein.
3. Ab ek-ek karke niche di gayi 2 commands copy karke PowerShell mein paste karein aur Enter dabayein:

**Git install karne ke liye:**
```powershell
winget install --id Git.Git -e --source winget
```
*(Jab ye install ho jaye, tab next command dalein)*

**Node.js install karne ke liye:**
```powershell
winget install --id OpenJS.NodeJS -e --source winget
```

*(Agar winget command kaam nahi karti, toh aap directly Google se [Node.js](https://nodejs.org/) aur [Git](https://git-scm.com/download/win) download karke next, next karke install kar sakte ho).*

4. **[IMPORTANT]** Install hone ke baad apna PowerShell **CLOSE** kar dein.

---

## Step 2: Project ko GitHub se Download (Clone) Karna

Ab aapke PC mein Git aur Node.js aa chuka hai. Ab hum apna code GitHub se download karenge.

1. Wapas normal tarike se **PowerShell** ya **Terminal** open karein (Administrator ki zarurat nahi hai).
2. Agar aap project ko apne **Desktop** par rakhna chahte hain, toh ye command dalein:
```powershell
cd Desktop
```

3. Ab project ko download (clone) karne ke liye ye command dalein:
```powershell
git clone https://github.com/jatinrao-in/customer-form-automation.git
```
*(Ye command aapke Desktop par `customer-form-automation` naam ka folder bana degi aur saara code usme daal degi).*

---

## Step 3: Project ko Set up Karna (First time only)

Code download ho gaya hai, ab hume iske ander ke "packages" (jaise Playwright) install karne hain.

1. Download huye folder ke andar jaane ke liye ye command dalein:
```powershell
cd customer-form-automation
```

2. Packages install karne ke liye ye command dalein:
```powershell
npm install
```
*(Isme 1-2 minute lag sakte hain, isko poora complete hone dein).*

3. Browser automation ke liye Playwright ka browser install karna hota hai, uske liye ye command dalein:
```powershell
npx playwright install chromium
```

---

## Step 4: Project ko Run Karna 🎉

Sab kuch set up ho chuka hai! Ab aap project ko 2 tarike se chala sakte hain:

**Option 1: Terminal se (Asan)**
Terminal mein bas ye command type karein:
```powershell
npm start
```

**Option 2: Bina Terminal ke (Sabse Asan)**
1. Apne Desktop par jo naya folder aaya hai (`customer-form-automation`) usko open karein.
2. Uske andar aapko **`Start_Automation.bat`** naam ki file dikhegi.
3. Bas us par **Double-Click** karein!
4. Ye apne aap background mein server chalu kar dega aur aapke Chrome/Edge mein `http://localhost:3000` form khol dega.

---

**Note:** Agli baar se jab bhi aapko isko use karna ho, aapko Step 1, 2, aur 3 dobara nahi karne hain. Sidha folder mein jaakar **`Start_Automation.bat`** par double click karna hai aur apna form automation shuru kar dena hai! Happy Automating! 🤖
