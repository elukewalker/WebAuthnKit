const APP_URL = process.env.APP_URL || 'https://dev.d2f6qcxorpyfsr.amplifyapp.com';

// Generate a unique username for each test run to avoid Cognito state conflicts.
// Cognito usernames are case-insensitive; the app enforces max 20 chars.
function uniqueUsername(base) {
    const suffix = Date.now().toString().slice(-8);
    return `${base}${suffix}`.slice(0, 20);
}

async function navigateToLogin(page) {
    await page.goto(`${APP_URL}/login`);
    await page.waitForSelector('input[name="username"]');
}

// Registers a brand-new user via the UI and lands on the dashboard.
// Requires a virtual authenticator to be attached to the browser context.
async function registerUser(page, username) {
    await navigateToLogin(page);
    await page.fill('input[name="username"]', username);
    await page.click('button:has-text("Next")');
    await page.waitForURL('**/register', { timeout: 20000 });
    await page.click('button:has-text("Register Security Key")');
    await page.waitForURL(`${APP_URL}/`, { timeout: 60000 });
}

// Signs in an already-registered user and lands on the dashboard.
async function signInUser(page, username) {
    await navigateToLogin(page);
    await page.fill('input[name="username"]', username);
    await page.click('button:has-text("Next")');
    await page.waitForURL('**/loginWithSecurityKey', { timeout: 20000 });
    await page.click('button:has-text("Login with Security Key")');
    await page.waitForURL(`${APP_URL}/`, { timeout: 60000 });
}

// Navigates the already-registered user to the /loginWithSecurityKey page.
async function navigateToSecurityKeyPage(page, username) {
    await navigateToLogin(page);
    await page.fill('input[name="username"]', username);
    await page.click('button:has-text("Next")');
    await page.waitForURL('**/loginWithSecurityKey', { timeout: 20000 });
}

// Captures recovery codes from the dashboard.
// The modal auto-opens on the first dashboard visit after registration (recoveryCodesViewed === false).
// If it doesn't auto-open, falls back to clicking "Show Recovery Codes".
// Returns an array of 5 code strings.
async function captureRecoveryCodes(page) {
    const AUTO_OPEN_TIMEOUT = 8000;

    const modalVisible = await page.waitForSelector(
        '.modal-title:has-text("Recovery Codes")',
        { timeout: AUTO_OPEN_TIMEOUT }
    ).then(() => true).catch(() => false);

    if (!modalVisible) {
        // Modal did not auto-open; trigger it manually
        await page.click('button:has-text("Show Recovery Codes")');
        await page.waitForSelector('.modal-title:has-text("Recovery Codes")', { timeout: 10000 });
    }

    // Wait until all 5 codes are rendered
    const codeLocator = page.locator('.modal-body ul li');
    await codeLocator.nth(4).waitFor({ timeout: 20000 });

    const count = await codeLocator.count();
    const codes = [];
    for (let i = 0; i < count; i++) {
        const text = (await codeLocator.nth(i).textContent()).trim();
        if (text.length > 0) {
            codes.push(text);
        }
    }

    await page.click('.modal-footer button:has-text("Close")');
    return codes;
}

module.exports = {
    APP_URL,
    uniqueUsername,
    navigateToLogin,
    registerUser,
    signInUser,
    navigateToSecurityKeyPage,
    captureRecoveryCodes,
};
