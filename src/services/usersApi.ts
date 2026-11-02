import api from "./api";
import type { AppUser, Me, UserAccess, UserCreate } from "@/models/user";

export const usersApi = {
  getMe: () => api.get<Me>("/me").then((r) => r.data),

  getUsers: () => api.get<AppUser[]>("/users").then((r) => r.data),

  createUser: (body: UserCreate) =>
    api.post<AppUser>("/users", body).then((r) => r.data),

  updateAccess: (id: string, body: UserAccess) =>
    api.put<UserAccess>(`/users/${id}`, body).then((r) => r.data),

  deleteUser: (id: string) => api.delete(`/users/${id}`).then(() => undefined),
};
