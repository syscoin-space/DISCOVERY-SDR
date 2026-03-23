import { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  footer?: ReactNode;
}

export function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
  className,
  headerClassName,
  contentClassName,
  footer,
}: SettingsSectionProps) {
  return (
    <Card className={cn("border border-border bg-surface shadow-sm overflow-hidden", className)}>
      <CardHeader className={cn("border-b border-border bg-surface/50", headerClassName)}>
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className={cn("p-6", contentClassName)}>
        {children}
      </CardContent>
      {footer && (
        <CardFooter className="border-t border-border bg-surface-raised/30 px-6 py-3">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}
