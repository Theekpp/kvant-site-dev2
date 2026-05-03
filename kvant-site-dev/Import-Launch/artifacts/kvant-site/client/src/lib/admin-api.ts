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

export function useGetUserDetails(id: number | null) {
  return useQuery({
    queryKey: ["/api/admin/users", id, "details"],
    queryFn: () => adminFetch(`/api/admin/users/${id}/details`),
    enabled: id !== null,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/actions"] });
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/actions"] });
    },
  });
}

export function useMarkSubscriptionPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => adminFetch(`/api/admin/subscriptions/${id}/paid`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/actions"] });
    },
  });
}

export function useMarkSubPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => adminFetch(`/api/admin/subscriptions/${id}/paid`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/actions"] });
    },
  });
}

export function useAdjustSubscriptionLessons() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, delta, reason }: { id: number; delta: number; reason?: string }) =>
      adminFetch(`/api/admin/subscriptions/${id}/adjust`, { method: "PATCH", body: { delta, reason } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/actions"] });
    },
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      adminFetch(`/api/admin/subscriptions/${id}/cancel`, { method: "PATCH", body: { reason } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/actions"] });
    },
  });
}

export function useRefundSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => adminFetch(`/api/admin/subscriptions/${id}/refund`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/actions"] });
    },
  });
}

export function useGetSchedule() {
  return useQuery({ queryKey: ["/api/admin/schedule"], queryFn: () => adminFetch("/api/admin/schedule") });
}

export function useCreateScheduleSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data }: { data: any }) => adminFetch("/api/admin/schedule", { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/schedule"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/actions"] });
    },
  });
}

export function useDeleteScheduleSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => adminFetch(`/api/admin/schedule/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/schedule"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/actions"] });
    },
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
      qc.invalidateQueries({ queryKey: ["/api/admin/actions"] });
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
      qc.invalidateQueries({ queryKey: ["/api/admin/actions"] });
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
      qc.invalidateQueries({ queryKey: ["/api/admin/actions"] });
    },
  });
}

export function useGetAdminActions(page = 1, limit = 50) {
  return useQuery({
    queryKey: ["/api/admin/actions", page, limit],
    queryFn: () => adminFetch(`/api/admin/actions?page=${page}&limit=${limit}`),
  });
}

export function useGetAnalytics() {
  return useQuery({
    queryKey: ["/api/admin/analytics"],
    queryFn: () => adminFetch("/api/admin/analytics"),
    staleTime: 60_000,
  });
}

export function useGetStudentProfile(userId: number | null) {
  return useQuery({
    queryKey: ["/api/admin/users", userId, "profile"],
    queryFn: () => adminFetch(`/api/admin/users/${userId}/profile`),
    enabled: userId !== null,
  });
}

export function useUpdateStudentProfile(userId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adminFetch(`/api/admin/users/${userId}/profile`, { method: "PUT", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users", userId, "profile"] }),
  });
}

// ── Homework ──────────────────────────────────────────────────────────────────
export function useGetStudentHomework(userId: number | null) {
  return useQuery({
    queryKey: ["/api/admin/users", userId, "homework"],
    queryFn: () => adminFetch(`/api/admin/users/${userId}/homework`),
    enabled: userId !== null,
  });
}

export function useCreateHomework(userId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adminFetch(`/api/admin/users/${userId}/homework`, { method: "POST", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users", userId, "homework"] }),
  });
}

export function useUpdateHomework(userId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminFetch(`/api/admin/homework/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users", userId, "homework"] }),
  });
}

export function useDeleteHomework(userId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => adminFetch(`/api/admin/homework/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users", userId, "homework"] }),
  });
}

// ── Lesson Journal ────────────────────────────────────────────────────────────
export function useGetStudentJournal(userId: number | null) {
  return useQuery({
    queryKey: ["/api/admin/users", userId, "journal"],
    queryFn: () => adminFetch(`/api/admin/users/${userId}/journal`),
    enabled: userId !== null,
  });
}

export function useCreateJournalEntry(userId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adminFetch(`/api/admin/users/${userId}/journal`, { method: "POST", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users", userId, "journal"] }),
  });
}

export function useDeleteJournalEntry(userId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => adminFetch(`/api/admin/journal/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users", userId, "journal"] }),
  });
}

// ── Materials ─────────────────────────────────────────────────────────────────
export function useGetStudentMaterials(userId: number | null) {
  return useQuery({
    queryKey: ["/api/admin/users", userId, "materials"],
    queryFn: () => adminFetch(`/api/admin/users/${userId}/materials`),
    enabled: userId !== null,
  });
}

export function useCreateMaterial(userId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adminFetch(`/api/admin/users/${userId}/materials`, { method: "POST", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users", userId, "materials"] }),
  });
}

export function useDeleteMaterial(userId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => adminFetch(`/api/admin/materials/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users", userId, "materials"] }),
  });
}

// ── Roadmap ───────────────────────────────────────────────────────────────────
export function useGetStudentRoadmap(userId: number | null) {
  return useQuery({
    queryKey: ["/api/admin/users", userId, "roadmap"],
    queryFn: () => adminFetch(`/api/admin/users/${userId}/roadmap`),
    enabled: userId !== null,
  });
}

export function useCreateRoadmapTopic(userId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adminFetch(`/api/admin/users/${userId}/roadmap`, { method: "POST", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users", userId, "roadmap"] }),
  });
}

export function useUpdateRoadmapTopic(userId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminFetch(`/api/admin/roadmap/${id}`, { method: "PATCH", body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users", userId, "roadmap"] }),
  });
}

export function useDeleteRoadmapTopic(userId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number }) => adminFetch(`/api/admin/roadmap/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users", userId, "roadmap"] }),
  });
}
