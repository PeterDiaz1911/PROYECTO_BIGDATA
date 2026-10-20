import type { LucideIcon } from "lucide-react";

export type Role =
  | "admin"
  | "operator"
  | "sorter"
  | "transport"
  | "courier"
  | "analyst"
  | "client";

export type NavigationItem = {
  key: string;
  label: string;
  icon: LucideIcon;
};

export type RoleDefinition = {
  id: Role;
  label: string;
  shortLabel: string;
  initials: string;
  description: string;
  navigation: NavigationItem[];
};
