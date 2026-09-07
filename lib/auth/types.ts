export interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  roles: string[];
  tokenType: string;
  expiresIn: 0;
  username: string;
  roleIds: number[];
}

export interface ForgotPasswordRequestForm {
  identifier: string;
}

export interface OtpForm {
  code: string;
}

export interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export interface TokenCookies {
  accessToken: string;
  refreshToken?: string;
  role?: string;
  rememberToken: boolean;
  name?: string;
  roleId?: number;
}

export interface Role {
  createdAt: string;
  description: string;
  id: number;
  name: string;
  status: boolean;
  updatedAt: string;
}

export type CrudAction = "create" | "read" | "update" | "delete";

export type PagePermission = Record<CrudAction, boolean>;

export type RolePermissions = Record<string, PagePermission>;

export type RoleForm = {
  name: string;
  description: string;
  status: boolean;
  permissions: RolePermissions;
};
