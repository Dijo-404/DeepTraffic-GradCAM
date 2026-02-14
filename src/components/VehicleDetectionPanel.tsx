import { Car, Truck, Bus, Bike, BarChart2, Eye, EyeOff, Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { VehicleClass, Detection } from "@/hooks/useYOLODetection";

interface VehicleDetectionPanelProps {
  detections: Detection[];
  vehicleCount: number;
  countByClass: Record<VehicleClass, number>;
  fps: number;
  lastInferenceTime: number;
  isDetecting: boolean;
  showBoundingBoxes: boolean;
  onToggleBoundingBoxes: (enabled: boolean) => void;
  confidenceThreshold: number;
  onConfidenceChange: (value: number) => void;
  hybridResult?: {
    status: "low" | "high";
    confidence: number;
    source: "yolo" | "classifier" | "hybrid";
  };
  activeTrackIds?: number[];
  className?: string;
}

const vehicleIcons: Record<VehicleClass, React.ElementType> = {
  car: Car,
  truck: Truck,
  bus: Bus,
  motorcycle: Bike,
  bicycle: Bike,
};

const vehicleColors: Record<VehicleClass, string> = {
  car: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  truck: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  bus: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  motorcycle: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  bicycle: "bg-green-500/20 text-green-400 border-green-500/30",
};

/**
 * Vehicle Detection Panel
 * 
 * Displays YOLO detection results including:
 * - Total vehicle count with breakdown by class
 * - Detection FPS and inference time
 * - Bounding box toggle
 * - Confidence threshold slider
 * - Hybrid density result (YOLO + MobileNetV2)
 */
export const VehicleDetectionPanel = ({
  vehicleCount,
  countByClass,
  fps,
  lastInferenceTime,
  isDetecting,
  showBoundingBoxes,
  onToggleBoundingBoxes,
  confidenceThreshold,
  onConfidenceChange,
  hybridResult,
  activeTrackIds = [],
  className,
}: VehicleDetectionPanelProps) => {
  return (
    <div className={cn("glass-card p-5", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold flex items-center gap-2">
            YOLO Detection
            <Badge variant="outline" className="text-xs font-mono">
              YOLOv8 + BoT-SORT
            </Badge>
          </h3>
          <p className="text-sm text-muted-foreground">Real-time vehicle counting</p>
        </div>
        {isDetecting && (
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        )}
      </div>

      {/* Total Count Display */}
      <div className="bg-secondary/50 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Vehicles Detected</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{fps} FPS</span>
            <span>•</span>
            <span>{lastInferenceTime}ms</span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold font-mono text-foreground">
            {vehicleCount}
          </span>
          <span className="text-muted-foreground">vehicles</span>
        </div>
        {activeTrackIds.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">Active Tracks</span>
            <span className="text-sm font-mono font-bold text-purple-400">
              {activeTrackIds.length}
            </span>
          </div>
        )}
      </div>

      {/* Count by Class */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {(Object.entries(countByClass) as [VehicleClass, number][]).map(([cls, count]) => {
          const Icon = vehicleIcons[cls];
          return (
            <div
              key={cls}
              className={cn(
                "flex flex-col items-center p-2 rounded-lg border",
                vehicleColors[cls],
                count > 0 ? "opacity-100" : "opacity-50"
              )}
            >
              <Icon className="w-4 h-4 mb-1" />
              <span className="text-lg font-mono font-bold">{count}</span>
              <span className="text-[10px] uppercase tracking-wide">{cls}</span>
            </div>
          );
        })}
      </div>

      {/* Hybrid Density Result */}
      {hybridResult && (
        <div className="bg-secondary/50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-2">
              Hybrid Density
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  hybridResult.source === "hybrid" && "border-primary text-primary",
                  hybridResult.source === "yolo" && "border-blue-400 text-blue-400",
                  hybridResult.source === "classifier" && "border-purple-400 text-purple-400"
                )}
              >
                {hybridResult.source.toUpperCase()}
              </Badge>
            </span>
            <span className="text-sm font-mono">{hybridResult.confidence}%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              hybridResult.status === "high" ? "bg-traffic-high" : "bg-traffic-low"
            )} />
            <span className={cn(
              "text-lg font-bold uppercase",
              hybridResult.status === "high" ? "text-traffic-high" : "text-traffic-low"
            )}>
              {hybridResult.status} Traffic
            </span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-4 pt-4 border-t border-border/50">
        {/* Bounding Box Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBoundingBoxes ? (
              <Eye className="w-4 h-4 text-primary" />
            ) : (
              <EyeOff className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm">Show Bounding Boxes</span>
          </div>
          <Switch
            checked={showBoundingBoxes}
            onCheckedChange={onToggleBoundingBoxes}
          />
        </div>

        {/* Confidence Threshold */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Confidence Threshold</span>
            </div>
            <span className="text-sm font-mono text-primary">
              {(confidenceThreshold * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            value={[confidenceThreshold * 100]}
            onValueChange={([v]) => onConfidenceChange(v / 100)}
            min={30}
            max={90}
            step={5}
            className="w-full"
          />
        </div>
      </div>

      {/* Architecture Note */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          <strong>Hybrid Architecture:</strong> YOLO provides precise vehicle counts with
          BoT-SORT multi-object tracking, while MobileNetV2 handles density classification.
        </p>
      </div>
    </div>
  );
};
