import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ScheduleItem, StatsResponse } from "@/types";

export function useSchedule(date: string) {
  return useQuery({
    queryKey: ["schedule", date],
    queryFn: async () => {
      const { data } = await api.get<ScheduleItem[]>("/schedule/", { params: { date } });
      return data;
    },
  });
}

export function useCheckSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scheduleId, checked }: { scheduleId: string; checked: boolean }) => {
      const { data } = await api.patch(`/schedule/${scheduleId}/check`, { checked });
      return data;
    },
    onMutate: async ({ scheduleId, checked }) => {
      await qc.cancelQueries({ queryKey: ["schedule"] });
      const prev = qc.getQueriesData({ queryKey: ["schedule"] });
      qc.setQueriesData({ queryKey: ["schedule"] }, (old: ScheduleItem[] | undefined) =>
        old?.map((s) => s.id === scheduleId ? { ...s, checked } : s) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      context?.prev.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useStats(start: string, end: string) {
  return useQuery({
    queryKey: ["stats", start, end],
    queryFn: async () => {
      const { data } = await api.get<StatsResponse>("/schedule/stats", { params: { start, end } });
      return data;
    },
  });
}
