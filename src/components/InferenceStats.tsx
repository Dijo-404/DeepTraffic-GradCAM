import { Activity, Clock, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface InferenceStatsProps {
  frameCount: number;
  processedFrames: number;
  confidence: number;
  isProcessing: boolean;
  settings: {
    temporalWindow: number;
    confidenceThreshold: number;
    frameSkipRate: number;
  };
  className?: string;
}

/**
 * Inference Statistics Panel
 * 
 * Displays real-time inference metrics and optimization settings
 * to demonstrate the effectiveness of each optimization strategy.
 */
export const InferenceStats = ({
  frameCount,
  processedFrames,
  confidence,
  isProcessing,
  settings,
  className,
}: InferenceStatsProps) => {
  // Calculate processing efficiency
  const skipRatio = frameCount > 0 
    ? ((1 - processedFrames / frameCount) * 100).toFixed(1) 
    : "0.0";

  return (
    <div className={cn("glass-card p-5", className)}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Inference Statistics</h3>
          <p className="text-sm text-muted-foreground">Real-time optimization metrics</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Frame Processing Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Frames</span>
            </div>
            <p className="text-xl font-mono font-bold">{frameCount.toLocaleString()}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Processed</span>
            </div>
            <p className="text-xl font-mono font-bold">{processedFrames.toLocaleString()}</p>
          </div>
        </div>

        {/* Confidence Display */}
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Model Confidence</span>
            <span className={cn(
              "text-sm font-mono font-bold",
              confidence >= settings.confidenceThreshold * 100 ? "text-traffic-low" : "text-warning"
            )}>
              {confidence > 0 ? `${confidence.toFixed(1)}%` : "--.--%"}
            </span>
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                confidence >= settings.confidenceThreshold * 100 
                  ? "bg-traffic-low" 
                  : "bg-warning"
              )}
              style={{ width: `${confidence}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Threshold: {(settings.confidenceThreshold * 100).toFixed(0)}% 
            {confidence > 0 && confidence < settings.confidenceThreshold * 100 && 
              " (Below threshold - retaining previous state)"
            }
          </p>
        </div>

        {/* Optimization Settings */}
        <div className="pt-4 border-t border-border/50">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Active Optimizations
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Temporal Window</span>
              <span className="font-mono">{settings.temporalWindow} frames</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frame Skip Rate</span>
              <span className="font-mono">1/{settings.frameSkipRate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frames Skipped</span>
              <span className="font-mono text-traffic-low">{skipRatio}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Processing</span>
              <span className={cn(
                "font-mono",
                isProcessing ? "text-primary animate-pulse" : "text-muted-foreground"
              )}>
                {isProcessing ? "Active" : "Idle"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
