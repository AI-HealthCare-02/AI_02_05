import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { OCRStatusResponse, ParsedDrug } from "@/types";

export function useUpload() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post<{ ocr_id: string; status: string }>(
        "/upload/prescription",
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return data;
    },
  });
}

export function useOCRStatus(ocrId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["ocr", ocrId],
    queryFn: async () => {
      const { data } = await api.get<OCRStatusResponse>(`/ocr/${ocrId}/status`);
      return data;
    },
    enabled: !!ocrId && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "done" || status === "failed") return false;
      return 2500;
    },
  });
}

export function useConfirm(ocrId: string) {
  return useMutation({
    mutationFn: async ({ drugs, disease_name }: { drugs: ParsedDrug[]; disease_name?: string }) => {
      const { data } = await api.post(`/ocr/${ocrId}/confirm`, { drugs, disease_name });
      return data;
    },
  });
}
