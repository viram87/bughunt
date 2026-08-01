// See app/login/layout.js — same reason: the page is a Client Component,
// so its metadata has to live in a layout.
export const metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
};

export default function SignupLayout({ children }) {
  return children;
}
