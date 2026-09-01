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
}

export interface Role {
  createdAt: string;
  description: string;
  id: number;
  name: string;
  status: boolean;
  updatedAt: string;
}
