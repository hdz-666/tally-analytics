export type Role = "admin" | "executive" | "company_exec";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  executive: "Executive",
  company_exec: "Company Exec",
};

export interface Me {
  id: string;
  email: string | null;
  role: Role;
  categories: string[];
}

export interface AppUser {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  role: Role | null;
  categories: string[];
}

export interface UserAccess {
  role: Role;
  categories: string[];
}

export interface UserCreate extends UserAccess {
  email: string;
  password: string;
}
