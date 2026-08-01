import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Route-level gate. RLS is still the real boundary — this just avoids
// rendering an admin UI that would fail every write.
export default async function AdminLayout({ children }) {
  const { user, profile } = await getCurrentUser();

  if (!user) redirect("/login");
  if (profile?.role !== "admin") redirect("/");

  return children;
}
