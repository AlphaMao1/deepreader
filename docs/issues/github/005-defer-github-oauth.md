## Parent

PRD: M1 Sync Continuation - https://github.com/AlphaMao1/deepreader/issues/1

## What to build

Defer GitHub OAuth from the accepted M1 login path until a real desktop callback/deep-link flow exists. Email/password remains the supported M1 login path.

## Acceptance criteria

- [x] GitHub login is hidden, disabled, or clearly marked experimental.
- [x] M1 docs say email/password is the supported login path.
- [x] The UI does not imply GitHub OAuth is complete.
- [x] Any remaining GitHub OAuth code is isolated so it does not block M1.

## Blocked by

None - can start immediately.
