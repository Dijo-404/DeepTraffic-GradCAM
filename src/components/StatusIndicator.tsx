import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "low" | "high" | "analyzing";
  className?: string;
}

export const StatusIndicator = ({ status, className }: StatusIndicatorProps) => {
  const statusConfig = {
    low: {
      label: "Low Traffic",
      color: "bg-traffic-low",
      textColor: "text-traffic-low",
      pulse: "status-low",
    },
    high: {
      label: "High Traffic",
      color: "bg-traffic-high",
      textColor: "text-traffic-high",
      pulse: "status-high",
    },
    analyzing: {
      label: "Analyzing...",
      color: "bg-primary",
      textColor: "text-primary",
      pulse: "",
    },
  };

  const config = statusConfig[status];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("status-indicator", config.pulse)}>
        <div className={cn("w-3 h-3 rounded-full", config.color)} />
      </div>
      <span className={cn("text-lg font-semibold uppercase tracking-wider", config.textColor)}>
        {config.label}
      </span>
    </div>
  );
};
