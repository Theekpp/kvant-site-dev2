import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";

// ── Queries ───────────────────────────────────────────────────────────────
export function useGetUsers() {
  return useQuery<any[]>({ queryKey: ["/api/users"] });
}

export function useGetBookings() {
  return useQuery<any[]>({ queryKey: ["/api/bookings"] });
}

export function useGetSubscriptions() {
  return useQuery<any[]>({ queryKey: ["/api/subscriptions"] });
}

export function useGetSchedule() {
  return useQuery<any[]>({ queryKey: ["/api/schedule"] });
}

// ── Booking mutations ─────────────────────────────────────────────────────
export function useUpdateBookingStatus() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status: string } }) =>
      apiRequest("PATCH", `/api/bookings/${id}/status`, data).then(r => r.json()),
  });
}

export function useMarkBookingPaid() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { isPaid: boolean } }) =>
      apiRequest("PATCH", `/api/bookings/${id}/paid`, data).then(r => r.json()),
  });
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: ({ data }: { data: any }) =>
      apiRequest("POST", "/api/bookings", data).then(r => r.json()),
  });
}

// ── User mutations ────────────────────────────────────────────────────────
export function useCreateUser() {
  return useMutation({
    mutationFn: ({ data }: { data: any }) =>
      apiRequest("POST", "/api/users", data).then(r => r.json()),
  });
}

export function useNotifyUser() {
  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: { message: string } }) =>
      apiRequest("POST", `/api/users/${userId}/notify`, data).then(r => r.json()),
  });
}

// ── Subscription mutations ────────────────────────────────────────────────
export function useMarkSubscriptionPaid() {
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      apiRequest("PATCH", `/api/subscriptions/${id}/paid`, {}).then(r => r.json()),
  });
}

export function useCreateSubscription() {
  return useMutation({
    mutationFn: ({ data }: { data: any }) =>
      apiRequest("POST", "/api/subscriptions", data).then(r => r.json()),
  });
}

// ── Schedule mutations ────────────────────────────────────────────────────
export function useCreateScheduleSlot() {
  return useMutation({
    mutationFn: ({ data }: { data: any }) =>
      apiRequest("POST", "/api/schedule", data).then(r => r.json()),
  });
}

export function useDeleteScheduleSlot() {
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      apiRequest("DELETE", `/api/schedule/${id}`).then(r => r.json()),
  });
}
