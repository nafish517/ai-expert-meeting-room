export type Workspace = {
  id: string;
  name: string;
  subtitle: string;
};

export const WORKSPACES: Workspace[] = [
  {
    id: "startup-idea",
    name: "Startup Idea",
    subtitle: "Product discovery room",
  },
  {
    id: "q3-strategy",
    name: "Q3 Strategy",
    subtitle: "Planning & priorities",
  },
  {
    id: "legal-review",
    name: "Legal Review",
    subtitle: "Contracts & risk",
  },
];

export const WORKSPACE_STORAGE_KEY = "thinkroom-active-workspace";
export const SIDEBAR_COLLAPSED_KEY = "thinkroom-sidebar-collapsed";
