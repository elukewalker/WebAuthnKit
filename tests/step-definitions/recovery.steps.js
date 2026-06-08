const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const {
    captureRecoveryCodes,
    navigateToSecurityKeyPage,
} = require('../support/helpers');

Given('{string} has been issued recovery codes at registration', async function (_placeholder) {
    // After registration the dashboard auto-opens the Recovery Codes modal.
    // captureRecoveryCodes handles both the auto-open and manual-open cases.
    this.recoveryCodes = await captureRecoveryCodes(this.page);
    assert.strictEqual(this.recoveryCodes.length, 5, 'Expected 5 recovery codes after registration');
});

Given('I am on the sign-in with security key page for {string}', async function (_placeholder) {
    // Disable the virtual authenticator's auto-response so the page's on-mount WebAuthn
    // ceremony fails immediately, keeping the browser on /loginWithSecurityKey where
    // the recovery code modal can be used.
    await this.cdpSession.send('WebAuthn.setAutomaticPresenceSimulation', {
        authenticatorId: this.virtualAuthenticatorId,
        enabled: false,
    });
    await navigateToSecurityKeyPage(this.page, this.testUsername);
    // Wait for the failed auto-sign-in to settle (Cognito error alert appears, page stays)
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
});

// Consumes recoveryCodes[0] via a complete recovery-code login, records the used code,
// then signs out and returns to the security key page so the scenario's When steps start
// from the correct state.
Given('I have already used one recovery code', async function () {
    const codeToUse = this.recoveryCodes[0];
    assert.ok(codeToUse, 'No recovery code available — check Background setup');
    this.usedRecoveryCode = codeToUse;

    // Open the recovery code modal and sign in with the code
    await this.page.click('text=Login another way');
    await this.page.waitForSelector('.modal-title:has-text("Enter RecoveryCode")', { timeout: 10000 });
    await this.page.fill('input[name="code"]', codeToUse);
    await this.page.locator('input[name="code"]').press('Enter');
    await this.page.waitForURL('**/', { timeout: 30000 });

    // Dismiss recovery codes modal if it re-opens after sign-in
    const recoveryModal = await this.page.waitForSelector(
        '.modal-title:has-text("Recovery Codes")',
        { timeout: 5000 }
    ).then(() => true).catch(() => false);
    if (recoveryModal) {
        await this.page.click('.modal-footer button:has-text("Close")');
    }

    // Sign out and navigate back to the security key sign-in page
    await this.page.click('a:has-text("Logout")');
    await navigateToSecurityKeyPage(this.page, this.testUsername);
});

When('I enter a valid recovery code', async function () {
    const code = this.recoveryCodes[0];
    assert.ok(code, 'No recovery code captured — check Background setup');
    await this.page.waitForSelector('input[name="code"]', { timeout: 10000 });
    await this.page.fill('input[name="code"]', code);
    await this.page.locator('input[name="code"]').press('Enter');
});

When('I enter an invalid recovery code {string}', async function (invalidCode) {
    await this.page.waitForSelector('input[name="code"]', { timeout: 10000 });
    await this.page.fill('input[name="code"]', invalidCode);
    await this.page.locator('input[name="code"]').press('Enter');
});

When('I enter the previously used recovery code', async function () {
    assert.ok(this.usedRecoveryCode, 'No used recovery code recorded — check Given step');
    await this.page.waitForSelector('input[name="code"]', { timeout: 10000 });
    await this.page.fill('input[name="code"]', this.usedRecoveryCode);
    await this.page.locator('input[name="code"]').press('Enter');
});

Then('that recovery code should be marked as used', async function () {
    // Wait for the dashboard's getAll() to complete before opening the modal.
    // The RecoveryCodes component is defined inline inside HomePage — if getAll()
    // completes while the modal is open, HomePage re-renders, remounting RecoveryCodes
    // and resetting its showCodes state (closing the modal).
    await this.page.waitForSelector('h3:has-text("Security Keys")', { timeout: 15000 });
    // Wait for credential list to appear (means getAll succeeded)
    await this.page.waitForSelector('ul li:has(a:has-text("Edit"))', { timeout: 30000 });
    // Brief pause to let any final re-renders settle
    await this.page.waitForTimeout(1000);

    await this.page.click('button:has-text("Show Recovery Codes")');
    await this.page.waitForSelector('.modal-title:has-text("Recovery Codes")', { timeout: 10000 });
    // After using 1 of 5 codes, 4 should remain. The listRecoveryCodes Lambda may cold-start.
    await this.page.waitForSelector('text=/\\d+ recovery codes? remaining/', { timeout: 45000 });
    const countText = await this.page.locator('text=/\\d+ recovery codes? remaining/').textContent();
    const count = parseInt(countText.match(/(\d+)/)[1], 10);
    assert.ok(count < 5, `Expected fewer than 5 codes remaining but found ${count}`);
    await this.page.click('.modal-footer button:has-text("Close")');
});
