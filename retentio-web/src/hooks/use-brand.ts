"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";

export interface BrandConfig {
  id: string;
  app_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  icon_192_url: string | null;
  icon_512_url: string | null;
  color_accent: string;
  color_navy: string;
  color_green: string;
  updated_at: string;
}

const BRAND_KEY = "brand";

export function useBrand(identifier?: string, enabled: boolean = true) {
  return useQuery<BrandConfig>({
    queryKey: [BRAND_KEY, identifier],
    queryFn: async () => {
      // Identifier serves as either slug or tenant_id backward compatible
      // We pass it as 'slug' if it doesn't look like a standard UUID,
      // but the API will rely on the Bearer token anyway if it's logged in.
      const params = identifier ? { slug: identifier } : {};
      const { data } = await api.get<BrandConfig>("/brand", { params });
      return data;
    },
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useUpdateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Pick<BrandConfig, "app_name" | "color_accent" | "color_navy" | "color_green">>) => {
      const { data } = await api.patch<BrandConfig>("/brand", payload);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData([BRAND_KEY], data);
      qc.setQueryData([BRAND_KEY, undefined], data);
      qc.invalidateQueries({ queryKey: [BRAND_KEY], exact: false });
    },
  });
}

export function useUploadBrandImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ field, file }: { field: "logo" | "favicon" | "icon_192" | "icon_512"; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post<BrandConfig>(`/brand/upload/${field}`, formData);
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData([BRAND_KEY], data);
      qc.setQueryData([BRAND_KEY, undefined], data);
      qc.invalidateQueries({ queryKey: [BRAND_KEY], exact: false });
    },
  });
}

export function useResetBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<BrandConfig>("/brand/reset");
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData([BRAND_KEY], data);
    },
  });
}
