# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-05-26

### Fixed
- **AWS SDK v3 migration completion**: Fixed custom resource Lambda handler in CloudFormation template to use AWS SDK v3 async/await pattern instead of callback-based v2 API. The nodejs20.x runtime requires SDK v3 (bundled SDK v2 was removed after nodejs16.x).
- **Error handling in auth Lambdas**: Improved error propagation in authentication flows. CreateAuth now throws proper errors instead of returning error strings, and VerifyAuth verify functions throw errors instead of silently returning false, ensuring failures are visible in CloudWatch logs.
- **Empty catch block logging**: Added error logging to previously silent catch blocks in Lambda functions, improving debuggability when user attribute updates or FIDO2 registration deletions fail.
- **Amplify v5 API fixes**: Completed migration to Amplify v5 authentication API patterns, fixing all references from Cognito v4 response shape (`cognitoUser.challengeName`) to v5 shape (`signInResult.nextStep?.signInStep`).
- **User attributes access**: Updated all references from `user.attributes.name` to `user.signInDetails?.loginId` to match Amplify v5 user object structure.
- **React Router v6 migration completion**: Finished migration from React Router v5 to v6, replacing all `history.push()` calls with `navigate()` and replacing `history.listen` pattern with `AlertClearer` component using `useLocation()` hook.
- **Missing return statements**: Added missing `return` keywords in user service functions that were causing authentication flow errors.
- **Async/await consistency**: Converted mixed await/.then() code to consistent async/await with try/catch blocks in registration flow.
- **Back-navigation handling**: Restored back-navigation guard in registration page using `popstate` event listener to properly clean up credential state when users navigate back.

These fixes address 11 post-merge review issues identified after the v1.1.0 upgrade, ensuring the application works correctly with the upgraded runtimes and libraries.

## [1.1.0] - 2026-05-20

### Changed
- **Upgraded to current LTS runtimes**: Java 8→17, Node.js 12→20. Your deployment now runs on supported, actively maintained runtimes with the latest security patches and performance improvements.
- **Modernized frontend stack**: React 16→18, React Router 5→6, Webpack 4→5. Improved app performance with React 18's concurrent rendering and automatic batching.
- **Updated authentication library**: aws-amplify 3→5. Authentication flows now use the latest Amplify SDK with improved error handling and type safety.
- **Migrated to AWS SDK v3**: All Lambda functions now use modular AWS SDK v3, reducing bundle sizes and improving cold start times.

### Fixed
- **Authentication flow compatibility**: Fixed critical runtime errors in WebAuthn registration and login flows that would have caused authentication to fail after upgrading AWS SDK and Amplify.
- **Navigation handling**: Updated React Router navigation to v6 API, ensuring users can navigate between pages without errors.
- **Java build compatibility**: Fixed dependency conflicts that prevented the Java WebAuthn library from compiling with Java 17. The application now builds successfully with the new runtime.

### Security
- **Eliminated known vulnerabilities**: Upgraded all dependencies from EOL/deprecated versions to current LTS releases, addressing security advisories in Java 8, Node.js 12, React 16, and older npm packages.
- **CI/CD hardening**: Security audit identified and documented recommendations for CORS configuration tightening, GitHub Actions version pinning, and CODEOWNERS file creation (see `.gstack/security-reports/` for details).

## [1.0.0] - (Previous Release)
Initial release
