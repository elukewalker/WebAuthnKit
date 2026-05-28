const { Before, After } = require('@cucumber/cucumber');
const { chromium } = require('playwright');

Before(async function () {
    const headless = process.env.HEADLESS !== 'false';
    this.browser = await chromium.launch({ headless });
    this.context = await this.browser.newContext({ ignoreHTTPSErrors: true });

    // Attach a virtual authenticator that simulates a CTAP2 USB security key
    // with resident-key (discoverable credential) support enabled.
    // hasResidentKey: true supports both regular and usernameless flows.
    this.virtualAuthenticator = await this.context.addVirtualAuthenticator({
        protocol: 'ctap2',
        transport: 'usb',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
    });

    this.page = await this.context.newPage();
    this.testUsername = null;
    this.recoveryCodes = [];
    this.usedRecoveryCode = null;
});

After(async function () {
    await this.page?.close().catch(() => {});
    await this.context?.close().catch(() => {});
    await this.browser?.close().catch(() => {});
});
