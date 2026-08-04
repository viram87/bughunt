// Whether to offer "Continue with Google".
//
// Google will not let an OAuth consent screen be published without a homepage
// and privacy policy on a domain you can prove you own in Search Console, and
// a *.vercel.app subdomain can never satisfy that. Until a custom domain is in
// place the app is stuck in Testing status, where ONLY emails on the Test
// users list can authorise it — everyone else gets a raw access-denied screen.
//
// Email sign-up is unaffected and works for anyone, so hiding this button
// costs nothing today and avoids showing people a dead end.
//
// Flip NEXT_PUBLIC_GOOGLE_AUTH_ENABLED to "true" once the consent screen is
// published. No code change needed.
export const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
