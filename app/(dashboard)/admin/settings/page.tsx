export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, DollarSign, MapPin, Shield } from "lucide-react";

export default async function AdminSettingsPage() {
  const configs = await prisma.platformConfig.findMany({ orderBy: { key: "asc" } });

  const CONFIG_META: Record<string, { label: string; description: string; icon: React.ElementType }> = {
    commission_rate: { label: "Commission Rate", description: "Total commission charged per booking", icon: DollarSign },
    platform_share: { label: "Platform Share", description: "Platform's portion of commission", icon: DollarSign },
    connection_fee: { label: "Connection Fee", description: "Fixed fee per booking (Rs)", icon: DollarSign },
    min_withdrawal: { label: "Min Withdrawal", description: "Minimum amount for wallet withdrawal", icon: Shield },
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground">Manage business rules and platform configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" /> Business Rules
          </CardTitle>
          <CardDescription>These values control platform behavior. Edit with care.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configs.map((config) => {
            const meta = CONFIG_META[config.key];
            const Icon = meta?.icon ?? Settings;
            const displayValue = config.key.includes("rate") || config.key.includes("share")
              ? `${(parseFloat(config.value) * 100).toFixed(0)}%`
              : `Rs ${config.value}`;
            return (
              <div key={config.key} className="flex items-center justify-between rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{meta?.label ?? config.key}</p>
                    <p className="text-xs text-muted-foreground">{meta?.description ?? config.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="font-mono text-base px-3">{displayValue}</Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commission Split Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Professional Earnings", pct: 90, color: "bg-brand-500" },
              { label: "Platform Revenue (5%)", pct: 5, color: "bg-blue-500" },
              { label: "Wallet Lock Fund (5%)", pct: 5, color: "bg-orange-400" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.pct}%</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            On every Rs 1,000 booking: Professional gets Rs 900, Platform earns Rs 50, Bonus fund locks Rs 50.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
