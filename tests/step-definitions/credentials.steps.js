const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { APP_URL } = require('../support/helpers');

// Dismisses the recovery codes modal if it is currently visible.
async function dismissRecoveryCodesModal(page) {
    const visible = await page.isVisible('.modal-title:has-text("Recovery Codes")');
    if (visible) {
        await page.click('.modal-footer button:has-text("Close")');
        await page.waitForSelector('.modal-title:has-text("Recovery Codes")', {
            state: 'hidden',
            timeout: 10000,
        });
    }
}

// Rename the first credential in the list to give it a known name.
// This avoids a second WebAuthn ceremony just to set up test state.
Given('{string} has at least one registered credential named {string}', async function (_placeholder, credentialName) {
    await dismissRecoveryCodesModal(this.page);

    // Click Edit on the first (and only) credential from registration
    await this.page.waitForSelector('ul li a:has-text("Edit")', { timeout: 10000 });
    await this.page.locator('ul li a:has-text("Edit")').first().click();

    await this.page.waitForSelector('.modal-title:has-text("Edit your security key")', { timeout: 10000 });
    await this.page.fill('input[name="nickname"]', credentialName);
    await this.page.click('.modal-footer button:has-text("Save Changes")');
    await this.page.waitForSelector('.modal-title:has-text("Edit your security key")', {
        state: 'hidden',
        timeout: 10000,
    });
});

Given('I am on the dashboard', async function () {
    await this.page.waitForURL(`${APP_URL}/`, { timeout: 10000 });
    await this.page.waitForSelector('h3:has-text("Security Keys")', { timeout: 10000 });
});

Then('I should see the credential {string} in the credential list', async function (name) {
    await this.page.waitForSelector(`ul li:has-text("${name}")`, { timeout: 10000 });
});

Then('I should see {string} in the credential list', async function (name) {
    await this.page.waitForSelector(`ul li:has-text("${name}")`, { timeout: 10000 });
});

Then('{string} should no longer appear in the list', async function (name) {
    await this.page.waitForSelector(`ul li:has-text("${name}")`, {
        state: 'detached',
        timeout: 10000,
    });
});

Then('{string} should no longer appear in the credential list', async function (name) {
    await this.page.waitForSelector(`ul li:has-text("${name}")`, {
        state: 'detached',
        timeout: 10000,
    });
});

When('I rename credential {string} to {string}', async function (oldName, newName) {
    const credItem = this.page.locator(`ul li:has-text("${oldName}")`);
    await credItem.locator('a:has-text("Edit")').click();
    await this.page.waitForSelector('.modal-title:has-text("Edit your security key")', { timeout: 10000 });
    await this.page.fill('input[name="nickname"]', newName);
    await this.page.click('.modal-footer button:has-text("Save Changes")');
    await this.page.waitForSelector('.modal-title:has-text("Edit your security key")', {
        state: 'hidden',
        timeout: 10000,
    });
});

When('I delete credential {string}', async function (name) {
    const credItem = this.page.locator(`ul li:has-text("${name}")`);
    await credItem.locator('a:has-text("Edit")').click();
    await this.page.waitForSelector('.modal-title:has-text("Edit your security key")', { timeout: 10000 });
    await this.page.click('.modal-footer button:has-text("Delete")');
    await this.page.waitForSelector('.modal-title:has-text("Edit your security key")', {
        state: 'hidden',
        timeout: 10000,
    });
});

Then('no credential should exist for {string} in the system', async function (_placeholder) {
    // The renamed credential was the only one; after deletion the list should be empty
    await this.page.waitForSelector('ul li a:has-text("Edit")', {
        state: 'detached',
        timeout: 10000,
    });
    const remaining = await this.page.locator('ul li a:has-text("Edit")').count();
    assert.strictEqual(remaining, 0, `Expected no credentials but found ${remaining}`);
});
