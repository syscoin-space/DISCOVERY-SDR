import { AppSidebar } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { BrandProvider } from "@/components/shared/BrandProvider";
import { ToastProvider } from "@/components/shared/Toast";
import { OnboardingGuard } from "@/components/shared/OnboardingGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <OnboardingGuard>
        <div className="flex h-screen overflow-hidden text-zinc-900 dark:text-zinc-100 bg-white dark:bg-gray-950">
          <BrandProvider />
          {/* Desktop sidebar */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Mobile header */}
            <MobileHeader />
            <main className="flex flex-1 flex-col overflow-y-auto pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] lg:pt-0 lg:pb-0">
              {children}
            </main>
          </div>
          {/* Mobile bottom nav */}
          <BottomNav />
        </div>
      </OnboardingGuard>
    </ToastProvider>
  );
}
