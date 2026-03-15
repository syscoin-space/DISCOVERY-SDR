import { AppSidebar } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { BrandProvider } from "@/components/shared/BrandProvider";
import { ToastProvider } from "@/components/shared/Toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
    <div className="flex h-screen overflow-hidden">
      <BrandProvider />
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <MobileHeader />
        {/* pt-[calc(56px+env(safe-area-inset-top))] for mobile header, pb-[calc(56px+env(safe-area-inset-bottom))] for bottom nav */}
        <main className="flex flex-1 flex-col overflow-hidden pt-[calc(3.5rem+env(safe-area-inset-top,0px))] pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] lg:pt-0 lg:pb-0">
          {children}
        </main>
      </div>
      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
    </ToastProvider>
  );
}
