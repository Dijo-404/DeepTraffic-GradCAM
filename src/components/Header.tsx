import { Car, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  isConnected: boolean;
  className?: string;
}

export const Header = ({ isConnected, className }: HeaderProps) => {
  return (
    <header className={cn(
      "glass-card px-6 py-4 flex items-center justify-between",
      className
    )}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center glow-effect">
          <Car className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-gradient">TrafficSense</span>
            <span className="text-muted-foreground font-normal ml-2">AI</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-Time Traffic Density Estimation with Explainable AI
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">System Status</p>
          <div className="flex items-center gap-2 mt-1">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-traffic-low" />
                <span className="text-sm font-medium text-traffic-low">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Standby</span>
              </>
            )}
          </div>
        </div>
        
        <div className="h-10 w-px bg-border" />
        
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Time</p>
          <p className="text-sm font-mono font-medium mt-1">
            {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </header>
  );
};
