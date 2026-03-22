"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth.store";
import { Loader2 } from "lucide-react";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const isAllowedRoute =
    pathname.startsWith("/billing") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/configuracoes/faturamento") ||
    pathname.includes("/configuracoes/perfil") ||
    pathname.startsWith("/settings/ai");

  useEffect(() => {
    // Redundância para garantir que o status seja lido mesmo se a store estiver hidratando
    const storedUser = typeof window !== "undefined" ? localStorage.getItem("retentio_user") : null;
    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    
    const onboardingStatus = user?.tenant?.onboarding_status || parsedUser?.tenant?.onboarding_status;
    const isPending = onboardingStatus !== "COMPLETED"; // Bloqueia TUDO que não for COMPLETED
    
    const isOnboardingRoute = pathname.startsWith("/onboarding");

    if (isPending && !isOnboardingRoute && !isAllowedRoute) {
      console.log("Redirecting to onboarding - Access Denied");
      router.push("/onboarding");
    } else if (!isPending && isOnboardingRoute) {
      router.push("/pipeline");
    } else {
      setLoading(false);
    }
  }, [user, pathname, router, isAllowedRoute]);

  const storedUser = typeof window !== "undefined" ? localStorage.getItem("retentio_user") : null;
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const currentStatus = user?.tenant?.onboarding_status || parsedUser?.tenant?.onboarding_status;
  const isPending = currentStatus !== "COMPLETED";

  if (loading || (isPending && !pathname.startsWith("/onboarding") && !isAllowedRoute)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
          <p className="text-sm font-medium text-gray-500">Preparando seu ambiente...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
