"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  UserCircle, 
  Palette, 
  Users, 
  Zap, 
  CreditCard,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Geral", href: "/settings/account", icon: UserCircle },
  { name: "Marca", href: "/settings/brand", icon: Palette },
  { name: "Equipe", href: "/settings/team", icon: Users },
  { name: "IA & Providers", href: "/settings/ai", icon: Zap },
  { name: "Faturamento", href: "/settings/billing", icon: CreditCard },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-surface px-6 py-4">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Configurações da Conta</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sub Sidebar */}
        <aside className="w-64 border-r border-border bg-surface flex-shrink-0 hide-scrollbar overflow-y-auto hidden md:block">
          <nav className="flex flex-col gap-1 p-4">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent/10 text-accent font-semibold"
                      : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-accent" : "text-muted-foreground")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mx-auto max-w-4xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
