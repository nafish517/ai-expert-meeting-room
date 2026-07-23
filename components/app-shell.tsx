"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar, MobileNavTrigger } from "@/components/app-sidebar";
import { CustomCursor } from "@/components/custom-cursor";
import { ThemeProvider, useTheme } from "@/components/theme-provider";

function ShellFrame({ children }: { children: ReactNode }) {
  const { isDarkMode } = useTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLanding = pathname === "/";

  if (isLanding) {
    return (
      <div className={`landing-shell ${isDarkMode ? "theme-dark" : ""}`}>
        <CustomCursor />
        {children}
      </div>
    );
  }

  return (
    <div className={`app-frame ${isDarkMode ? "theme-dark" : ""}`}>
      <CustomCursor />
      <AppSidebar
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />
      <div className="app-main">
        <div className="app-mobile-bar">
          <MobileNavTrigger onOpen={() => setMobileOpen(true)} />
          <div className="app-mobile-brand">
            <span aria-hidden="true">TR</span>
            <strong>ThinkRoom</strong>
          </div>
        </div>
        <div className="app-main-content">{children}</div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ShellFrame>{children}</ShellFrame>
    </ThemeProvider>
  );
}
