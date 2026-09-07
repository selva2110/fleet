import { CrudAction, PagePermission, RoleForm } from "./types";
import { AuthUtils } from "./utils";

export class AuthConfig {
  static readonly CRUD_ACTIONS: { key: CrudAction; labelKey: string }[] = [
    { key: "create", labelKey: "common.create" },
    { key: "read", labelKey: "common.read" },
    { key: "update", labelKey: "common.update" },
    { key: "delete", labelKey: "common.delete" },
  ];

  static readonly PERMISSION_PAGES: { key: string; labelKey: string }[] = [
    { key: "dashboard", labelKey: "nav.dashboard" },
    { key: "command-center", labelKey: "nav.commandcenter" },
    { key: "planner", labelKey: "nav.routeplanner" },
    { key: "participants", labelKey: "common.participants" },
    { key: "events", labelKey: "e.events" },
    { key: "meal-delivery", labelKey: "e.mealdelivery" },
    { key: "catalog", labelKey: "e.catalogtitle" },
    { key: "trips", labelKey: "common.trips" },
    { key: "vehicles", labelKey: "common.vehicles" },
    { key: "drivers", labelKey: "common.drivers" },
    { key: "rules", labelKey: "nav.ruleengine" },
    { key: "users", labelKey: "nav.usermanagement" },
  ];

  static readonly emptyPagePermission: PagePermission = {
    create: false,
    read: false,
    update: false,
    delete: false,
  };
}
