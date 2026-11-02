import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { isAxiosError } from "axios";
import { usersApi } from "@/services/usersApi";
import type { UserAccess, UserCreate } from "@/models/user";

const errorDetail = (err: unknown, fallback: string) => {
  const detail = isAxiosError(err) ? err.response?.data?.detail : undefined;
  return typeof detail === "string" ? detail : fallback;
};

export const useUsers = () =>
  useQuery({
    queryKey: ["users"],
    queryFn: usersApi.getUsers,
  });

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UserCreate) => usersApi.createUser(body),
    onSuccess: (user) => {
      message.success(`Created ${user.email}`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => message.error(errorDetail(err, "Could not create user.")),
  });
};

export const useUpdateAccess = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UserAccess }) =>
      usersApi.updateAccess(id, body),
    onSuccess: () => {
      message.success("Access updated");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => message.error(errorDetail(err, "Could not update access.")),
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      message.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => message.error(errorDetail(err, "Could not delete user.")),
  });
};
