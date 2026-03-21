"use client";

import React from "react";
import { 
  Users, 
  Globe, 
  TrendingUp, 
  DollarSign, 
  Activity,
  ArrowUpRight 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboardPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">SaaS Overview</h1>
        <p className="text-muted-foreground">
          Visão global da saúde e crescimento do Retentio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tenants" value="12" icon={Globe} trend="+2 este mês" />
        <StatCard title="Usuários Ativos" value="45" icon={Users} trend="+5 hoje" />
        <StatCard title="MRR Est." value="R$ 5.880" icon={DollarSign} trend="+12%" />
        <StatCard title="Saúde do Sistema" value="99.9%" icon={Activity} trend="Estável" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle>Tenants Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 font-bold text-xs">
                      T{i}
                    </div>
                    <div>
                      <p className="text-sm font-bold">Tenant {i} Enterprise</p>
                      <p className="text-[10px] text-zinc-500">Criado há {i} dias</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-none">Ativo</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend }: any) {
  return (
    <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
          </div>
          <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600">
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-green-500">
          <ArrowUpRight className="w-3 h-3" />
          {trend}
        </div>
      </CardContent>
    </Card>
  );
}

function Badge({ children, className }: any) {
  return (
    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${className}`}>
      {children}
    </span>
  );
}
