"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BugIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader({ user, profile }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* The wordmark must be a single flex item — as bare text nodes,
            "Bug" and "Hunt" each became flex children and gap-2 pushed a
            space between them. */}
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BugIcon className="size-4" />
          </span>
          <span>
            Bug<span className="text-primary">Hunt</span>
          </span>
        </Link>

        {user ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/challenges">Challenges</Link>}
            />
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/dashboard">Dashboard</Link>}
            />
            {profile?.role === "admin" && (
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href="/admin">Admin</Link>}
              />
            )}
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar ?? undefined} alt={profile?.name ?? user.email} />
                  <AvatarFallback>
                    {(profile?.name ?? user.email ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="opacity-100">
                  {profile?.name ?? user.email}
                  {profile?.role === "admin" && (
                    <span className="ml-2 text-xs text-muted-foreground">admin</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Signed-out visitors land on the marketing page, so they need
                an explicit route into the list. */}
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/challenges">Challenges</Link>}
            />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/login">Log in</Link>}
            />
            <Button size="sm" nativeButton={false} render={<Link href="/signup">Sign up</Link>} />
          </div>
        )}
      </div>
    </header>
  );
}
