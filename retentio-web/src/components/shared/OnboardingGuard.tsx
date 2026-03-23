"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth.store";
import { Loader2 } from "lucide-react";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Se ainda não carregou o cache/token, esperamos
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    
    // Se não tem token e não está em rota pública, o AuthGuard (que deve estar acima deste) cuida
    if (!token && !pathname.startsWith("/login") && !pathname.startsWith("/register")) {
      setLoading(false);
      return;
    }

    // Se tem token, mas o user ainda não foi carregado, esperamos a hidratação
    if (token && !user) {
      // Pequeno timeout ou esperar a store hidratar se necessário
      setLoading(true);
      return;
    }

    const onboardingStatus = user?.tenant?.onboarding_status;
    const isPending = onboardingStatus !== "COMPLETED";
    const isOnboardingRoute = pathname.startsWith("/onboarding");

    const isAllowedRoute =
      pathname.startsWith("/billing") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/configuracoes/faturamento") ||
      pathname.includes("/configuracoes/perfil") ||
      pathname.startsWith("/settings/ai");

    if (isPending && !isOnboardingRoute && !isAllowedRoute) {
      console.log("Redirecting to onboarding - Status:", onboardingStatus);
      router.push("/onboarding");
    } else if (!isPending && isOnboardingRoute) {
      router.push("/pipeline");
    } else {
      setLoading(false);
    }
  }, [user, pathname, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
          <p className="text-sm font-medium text-gray-500">Verificando conta...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
