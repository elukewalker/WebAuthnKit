const APP_URL = process.env.APP_URL || 'https://dev.d2f6qcxorpyfsr.amplifyapp.com';

// Generate a unique username for each test run to avoid Cognito state conflicts.
// Cognito usernames are case-insensitive; the app enforces max 20 chars.
function uniqueUsername(base) {
    const suffix = Date.now().toString().slice(-8);
    return `${base}${suffix}`.slice(0, 20);
}

async function navigateToLogin(page) {
    // Clear the custom user key so the Redux auth reducer starts with empty initialState.
    // Without this, a logged-in session causes LoginPage to redirect to /loginWithSecurityKey
    // where the virtual authenticator auto-signs-in again, creating an infinite loop.
    await page.evaluate(() => localStorage.removeItem('user')).catch(() => {});

    await page.goto(`${APP_URL}/login`);
    // LoginPage dispatches userActions.logout() (Amplify signOut) on mount, but the Redux
    // authUser may still be set if localStorage.user was present, causing a redirect to
    // /loginWithSecurityKey. Wait for the redirect to settle, then re-navigate if needed.
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    if (!page.url().endsWith('/login')) {
        // Redirected away — clear session state and navigate back.
        await page.evaluate(() => localStorage.removeItem('user')).catch(() => {});
        await page.goto(`${APP_URL}/login`);
        await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    }
    await page.waitForSelector('input[name="username"]', { timeout: 30000 });
}

// Registers a brand-new user via the UI and lands on the dashboard.
// Requires a virtual authenticator to be attached to the browser context.
async function registerUser(page, username) {
    await navigateToLogin(page);
    await page.fill('input[name="username"]', username);
    await page.click('button:has-text("Next")');
    await page.waitForURL('**/register', { timeout: 20000 });
    // RegisterPage's useEffect calls signOut() async. Wait for it to finish
    // before clicking Register Security Key to avoid a race where signOut()
    // invalidates the session established by confirmSignIn().
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
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

    // If no codes exist yet, click Generate to create them
    const codeLocator = page.locator('.modal-body ul li');
    const codesExist = await codeLocator.count() > 0;
    if (!codesExist) {
        await page.click('button:has-text("Generate")');
    }

    // Wait until all 5 codes are rendered (Lambda cold-start can take 10-15s)
    await codeLocator.nth(4).waitFor({ timeout: 45000 });

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

// Signs out via the Logout link and waits for the login URL.
async function signOutUser(page) {
    await page.click('a:has-text("Logout")');
    await page.waitForURL('**/login', { timeout: 10000 }).catch(() => {});
}

// Opens recovery modal, fills code, submits, waits for dashboard.
// Auto-presence must be disabled before calling.
async function signInWithRecoveryCode(page, code) {
    await page.click('text=Login another way');
    await page.waitForSelector('.modal-title:has-text("Enter RecoveryCode")', { timeout: 10000 });
    await page.fill('input[name="code"]', code);
    await page.locator('input[name="code"]').press('Enter');
    await page.waitForURL('**/', { timeout: 30000 });
}

// Dismisses the Recovery Codes modal if currently visible.
async function dismissRecoveryCodesModal(page) {
    const visible = await page.isVisible('.modal-title:has-text("Recovery Codes")');
    if (visible) {
        await page.click('.modal-footer button:has-text("Close")');
        await page.waitForSelector('.modal-title:has-text("Recovery Codes")', {
            state: 'hidden', timeout: 10000,
        });
    }
}

module.exports = {
    APP_URL,
    uniqueUsername,
    navigateToLogin,
    registerUser,
    signInUser,
    navigateToSecurityKeyPage,
    captureRecoveryCodes,
    signOutUser,
    signInWithRecoveryCode,
    dismissRecoveryCodesModal,
};
