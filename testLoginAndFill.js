const { chromium } = require('playwright');
const { fillHiesForm } = require('./src/fillHiesForm');

const sampleData = {
    forename: "Test",
    surname: "User",
    installationAddress: "4 Fryston Avenue, Coulsdon, Surrey, CR5 2PT",
    postcode: "CR5 2PT",
    email: "Mskavitapatel@hotmail.co.uk",
    phone: "447958183699",
    sameAsInstallationAddress: true,
    contractReference: "EPS5475",
    installationValue: "9795.00",
    contractSignedDate: "27/08/2026",
    depositPaymentMethod: "By Card",
    depositValue: "2448.75",
    homeImprovementInstalled: "Solar PV with Battery Storage",
    guaranteeLength: "2 years",
    manufacturerName: "LONGi",
    quantity: "10"
};

async function runTest() {
    console.log("Launching browser...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log("Navigating to login page...");
        await page.goto('https://schemes.org.uk/sign-in', { waitUntil: 'networkidle' });

        console.log("Attempting to login...");
        // Usually login forms have fields like [type="email"] or [name="email"], and [type="password"]
        // We will try standard selectors
        await page.fill('input[type="email"], input[name*="user" i], input[name*="email" i]', 'ishita@evergreenpoweruk.com');
        await page.fill('input[type="password"]', 'Epukfoam@2025');
        
        // Wait for the sign in button and click it
        // Often it's button[type="submit"] or containing text "Sign In" / "Login"
        await page.click('button[type="submit"], input[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")');

        console.log("Waiting for login to complete...");
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
        console.log("Logged in successfully! Navigating to form...");
        
        // Now run the form filling logic
        await fillHiesForm(page, sampleData);

        console.log("Form filling logic executed completely!");

    } catch (err) {
        console.error("TEST FAILED:", err);
    } finally {
        await browser.close();
    }
}

runTest();
