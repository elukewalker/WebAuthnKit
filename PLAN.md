<!-- /autoplan restore point: /home/scion/.gstack/projects//scion-dep-upgrade-autoplan-restore-20260520-100411.md -->
# Dependency Upgrade Plan: WebAuthnKit

## Problem Statement

WebAuthnKit is running on outdated dependencies across all layers of the stack:
- Java 8 Lambda backend (EOL)
- Node.js 16 Lambda functions (approaching EOL)
- React 16 frontend (multiple major versions behind)
- Webpack 4 (deprecated)
- aws-amplify 3 (breaking API changes in v5)
- AWS SDK v2 (deprecated in favor of modular v3)

This creates security risks, limits access to new features, and will eventually block deployments as runtimes are deprecated by AWS.

## Goal

Upgrade ALL dependencies to their latest stable versions across:
1. Java Lambda backend → Java 17 runtime
2. Node.js Lambdas → Node 20 runtime with AWS SDK v3
3. React frontend → React 18, Webpack 5, aws-amplify 5, TypeScript 5
4. iOS client → latest dependency versions

## Success Criteria

- All Lambda runtimes updated in template.yaml
- All package.json files updated with latest compatible versions
- Java pom.xml updated with latest versions
- All breaking API changes from upgrades are fixed
- Application builds successfully
- All existing functionality preserved

## Implementation Plan

### Phase 1: Java Lambda Backend

**Files:**
- `backend/lambda-functions/JavaWebAuthnLib/pom.xml`
- `backend/template.yaml` (Java runtime)

**Changes:**
1. Update template.yaml: `Runtime: java8.al2` → `Runtime: java17`
2. Update pom.xml:
   - webauthn-server-core → 2.9.0
   - webauthn-server-attestation → 2.9.0
   - Pin `maven.compiler.release=17`
   - Update all other dependencies to latest stable
3. Validate with: `JAVA_HOME=/opt/java-25 mvn clean package -B -Dmaven.repo.local=/tmp/m2`

**Breaking Changes:**
- Java 17 language features and API changes
- Potential webauthn-server-core API changes

### Phase 2: Node.js Lambda Functions

**Files:**
- `backend/template.yaml` (Node runtime for 7 Lambda functions)
- `backend/lambda-functions/CreateAuth/package.json`
- `backend/lambda-functions/CreateDBSchema/package.json`
- `backend/lambda-functions/FIDO2KitAPI/package.json`
- `backend/lambda-functions/PreSignUp/package.json`
- `backend/lambda-functions/DefineAuth/package.json`
- `backend/lambda-functions/VerifyAuth/package.json`
- `backend/package.json` (root)

**Changes:**
1. Update template.yaml: All Node.js Lambda `Runtime: nodejs16.x` → `Runtime: nodejs20.x`
2. For each Lambda package.json:
   - Replace `aws-sdk` (v2) with modular `@aws-sdk/*` packages:
     - `@aws-sdk/client-dynamodb`
     - `@aws-sdk/client-cognito-identity-provider`
     - `@aws-sdk/lib-dynamodb`
     - Others as needed per Lambda function
   - Update all other npm dependencies to latest
3. Update code to use AWS SDK v3 patterns:
   - Replace `new AWS.DynamoDB()` with `new DynamoDBClient({})`
   - Use command pattern: `client.send(new GetItemCommand(...))`
   - Remove `.promise()` calls (SDK v3 is promise-native)
4. Validate each: `npm install && npm test`

**Breaking Changes:**
- AWS SDK v3 completely different API (command objects, no .promise())
- Potential breaking changes in other npm dependencies

### Phase 3: React Frontend

**Files:**
- `clients/web/react/package.json`
- React component files (for API changes)
- Webpack configuration
- Entry point file (for ReactDOM.render → createRoot)

**Changes:**
1. Update package.json:
   - React 16 → 18 (`react@^18.0.0`, `react-dom@^18.0.0`)
   - Webpack 4 → 5 (`webpack@^5.0.0`, `webpack-cli@^5.0.0`)
   - aws-amplify 3 → 5 (`aws-amplify@^5.0.0`)
   - TypeScript 4 → 5 (`typescript@^5.0.0`)
   - `@github/webauthn-json@latest`
   - Update webpack loaders and plugins to v5-compatible versions
2. Update React 18 rendering:
   - Replace `ReactDOM.render(<App />, root)` with:
     ```javascript
     import { createRoot } from 'react-dom/client';
     const root = createRoot(document.getElementById('root'));
     root.render(<App />);
     ```
   - Review components for deprecated lifecycle methods
   - Test with React 18 StrictMode
3. Update Webpack 5 configuration:
   - Replace `file-loader` and `url-loader` with asset modules
   - Update `output.publicPath` handling
   - Remove deprecated plugins
4. Update aws-amplify 5:
   - Replace `import { Auth } from 'aws-amplify'` with `import { signIn } from 'aws-amplify/auth'`
   - Update `Amplify.configure()` calls to new API
   - Update all Auth.* calls to new modular imports
5. Validate: `npm install && npm run build`

**Breaking Changes:**
- ReactDOM.render API change (mandatory for React 18)
- Webpack 5 loader/plugin ecosystem
- aws-amplify complete API rewrite (most significant)
- TypeScript 5 strictness improvements

### Phase 4: iOS Client

**Files:**
- `clients/iOS/WebAuthnKitSafari/Package.swift` or `Podfile`

**Changes:**
1. Update dependency versions in Package.swift or Podfile to latest
2. Document that build validation requires macOS/Xcode (cannot build on Linux)

**Breaking Changes:**
- Unknown (requires macOS/Xcode to discover)

## Testing Strategy

### Build Validation
- Java: `mvn clean package -B` succeeds
- Each Node Lambda: `npm install && npm test` succeeds
- React: `npm install && npm run build` succeeds
- iOS: Manifest updates only (build requires macOS)

### Functional Testing
- Deploy to a test environment
- Verify WebAuthn registration flow
- Verify WebAuthn authentication flow
- Test all Lambda functions individually
- Test frontend against backend APIs

### Rollback Plan
- Keep this branch separate from main
- Test thoroughly before merging
- Can revert PR if critical issues found

## Risks

### High Risk
1. **aws-amplify 3→5 migration**: Complete API rewrite, likely to break authentication flow
2. **AWS SDK v2→v3 migration**: Every Lambda function needs code changes, not just dependency updates
3. **React 16→18**: Rendering API change affects entry point, potential concurrent mode issues

### Medium Risk
1. **Webpack 4→5**: Configuration changes could break asset handling
2. **Java 8→17**: Language and API changes in 9 major versions
3. **webauthn-server-core update**: Core WebAuthn library API changes

### Low Risk
1. **TypeScript 4→5**: Mostly backwards compatible
2. **Node 16→20**: Runtime changes minimal for Lambda functions
3. **iOS dependencies**: Limited blast radius

## Out of Scope

- Refactoring code beyond what's required for upgrades
- Adding new features
- Performance optimizations beyond dependency updates
- UI/UX changes
- Database schema changes

## Timeline Estimate

- Phase 1 (Java): 2-3 hours
- Phase 2 (Node Lambdas): 4-6 hours (7 functions × AWS SDK v3 migration)
- Phase 3 (React): 4-6 hours (aws-amplify migration most complex)
- Phase 4 (iOS): 30 minutes (manifest only)
- Testing & validation: 2-3 hours
- **Total: 13-18 hours human time / ~2-3 hours CC time**
