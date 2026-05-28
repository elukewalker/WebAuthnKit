const { When } = require('@cucumber/cucumber');

// The virtual authenticator holds the resident key created during registration
// and responds automatically when navigator.credentials.get() is called without
// a username (usernameless flow). No explicit action is needed here.
When('the virtual authenticator returns the credential for {string}', async function (_placeholder) {
    await this.page.waitForLoadState('domcontentloaded');
});
