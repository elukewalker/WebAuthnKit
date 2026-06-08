const { Given, When, Then } = require('@cucumber/cucumber');
const { APP_URL, uniqueUsername, navigateToLogin, navigateToSecurityKeyPage } = require('../support/helpers');

// Creates a virtual authenticator that has no user-verification capability.
// Returns the new authenticatorId. Updates this.virtualAuthenticatorId so
// subsequent CDP helpers (credential removal, etc.) use the correct ID.
//
// WHY: setUserVerified(false) on a hasUserVerification=true authenticator causes
// Chrome to throw NotAllowedError instead of completing the ceremony with UV=0.
// Using hasUserVerification=false makes Chrome treat the authenticator as UV-incapable
// and complete the ceremony without UV, which is exactly what the RegisterPage
// checks (credentialResponse.getAuthenticatorData().flags.uv === false) to trigger
// the server-verified PIN flow.
async function swapToNoUVAuthenticator(cdpSession, currentAuthenticatorId) {
    await cdpSession.send('WebAuthn.removeVirtualAuthenticator', {
        authenticatorId: currentAuthenticatorId,
    });
    const { authenticatorId } = await cdpSession.send('WebAuthn.addVirtualAuthenticator', {
        options: {
            protocol: 'ctap2',
            transport: 'usb',
            hasResidentKey: true,
            hasUserVerification: false,
            isUserVerified: false,
        },
    });
    return authenticatorId;
}

// Registers a new account with UV=false. The RegisterPage dispatches
// credentialActions.getUV() when UV=false, staying on /register and showing
// the ServerVerifiedPin type="create" modal (title "Server-Verified PIN", button "OK").
When('I register a new account without user verification', async function () {
    this.testUsername = uniqueUsername('svp');
    await navigateToLogin(this.page);
    await this.page.fill('input[name="username"]', this.testUsername);
    await this.page.click('button:has-text("Next")');
    await this.page.waitForURL('**/register', { timeout: 20000 });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Swap to UV=false authenticator so the WebAuthn ceremony completes with UV=0,
    // triggering the server-verified PIN creation flow.
    this.virtualAuthenticatorId = await swapToNoUVAuthenticator(
        this.cdpSession,
        this.virtualAuthenticatorId
    );

    await this.page.click('button:has-text("Register Security Key")');
    // UV=false: stays on /register, shows PIN creation modal (type="create").
    // Identify creation modal by presence of the confirmPin field (dispatch modal has none).
    await this.page.waitForSelector('input[name="confirmPin"]', { timeout: 60000 });
});

// The creation modal (type="create") has a confirmPin field — use that as the identifier.
Then('the server-verified PIN creation modal should appear', async function () {
    await this.page.waitForSelector('input[name="confirmPin"]', { timeout: 5000 });
});

// Compound setup step: registers with UV=false, sets PIN, navigates to '/',
// then signs out. Leaves the browser on the login page for subsequent When steps.
// Keeps the UV=false authenticator active (it holds the registered credential).
Given('a user is registered without user verification and has PIN {string}', async function (pin) {
    this.testUsername = uniqueUsername('svp');

    await navigateToLogin(this.page);
    await this.page.fill('input[name="username"]', this.testUsername);
    await this.page.click('button:has-text("Next")');
    await this.page.waitForURL('**/register', { timeout: 20000 });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Swap to UV=false authenticator. Keep it for subsequent sign-in steps —
    // the registered credential lives inside this authenticator.
    this.virtualAuthenticatorId = await swapToNoUVAuthenticator(
        this.cdpSession,
        this.virtualAuthenticatorId
    );

    await this.page.click('button:has-text("Register Security Key")');
    // Wait for PIN creation modal (confirmPin field distinguishes type="create")
    await this.page.waitForSelector('input[name="confirmPin"]', { timeout: 60000 });

    // Fill PIN (type="create" has both pin and confirmPin; save button is "OK")
    await this.page.waitForSelector('.modal.show', { timeout: 5000 });
    await this.page.fill('.modal.show input[name="pin"]', pin);
    await this.page.fill('.modal.show input[name="confirmPin"]', pin);
    await this.page.click('.modal-footer button:has-text("OK")');
    // After PIN is saved, confirmSignIn completes and navigates to '/'
    await this.page.waitForURL(`${APP_URL}/`, { timeout: 60000 });

    // Sign out so the scenario's When steps start from the login page
    await this.page.click('a:has-text("Logout")');
    await this.page.waitForURL('**/login', { timeout: 10000 }).catch(() => {});
});

// Navigates to the security key sign-in page and triggers the assertion ceremony.
// The UV=false authenticator (set up in the Given step) is still active, so
// the ceremony completes with UV=0 and the PIN entry modal appears automatically.
When('I navigate to the security key sign-in page without user verification', async function () {
    await navigateToSecurityKeyPage(this.page, this.testUsername);
    await this.page.click('button:has-text("Login with Security Key")');
    // Wait for PIN dispatch modal ("Enter Server-Verified PIN") or error
    await Promise.race([
        this.page.waitForSelector('.modal-title:has-text("Enter Server-Verified PIN")', { timeout: 30000 }),
        this.page.waitForSelector('.alert-danger', { timeout: 30000 }),
    ]);
});

Then('I should see the server-verified PIN entry prompt', async function () {
    // type="dispatch" modal title is "Enter Server-Verified PIN"
    await this.page.waitForSelector('.modal-title:has-text("Enter Server-Verified PIN")', { timeout: 15000 });
});

// Works for both type="dispatch" (sign-in) and type="create" (registration) modals —
// both use input[name="pin"] and save button "OK".
When('I enter PIN {string}', async function (pin) {
    await this.page.waitForSelector('.modal.show input[name="pin"]', { timeout: 10000 });
    await this.page.fill('.modal.show input[name="pin"]', pin);
    await this.page.click('.modal.show .modal-footer button:has-text("OK")');
});
