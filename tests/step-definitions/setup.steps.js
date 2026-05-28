// Background "Given" steps shared across multiple features.
// Each step generates a unique username so scenarios don't collide on shared state.

const { Given } = require('@cucumber/cucumber');
const { uniqueUsername, registerUser, signInUser, navigateToLogin } = require('../support/helpers');

// Used in: authentication.feature, recovery-codes.feature
// Registers a fresh user via the UI. Ends on the dashboard.
// Subsequent Background steps handle any further navigation needed.
Given('{string} is registered with a security key', async function (_placeholder) {
    this.testUsername = uniqueUsername('u');
    await registerUser(this.page, this.testUsername);
});

// Used in: usernameless-login.feature
// Same as above — the virtual authenticator in hooks.js always has hasResidentKey: true,
// so every credential registered is automatically a discoverable credential.
Given('{string} is registered with a discoverable credential', async function (_placeholder) {
    this.testUsername = uniqueUsername('ul');
    await registerUser(this.page, this.testUsername);
});

// Used in: credential-management.feature
// Registers and then signs in, landing on the dashboard.
Given('{string} is signed in', async function (_placeholder) {
    this.testUsername = uniqueUsername('cm');
    await registerUser(this.page, this.testUsername);
    // registerUser lands on the dashboard; sign-in is already complete post-registration
});
