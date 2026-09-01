import "server-only";
import { apiDelete, apiGet, apiPost, apiPut, SERVICE_URLS } from "./http";
import {
  User,
  UserInput,
  UserListResponse,
  UserResponse,
} from "../user/types";

// Assumes auth-service exposes an admin user-management CRUD API alongside its
// existing /api/login and /api/register endpoints. Adjust this base path if
// the real endpoint differs.
const base = () => `${SERVICE_URLS.auth()}/api/users`;

function toUser(r: UserResponse): User {
  return {
    id: String(r.id),
    name: r.name,
    email: r.email,
    address: r.address ?? "",
    bloodGroup: r.bloodGroup ?? "",
    emergencyContactName: r.emergencyContactName ?? "",
    emergencyContactPhone: r.emergencyContactPhone ?? "",
    roles: r.roles ?? [],
    centerId: r.centerId ?? "",
    phone: r.phone ?? "",
    status: r.status ?? false,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function listUsers(): Promise<User[]> {
  const res = await apiGet<UserListResponse>(`${base()}?limit=200`)
  return res.map(toUser)
}

export async function createUser(input: UserInput): Promise<User> {
  return toUser(await apiPost<UserResponse>(base(), input));
}

export async function updateUser(
  id: string,
  input: Partial<UserInput>,
): Promise<User> {
  return toUser(await apiPut<UserResponse>(`${base()}/${id}`, input));
}

export async function deleteUser(id: string): Promise<void> {
  await apiDelete(`${base()}/${id}`);
}
