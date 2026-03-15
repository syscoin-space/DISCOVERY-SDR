import { AppSidebar } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { PushPermissionBanner } from "@/components/shared/PushPermissionBanner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <PushPermissionBanner />
        <main className="flex flex-1 flex-col overflow-hidden pb-16 lg:pb-0">
          {children}
        </main>
      </div>
      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}
