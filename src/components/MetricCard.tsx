import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export const MetricCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  className 
}: MetricCardProps) => {
  const trendColors = {
    up: "text-traffic-high",
    down: "text-traffic-low",
    neutral: "text-muted-foreground",
  };

  return (
    <div className={cn(
      "glass-card p-5 flex flex-col gap-3 transition-all duration-300 hover:border-primary/30",
      className
    )}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
          {title}
        </span>
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-foreground font-mono">
          {value}
        </span>
        {subtitle && (
          <span className={cn(
            "text-sm font-medium",
            trend ? trendColors[trend] : "text-muted-foreground"
          )}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
