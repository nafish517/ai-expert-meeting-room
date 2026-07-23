"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  Lightbulb,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  SIDEBAR_COLLAPSED_KEY,
  WORKSPACES,
  WORKSPACE_STORAGE_KEY,
  type Workspace,
} from "@/lib/workspaces";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  match?: (pathname: string) => boolean;
};

type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    id: "workspace",
    label: "Workspace & Meetings",
    items: [
      {
        href: "/room",
        label: "Active Meeting",
        icon: <MessageSquare aria-hidden="true" />,
        match: (pathname) =>
          pathname === "/room" || pathname.startsWith("/room/"),
      },
      {
        href: "/history",
        label: "Meeting History",
        icon: <History aria-hidden="true" />,
      },
      {
        href: "/insights",
        label: "Saved Insights",
        icon: <Lightbulb aria-hidden="true" />,
      },
      {
        href: "/analytics",
        label: "Data & Analytics",
        icon: <BarChart3 aria-hidden="true" />,
      },
    ],
  },
  {
    id: "collaboration",
    label: "Collaboration & Experts",
    items: [
      {
        href: "/experts",
        label: "AI Experts Library",
        icon: <Sparkles aria-hidden="true" />,
      },
      {
        href: "/participants",
        label: "Participants",
        icon: <Users aria-hidden="true" />,
      },
    ],
  },
  {
    id: "system",
    label: "System & Settings",
    items: [
      {
        href: "/settings",
        label: "Profile Settings",
        icon: <Settings aria-hidden="true" />,
      },
      {
        href: "/notifications",
        label: "Notifications",
        icon: <Bell aria-hidden="true" />,
      },
      {
        href: "/help",
        label: "Help & Docs",
        icon: <BookOpen aria-hidden="true" />,
      },
    ],
  },
];

function isItemActive(item: NavItem, pathname: string) {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppSidebar({
  mobileOpen,
  onMobileOpenChange,
}: {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const workspaceMenuId = useId();
  const profileMenuId = useId();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const [collapsed, setCollapsed] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace>(WORKSPACES[0]);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const savedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    const savedWorkspace = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    const timer = window.setTimeout(() => {
      if (savedCollapsed != null) setCollapsed(savedCollapsed === "1");
      if (savedWorkspace) {
        const found = WORKSPACES.find((item) => item.id === savedWorkspace);
        if (found) setWorkspace(found);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    onMobileOpenChange(false);
    setWorkspaceOpen(false);
    setProfileOpen(false);
  }, [pathname, onMobileOpenChange]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (workspaceRef.current && !workspaceRef.current.contains(target)) {
        setWorkspaceOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setWorkspaceOpen(false);
        setProfileOpen(false);
        onMobileOpenChange(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onMobileOpenChange]);

  const sections = useMemo(() => NAV_SECTIONS, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
    setWorkspaceOpen(false);
    setProfileOpen(false);
  }

  function selectWorkspace(next: Workspace) {
    setWorkspace(next);
    localStorage.setItem(WORKSPACE_STORAGE_KEY, next.id);
    setWorkspaceOpen(false);
  }

  function startNewMeeting() {
    const room = `${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 6)}`;
    onMobileOpenChange(false);
    router.push(`/room?room=${room}&fresh=1`);
  }

  return (
    <>
      <aside
        className={[
          "app-sidebar",
          collapsed ? "is-collapsed" : "",
          mobileOpen ? "is-mobile-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="ThinkRoom navigation"
      >
        <div className="app-sidebar-top">
          <div className="app-sidebar-brand-row">
            <Link href="/" className="app-sidebar-brand" title="ThinkRoom">
              <span className="app-sidebar-logo" aria-hidden="true">
                TR
              </span>
              <span className="app-sidebar-brand-copy">
                <strong>ThinkRoom</strong>
                <small>AI meeting workspace</small>
              </span>
            </Link>
            <button
              type="button"
              className="app-sidebar-collapse desktop-only"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? (
                <ChevronRight aria-hidden="true" />
              ) : (
                <ChevronLeft aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="app-sidebar-collapse mobile-only"
              onClick={() => onMobileOpenChange(false)}
              aria-label="Close navigation"
            >
              <X aria-hidden="true" />
            </button>
          </div>

          <div className="app-sidebar-workspace" ref={workspaceRef}>
            <button
              type="button"
              className="app-sidebar-workspace-trigger"
              aria-haspopup="listbox"
              aria-expanded={workspaceOpen}
              aria-controls={workspaceMenuId}
              onClick={() => {
                setWorkspaceOpen((value) => !value);
                setProfileOpen(false);
              }}
              title={workspace.name}
            >
              <span className="app-sidebar-workspace-copy">
                <small>Active workspace</small>
                <strong>{workspace.name}</strong>
              </span>
              <ChevronDown aria-hidden="true" className="workspace-chevron" />
            </button>
            {workspaceOpen && (
              <div
                id={workspaceMenuId}
                className="app-sidebar-menu-panel workspace-menu"
                role="listbox"
                aria-label="Workspaces"
              >
                {WORKSPACES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={item.id === workspace.id}
                    className={item.id === workspace.id ? "is-active" : ""}
                    onClick={() => selectWorkspace(item)}
                  >
                    <strong>{item.name}</strong>
                    <small>{item.subtitle}</small>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="app-sidebar-new-meeting"
            onClick={startNewMeeting}
            title="New Meeting / Room"
          >
            <Plus aria-hidden="true" />
            <span>New Meeting / Room</span>
          </button>
        </div>

        <nav className="app-sidebar-nav" aria-label="Primary">
          {sections.map((section) => (
            <div key={section.id} className="app-sidebar-section">
              <p className="app-sidebar-section-label">{section.label}</p>
              <ul>
                {section.items.map((item) => {
                  const active = isItemActive(item, pathname);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`app-sidebar-link ${active ? "is-active" : ""}`}
                        aria-current={active ? "page" : undefined}
                        title={item.label}
                        onClick={() => onMobileOpenChange(false)}
                      >
                        <span className="app-sidebar-link-icon">{item.icon}</span>
                        <span className="app-sidebar-link-label">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="app-sidebar-footer" ref={profileRef}>
          <button
            type="button"
            className="app-sidebar-profile"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            aria-controls={profileMenuId}
            onClick={() => {
              setProfileOpen((value) => !value);
              setWorkspaceOpen(false);
            }}
            title="You · Meeting host"
          >
            <span className="app-sidebar-avatar" aria-hidden="true">
              Y
            </span>
            <span className="app-sidebar-profile-copy">
              <strong>You</strong>
              <small>Meeting host</small>
            </span>
            <ChevronDown aria-hidden="true" className="profile-chevron" />
          </button>
          {profileOpen && (
            <div
              id={profileMenuId}
              className="app-sidebar-menu-panel profile-menu"
              role="menu"
            >
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => {
                  setProfileOpen(false);
                  onMobileOpenChange(false);
                }}
              >
                <Settings aria-hidden="true" />
                Profile settings
              </Link>
              <Link
                href="/notifications"
                role="menuitem"
                onClick={() => {
                  setProfileOpen(false);
                  onMobileOpenChange(false);
                }}
              >
                <Bell aria-hidden="true" />
                Notifications
              </Link>
              <button
                type="button"
                role="menuitem"
                className="danger"
                onClick={() => {
                  setProfileOpen(false);
                  router.push("/");
                }}
              >
                <LogOut aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="app-sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => onMobileOpenChange(false)}
        />
      )}
    </>
  );
}

export function MobileNavTrigger({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="app-mobile-nav-trigger"
      onClick={onOpen}
      aria-label="Open navigation"
    >
      <Menu aria-hidden="true" />
      <span>Menu</span>
    </button>
  );
}
