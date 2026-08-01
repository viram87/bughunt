// page.js is a Client Component and so cannot export metadata — it lives
// here instead. Auth pages have nothing to rank for and shouldn't dilute
// the site's index.
export const metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }) {
  return children;
}
