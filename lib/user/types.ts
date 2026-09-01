import { Role } from "../auth/types";

export interface User {
  id: string;
  name: string;
  email: string;
  address: string;
  roles: Role[];
  status: boolean;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bloodGroup: string;
  centerId: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

// Body accepted by the create/update user endpoints.
export interface UserInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bloodGroup: string;
  centerId: string;
  roleIds: number[];
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: boolean;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bloodGroup: string;
  centerId: string;
  roles: Role[];
  createdAt: string;
  updatedAt: string;
}

export type UserListResponse = UserResponse[];

// `password`/`confirmPassword` are required on create; on edit an empty
// password means "leave the current password unchanged" (see saveUser).
export type UserForm = Omit<User, "id" | "roles" | "createdAt" | "updatedAt"> & {
  password: string;
  confirmPassword: string;
  roleIds: number[];
};

export type UserCreateInput = UserInput;
