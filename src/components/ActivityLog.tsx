import { Activity, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: number;
  timestamp: string;
  type: "info" | "success" | "warning";
  message: string;
}

interface ActivityLogProps {
  className?: string;
}

export const ActivityLog = ({ className }: ActivityLogProps) => {
  const logs: LogEntry[] = [
    { id: 1, timestamp: "12:34:56", type: "success", message: "Model loaded successfully" },
    { id: 2, timestamp: "12:34:58", type: "info", message: "Grad-CAM initialized on layer4" },
    { id: 3, timestamp: "12:35:01", type: "info", message: "Awaiting video input..." },
    { id: 4, timestamp: "12:35:15", type: "success", message: "Video stream connected" },
    { id: 5, timestamp: "12:35:16", type: "warning", message: "High traffic detected - Confidence: 89.3%" },
  ];

  const typeConfig = {
    info: { icon: Info, color: "text-primary" },
    success: { icon: CheckCircle2, color: "text-traffic-low" },
    warning: { icon: AlertCircle, color: "text-traffic-high" },
  };

  return (
    <div className={cn("glass-card", className)}>
      <div className="p-4 border-b border-border/50 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <span className="font-semibold">Activity Log</span>
      </div>
      
      <div className="p-4 max-h-64 overflow-y-auto">
        <div className="space-y-3">
          {logs.map((log) => {
            const { icon: Icon, color } = typeConfig[log.type];
            return (
              <div key={log.id} className="flex items-start gap-3 text-sm">
                <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground">{log.message}</p>
                  <p className="text-xs text-muted-foreground font-mono">{log.timestamp}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
