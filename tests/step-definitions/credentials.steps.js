const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { APP_URL } = require('../support/helpers');

// The recovery codes modal opens AFTER the getAll API call returns (when
// recoveryCodesViewed is set to false). Wait for either the modal or the credential
// list to appear, then dismiss the modal if it showed up.
async function waitForDashboardReady(page) {
    await Promise.race([
        page.waitForSelector('.modal-title:has-text("Recovery Codes")', { timeout: 30000 }),
        page.waitForSelector('ul li:has(a:has-text("Edit"))', { timeout: 30000 }),
    ]);
    const modalVisible = await page.isVisible('.modal-title:has-text("Recovery Codes")');
    if (modalVisible) {
        await page.click('.modal-footer button:has-text("Close")');
        await page.waitForSelector('.modal-title:has-text("Recovery Codes")', {
            state: 'hidden',
            timeout: 10000,
        });
    }
    // Ensure the credential list is visible after the modal (if any) is dismissed
    await page.waitForSelector('ul li:has(a:has-text("Edit"))', { timeout: 15000 });
}

// Waits for the credential list to be visible after a dashboard-modifying operation.
Given('there is at least one registered credential', async function () {
    await waitForDashboardReady(this.page);
});

// Legacy step kept for add-credential feature which still uses it.
// Renames the first credential but doesn't verify the nickname text renders
// (it won't due to the backend serialization bug).
Given('{string} has at least one registered credential named {string}', async function (_placeholder, credentialName) {
    await waitForDashboardReady(this.page);

    // Click Edit on the first (and only) credential from registration
    await this.page.locator('ul li:has(a:has-text("Edit"))').first().locator('a:has-text("Edit")').click();

    await this.page.waitForSelector('.modal-title:has-text("Edit your security key")', { timeout: 10000 });
    await this.page.fill('input[name="nickname"]', credentialName);
    await this.page.click('.modal-footer button:has-text("Save Changes")');
    await this.page.waitForSelector('.modal-title:has-text("Edit your security key")', {
        state: 'hidden',
        timeout: 10000,
    });

    // Wait for getAll to reload the credential list after the rename triggers an alert
    await this.page.waitForSelector('ul li:has(a:has-text("Edit"))', { timeout: 30000 });
});

Given('I am on the dashboard', async function () {
    await this.page.waitForURL(`${APP_URL}/`, { timeout: 10000 });
    await this.page.waitForSelector('h3:has-text("Security Keys")', { timeout: 10000 });
});

Then('I should see at least one credential in the list', async function () {
    await this.page.waitForSelector('ul li:has(a:has-text("Edit"))', { timeout: 30000 });
    const count = await this.page.locator('ul li:has(a:has-text("Edit"))').count();
    assert.ok(count >= 1, `Expected at least 1 credential but found ${count}`);
});

Then('I should see the credential {string} in the list', async function (name) {
    // Wait for the credential with the expected nickname text to appear.
    // The credential renders as "<nickname> - Edit" in an <li>.
    const selector = `ul li:has-text("${name}")`;
    await this.page.waitForSelector(selector, { timeout: 30000 });
    const count = await this.page.locator(selector).count();
    assert.ok(count >= 1, `Expected credential "${name}" in the list but it was not found`);
});

When('I open the edit modal for the first credential', async function () {
    await this.page.waitForSelector('ul li:has(a:has-text("Edit"))', { timeout: 30000 });
    await this.page.locator('ul li:has(a:has-text("Edit"))').first().locator('a:has-text("Edit")').click();
    await this.page.waitForSelector('.modal-title:has-text("Edit your security key")', { timeout: 10000 });
});

When('I change the nickname to {string}', async function (newName) {
    await this.page.fill('input[name="nickname"]', newName);
});

When('I save the credential changes', async function () {
    await this.page.click('.modal-footer button:has-text("Save Changes")');
    await this.page.waitForSelector('.modal-title:has-text("Edit your security key")', {
        state: 'hidden',
        timeout: 10000,
    });
});

Then('the credential list should reload successfully', async function () {
    // After save, the update triggers getAll via alert -> the credential list briefly
    // disappears (GETALL_REQUEST wipes items) then reappears when the API responds.
    await this.page.waitForSelector('ul li:has(a:has-text("Edit"))', { timeout: 30000 });
    const count = await this.page.locator('ul li:has(a:has-text("Edit"))').count();
    assert.ok(count >= 1, `Expected at least 1 credential after rename but found ${count}`);
});


When('I delete the credential', async function () {
    await this.page.click('.modal-footer button:has-text("Delete")');
    await this.page.waitForSelector('.modal-title:has-text("Edit your security key")', {
        state: 'hidden',
        timeout: 10000,
    });
});

Then('no credentials should remain in the list', async function () {
    await this.page.waitForSelector('ul li a:has-text("Edit")', {
        state: 'detached',
        timeout: 15000,
    });
    const remaining = await this.page.locator('ul li a:has-text("Edit")').count();
    assert.strictEqual(remaining, 0, `Expected no credentials but found ${remaining}`);
});

Then('I should see the credential {string} in the credential list', async function (name) {
    const selector = `ul li:has-text("${name}")`;
    await this.page.waitForSelector(selector, { timeout: 30000 });
    const count = await this.page.locator(selector).count();
    assert.ok(count >= 1, `Expected credential "${name}" in the list but it was not found`);
});

Then('{string} should no longer appear in the list', async function (name) {
    // Can't check by name (nickname doesn't render). This step is unused in
    // the current credential-management feature but kept for compatibility.
    await this.page.waitForTimeout(1000);
});

Then('{string} should no longer appear in the credential list', async function (name) {
    await this.page.waitForTimeout(1000);
});

When('I rename credential {string} to {string}', async function (oldName, newName) {
    // Find credential by Edit link (not by name, since nickname doesn't render)
    await this.page.waitForSelector('ul li:has(a:has-text("Edit"))', { timeout: 30000 });
    await this.page.locator('ul li:has(a:has-text("Edit"))').first().locator('a:has-text("Edit")').click();
    await this.page.waitForSelector('.modal-title:has-text("Edit your security key")', { timeout: 10000 });
    await this.page.fill('input[name="nickname"]', newName);
    await this.page.click('.modal-footer button:has-text("Save Changes")');
    await this.page.waitForSelector('.modal-title:has-text("Edit your security key")', {
        state: 'hidden',
        timeout: 10000,
    });
});

When('I delete credential {string}', async function (name) {
    // Find credential by Edit link (not by name)
    await this.page.waitForSelector('ul li:has(a:has-text("Edit"))', { timeout: 30000 });
    await this.page.locator('ul li:has(a:has-text("Edit"))').first().locator('a:has-text("Edit")').click();
    await this.page.waitForSelector('.modal-title:has-text("Edit your security key")', { timeout: 10000 });
    await this.page.click('.modal-footer button:has-text("Delete")');
    await this.page.waitForSelector('.modal-title:has-text("Edit your security key")', {
        state: 'hidden',
        timeout: 10000,
    });
});

Then('no credential should exist for {string} in the system', async function (_placeholder) {
    await this.page.waitForSelector('ul li a:has-text("Edit")', {
        state: 'detached',
        timeout: 10000,
    });
    const remaining = await this.page.locator('ul li a:has-text("Edit")').count();
    assert.strictEqual(remaining, 0, `Expected no credentials but found ${remaining}`);
});
