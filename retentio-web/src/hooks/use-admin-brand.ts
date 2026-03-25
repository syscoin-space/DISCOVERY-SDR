"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { BrandConfig } from "./use-brand";

const ADMIN_BRAND_KEY = "admin-brand";

export function useAdminBrand() {
  return useQuery<BrandConfig>({
    queryKey: [ADMIN_BRAND_KEY],
    queryFn: async () => {
      const { data } = await api.get<BrandConfig>("/admin/brand");
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdateAdminBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Pick<BrandConfig, "app_name" | "color_accent" | "color_navy" | "color_green">>) => {
      const { data } = await api.patch<BrandConfig>("/admin/brand", payload);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData([ADMIN_BRAND_KEY], data);
      // Also invalidate public brand queries so change reflects immediately
      qc.invalidateQueries({ queryKey: ["brand"] });
    },
  });
}

export function useUploadAdminBrandImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ field, file }: { field: "logo" | "favicon" | "icon_192" | "icon_512"; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post<BrandConfig>(`/admin/brand/upload/${field}`, formData);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData([ADMIN_BRAND_KEY], data);
      qc.invalidateQueries({ queryKey: ["brand"] });
    },
  });
}
