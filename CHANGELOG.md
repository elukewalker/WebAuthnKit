# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-05-20

### Changed
- Upgraded Java runtime from Java 8 to Java 17
- Upgraded Node.js runtime from 12.x to 20.x
- Upgraded React from 16 to 18
- Upgraded React Router from 5 to 6
- Upgraded aws-amplify from 3 to 5
- Upgraded Webpack from 4 to 5
- Migrated AWS SDK from v2 to v3 for all Lambda functions
- Updated all backend and frontend dependencies to current LTS/stable versions

### Fixed
- Fixed AWS SDK v3 Payload decoding in Lambda functions (TextDecoder required for Uint8Array)
- Fixed React Router v6 PrivateRoute component incompatibility
- Fixed React Router v6 navigation (removed history.push, added useNavigate)
- Fixed aws-amplify v5 authentication API migration (Auth.sendCustomChallengeAnswer → confirmSignIn)
- Fixed RegisterPage.jsx syntax error from incomplete migration
- Fixed Java Log4j dependency (log4j-slf4j18-impl → log4j-slf4j2-impl)
- Fixed Lombok annotation processing for Java 17
- Reverted webauthn-server-core to 1.12.0-RC1 to maintain API compatibility

### Security
- Addressed security findings in CI/CD pipeline (CORS configuration, GitHub Actions pinning, CODEOWNERS)
- Updated all dependencies to address known vulnerabilities in older versions

## [1.0.0] - (Previous Release)
Initial release
