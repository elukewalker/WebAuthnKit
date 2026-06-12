const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { navigateToLogin, signInUser } = require('../support/helpers');

// Loops through all 5 recovery codes via sign-in/sign-out cycles, exhausting them all.
// Ends with the user signed out so the When step can sign in cleanly.
//
// In the upstream, recovery codes are entered via ForgotStep (inline form at /login)
// rather than a modal on /loginWithSecurityKey.
Given('{string} has used all their recovery codes', async function (_placeholder) {
    assert.ok(this.recoveryCodes.length === 5, `Expected 5 recovery codes but got ${this.recoveryCodes.length}`);

    for (let i = 0; i < this.recoveryCodes.length; i++) {
        const code = this.recoveryCodes[i];

        // Navigate to login and go to ForgotStep
        await navigateToLogin(this.page);
        await this.page.evaluate((username) => {
            localStorage.setItem('username', username);
        }, this.testUsername);
        await this.page.fill('input[name="username"]', this.testUsername);
        await this.page.click('text=Forgot Your Security Key?');
        await this.page.waitForSelector('input[name="recoveryCode"]', { timeout: 10000 });

        // Enter recovery code and submit
        await this.page.fill('input[name="recoveryCode"]', code);
        await this.page.click('button:has-text("Continue")');
        await this.page.waitForURL('**/', { timeout: 30000 });

        // Dismiss recovery codes modal if it opens
        const modalVisible = await this.page.isVisible('.modal-title:has-text("Recovery Codes")').catch(() => false);
        if (modalVisible) {
            await this.page.click('.modal-footer button:has-text("Not now")');
            await this.page.waitForSelector('.modal-title:has-text("Recovery Codes")', {
                state: 'hidden',
                timeout: 10000,
            });
        }

        // Sign out before next iteration (or after last one)
        await this.page.click('button:has-text("Sign Out")');
        await this.page.waitForURL('**/login', { timeout: 10000 }).catch(() => {});
    }
});

// Signs in with the security key (auto-presence enabled). Dashboard will auto-open
// the exhaustion modal since allRecoveryCodesUsed === true.
When('I sign in as {string} with a security key', async function (_placeholder) {
    await signInUser(this.page, this.testUsername);
});

Then('I should see a warning that all recovery codes have been used', async function () {
    // Dashboard auto-opens recovery codes modal when all codes are exhausted
    await this.page.waitForSelector('.modal-title:has-text("Recovery Codes")', { timeout: 15000 });
    await this.page.waitForSelector('em.text-danger:has-text("All Recovery Codes have been used")', { timeout: 10000 });
});

Then('I should see a prompt to generate new recovery codes', async function () {
    await this.page.waitForSelector('h6:has-text("Generate new recovery codes")', { timeout: 10000 });
    // Close the modal now that the assertion is verified
    await this.page.click('.modal-footer button:has-text("Not now")');
});
