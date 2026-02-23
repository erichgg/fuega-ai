"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, Shield, Bell, Lock, Users } from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";

const SETTINGS_NAV = [
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/account", label: "Account", icon: Lock },
  { href: "/settings/privacy", label: "Privacy", icon: Shield },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/referrals", label: "Referrals", icon: Users },
] as const;

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-smoke">
          <span className="text-lava-hot font-bold">$ </span>
          loading settings...
          <span className="inline-block w-2 h-4 bg-lava-hot ml-1 cursor-blink align-middle" />
        </p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="py-4 sm:py-6 lg:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          <span className="text-lava-hot font-bold">$ </span>
          settings
        </h1>
        <p className="text-xs text-ash mt-1">
          Customize your <span className="text-flame-400 font-semibold">fuega</span> experience
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar nav */}
        <nav className="w-full lg:w-56 shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {SETTINGS_NAV.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? "text-flame-400 bg-flame-400/10 border border-flame-400/20"
                      : "text-ash-400 hover:text-ash-200 hover:bg-ash-800/50 border border-transparent"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
