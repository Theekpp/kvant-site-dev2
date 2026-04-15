import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

async function adminFetch(path: string, options?: { method?: string; body?: any }) {
  const config: any = { method: options?.method || "GET" };
  if (options?.body !== undefined) config.data = options.body;
  const res = await api({ url: path, ...config });
  return res.data;
}

export function useGetUsers() {
  return useQuery({ queryKey: ["/api/admin/users"], queryFn: () => adminFetch("/api/admin/users") });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data }: { data: any }) => adminFetch("/api/admin/users", { method: "POST", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });
}

export function useGetBookings() {
  return useQuery({ queryKey: ["/api/admin/bookings"], queryFn: () => adminFetch("/api/admin/bookings") });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data }: { data: any }) => adminFetch("/api/admin/bookings", { method: "POST", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/bookings"] }),
  });
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminFetch(`/api/admin/bookings/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/bookings"] }),
  });
}

export function useMarkBookingPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminFetch(`/api/admin/bookings/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/bookings"] }),
  });
}

export function useNotifyUser() {
  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: { message: string } }) =>
      adminFetch("/api/admin/notify", { method: "POST", body: { userId, ...data } }),
  });
}

export function useGetSubscriptions() {
  return useQuery({ queryKey: ["/api/admin/subscriptions"], queryFn: () => adminFetch("/api/admin/subscriptions") });
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data }: { data: any }) => adminFetch("/api/admin/subscriptions", { method: "POST", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] }),
  });
}

export function useMarkSubscriptionPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => adminFetch(`/api/admin/subscriptions/${id}/paid`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] }),
  });
}

export function useRefundSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => adminFetch(`/api/admin/subscriptions/${id}/refund`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] }),
  });
}

export function useMarkSubPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => adminFetch(`/api/admin/subscriptions/${id}/paid`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] }),
  });
}

export function useGetSchedule() {
  return useQuery({ queryKey: ["/api/admin/schedule"], queryFn: () => adminFetch("/api/admin/schedule") });
}

export function useCreateScheduleSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data }: { data: any }) => adminFetch("/api/admin/schedule", { method: "POST", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/schedule"] }),
  });
}

export function useDeleteScheduleSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => adminFetch(`/api/admin/schedule/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/schedule"] }),
  });
}

export function useGetPublicReviews() {
  return useQuery({ queryKey: ["/api/reviews"], queryFn: () => adminFetch("/api/reviews") });
}

export function useGetAdminReviews() {
  return useQuery({ queryKey: ["/api/admin/reviews"], queryFn: () => adminFetch("/api/admin/reviews") });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data }: { data: any }) => adminFetch("/api/admin/reviews", { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      qc.invalidateQueries({ queryKey: ["/api/reviews"] });
    },
  });
}

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminFetch(`/api/admin/reviews/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      qc.invalidateQueries({ queryKey: ["/api/reviews"] });
    },
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => adminFetch(`/api/admin/reviews/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      qc.invalidateQueries({ queryKey: ["/api/reviews"] });
    },
  });
}
