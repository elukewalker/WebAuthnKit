# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

WebAuthnKit is a Yubico passwordless authentication starter kit using WebAuthn (FIDO2). It is a full-stack, cloud-native solution deployed entirely to AWS serverless infrastructure. The system enables users to register and authenticate using hardware security keys (YubiKeys) instead of passwords.

## Commands

### Java WebAuthn Library
```bash
cd backend/lambda-functions/JavaWebAuthnLib
mvn clean package -B   # Build + package
mvn test               # Run tests (JUnit 5)
```

### React Web Client
```bash
cd clients/web/react
npm install
npm start              # Dev server at https://localhost:8080
npm run build          # Production Webpack build
```

### Node.js Lambda Functions
Each Lambda has its own `package.json`. Install dependencies per function:
```bash
cd backend/lambda-functions/<FunctionName>
npm install
```

### Deployment
```bash
# Mac/Linux (full AWS deployment, ~10-15 min)
./scripts/Mac-Linux/deployStarterKit.sh

# Windows PowerShell
.\scripts\PowerShell\deployStarterKit.ps1
```

The deployment script packages all Lambdas, uploads to S3, and deploys the SAM CloudFormation stack. Teardown is done by deleting the CloudFormation stack in the AWS console.

## Architecture

### Backend: AWS Serverless (SAM)
All infrastructure is defined in `backend/template.yaml`. Key resources:

- **AWS Cognito User Pool** — identity provider with a custom authentication challenge flow
- **4 Cognito Trigger Lambdas** (Node.js): `PreSignUp`, `DefineAuth`, `CreateAuth`, `VerifyAuth`
- **FIDO2KitAPI Lambda** (Node.js): main REST API for credential management, PIN, and recovery codes
- **JavaWebAuthnLib Lambda** (Java 17): WebAuthn Relying Party logic using Yubico's `webauthn-server-core` library
- **CreateDBSchema Lambda** (Node.js): one-time DB initializer invoked by CloudFormation custom resource
- **Aurora Serverless (MySQL)**: stores users, credentials, challenges, PINs, and recovery codes — accessed via the RDS Data API using `data-api-client`
- **API Gateway (REST)**: routes requests to FIDO2KitAPI; CORS-enabled

### Authentication Flow
1. React client registers user via Cognito (aws-amplify SDK)
2. `PreSignUp` Lambda validates the signup
3. Client initiates WebAuthn registration → `FIDO2KitAPI` invokes `JavaWebAuthnLib` Lambda to generate a challenge, stores it in Aurora
4. After the user's security key signs the challenge, `FIDO2KitAPI` verifies via `JavaWebAuthnLib` and stores the credential
5. On login: Cognito's custom auth triggers fire (`DefineAuth` → `CreateAuth` → `VerifyAuth`), with `CreateAuth` calling `FIDO2KitAPI` to create an assertion challenge and `VerifyAuth` validating the signed assertion

### Frontend: React Web Client (`clients/web/react/`)
- React 18 + Redux + React Router 6 + Bootstrap 5
- aws-amplify 5 handles Cognito sign-in/sign-up flows
- `@github/webauthn-json` wraps the browser WebAuthn API
- CBOR library handles FIDO2 attestation encoding
- Webpack 5 + Babel transpilation; dev server runs HTTPS on port 8080

### Database Schema
Six Aurora tables documented in `backend/Database.md`:
- `user` — user profiles and active challenges
- `credentialRegistrations` — stored FIDO2 public keys
- `assertionRequests` / `registrationRequests` — in-flight ceremony challenges
- `serverVerifiedPin` — server-side PIN storage
- `recoveryCodes` — account recovery

### iOS Client (`clients/iOS/`)
Native Swift app (Xcode project) targeting Safari's WebAuthn support.

## Key Files

| File | Purpose |
|------|---------|
| `backend/template.yaml` | SAM template — all Lambda, Cognito, API Gateway, Aurora, and IAM resources |
| `backend/lambda-functions/JavaWebAuthnLib/pom.xml` | Java 17 Maven build; depends on `com.yubico:webauthn-server-core` |
| `backend/lambda-functions/FIDO2KitAPI/index.js` | Main API Lambda — REST handlers for credentials, PIN, recovery |
| `clients/web/react/src/` | React app source |
| `backend/Database.md` | Full SQL schema reference |

## Tech Stack Notes

- **Java Lambda runtime**: Java 17 (updated in `pom.xml`); verify `template.yaml` `Runtime` fields match
- **Node.js Lambda runtime**: Node 20 (check `template.yaml` `Runtime` values — may still reference older versions)
- **AWS SDK**: Lambda functions use AWS SDK v3; any new code should use v3 (`@aws-sdk/*` packages), not the v2 monolith
- **Yubico libraries**: `webauthn-server-core` 1.12.0-RC1 and `webauthn-server-attestation` — these handle all WebAuthn ceremony validation on the Java side
