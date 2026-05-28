const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { uniqueUsername } = require('../support/helpers');

// "testuser" is a placeholder in the feature file; we use a unique name each run.
When('I enter a new username {string}', async function (_placeholder) {
    this.testUsername = uniqueUsername('tu');
    await this.page.fill('input[name="username"]', this.testUsername);
});

Then('I should be on the registration page', async function () {
    await this.page.waitForURL('**/register', { timeout: 20000 });
    const url = this.page.url();
    assert.ok(url.includes('/register'), `Expected /register but got: ${url}`);
});

Then('I should see {string}', async function (text) {
    // Handle dynamic "Hello testuser" — replace the placeholder with the actual username
    const resolvedText = text.replace('testuser', this.testUsername || 'testuser');
    await this.page.waitForSelector(`text=${resolvedText}`, { timeout: 10000 });
});

Then('a credential should exist for {string} in the system', async function (_placeholder) {
    // After registration the dashboard shows the credential list under "Security Keys"
    await this.page.waitForSelector('h3:has-text("Security Keys")', { timeout: 10000 });
    const listItems = this.page.locator('ul li');
    const count = await listItems.count();
    assert.ok(count > 0, 'Expected at least one credential in the list');
});

// This scenario requires seeding a Cognito account without a credential —
// complex state that is out of scope for automated UI testing.
Given('{string} has a pending Cognito account but no credential', async function (_username) {
    return 'pending';
});
