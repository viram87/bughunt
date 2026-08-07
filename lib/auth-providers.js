// Whether to offer "Continue with Google".
//
// Kept as a switch rather than removed, because Google sign-in has one
// external dependency that can break independently of this codebase: the OAuth
// consent screen's publishing status. While it was in Testing, only emails on
// the Test users list could authorise the app and everyone else hit a raw
// access-denied screen — so the button had to be hideable without a deploy.
//
// Email sign-up never depends on this and works regardless.
//
// Set NEXT_PUBLIC_GOOGLE_AUTH_ENABLED="true" to show the button.
export const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
