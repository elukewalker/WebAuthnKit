const { When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

// Handles both "registereduser" (maps to this.testUsername from the Background setup)
// and "unknownuser" (generates a username guaranteed not to exist in Cognito).
When('I enter username {string}', async function (placeholder) {
    let username;
    if (placeholder === 'unknownuser') {
        username = `unk${Date.now()}`;
    } else {
        username = this.testUsername;
    }
    await this.page.fill('input[name="username"]', username);
});

Then('I should be on the sign-in with security key page', async function () {
    await this.page.waitForURL('**/loginWithSecurityKey', { timeout: 20000 });
    const url = this.page.url();
    assert.ok(url.includes('/loginWithSecurityKey'), `Expected /loginWithSecurityKey but got: ${url}`);
});
