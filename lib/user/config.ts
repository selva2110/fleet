import { SortOption } from "@/components/data-view/data-view";
import { String } from "three/examples/jsm/transpiler/AST.js";

export class UsersConfig {
  static readonly roleMeta: Record<string, { label: string; cls: string }> = {
    ADMIN: { label: "user.roleAdmin", cls: "bg-primary/15 text-primary" },
    DISPATCHER: { label: "user.roleDispatcher", cls: "bg-success/20 text-success" },
  };
  static readonly ROLE_OPTIONS = Object.entries(this.roleMeta).map(([value, m]) => ({
    value: value as string,
    label: m.label,
  }));

  static readonly statusMeta: Record<"active" | "inactive", { label: string; cls: string }> = {
    active: { label: "common.active", cls: "bg-success/20 text-success" },
    inactive: { label: "common.inactive", cls: "bg-muted text-muted-foreground" },
  };
  static readonly STATUS_OPTIONS = [
    { value: "active", label: "common.active" },
    { value: "inactive", label: "common.inactive" },
  ];

  static readonly SORT_OPTIONS: SortOption[] = [
    { key: "name", label: "common.name" },
    { key: "email", label: "auth.email" },
    { key: "role", label: "user.role" },
  ];
}
