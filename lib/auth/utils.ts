import { AuthConfig } from "./config";
import { RoleForm, RolePermissions } from "./types";

export class AuthUtils {
  static emptyForm(): RoleForm {
    return {
      name: "",
      description: "",
      status: true,
      permissions: AuthUtils.buildEmptyPermissions(),
    };
  }

  static buildEmptyPermissions(): RolePermissions {
    return AuthConfig.PERMISSION_PAGES.reduce<RolePermissions>((acc, page) => {
      acc[page.key] = { ...AuthConfig.emptyPagePermission };
      return acc;
    }, {});
  }
}
