import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Detection, VehicleClass } from "@/hooks/useYOLODetection";

interface DetectionOverlayProps {
  detections: Detection[];
  containerWidth: number;
  containerHeight: number;
  showLabels?: boolean;
  showConfidence?: boolean;
  className?: string;
}

const classColors: Record<VehicleClass, { border: string; bg: string; text: string }> = {
  car: { 
    border: "border-blue-400", 
    bg: "bg-blue-500/80", 
    text: "text-white" 
  },
  truck: { 
    border: "border-orange-400", 
    bg: "bg-orange-500/80", 
    text: "text-white" 
  },
  bus: { 
    border: "border-yellow-400", 
    bg: "bg-yellow-500/80", 
    text: "text-black" 
  },
  motorcycle: { 
    border: "border-purple-400", 
    bg: "bg-purple-500/80", 
    text: "text-white" 
  },
  bicycle: { 
    border: "border-green-400", 
    bg: "bg-green-500/80", 
    text: "text-white" 
  },
};

/**
 * Detection Overlay Component
 * 
 * Renders YOLO bounding boxes on top of the video feed.
 * Each detection includes:
 * - Colored bounding box (class-specific)
 * - Class label
 * - Confidence score
 * 
 * Optimizations:
 * - Memoized to prevent unnecessary re-renders
 * - Uses CSS transforms for GPU-accelerated positioning
 * - Minimal DOM elements for performance
 */
const DetectionOverlay = memo(({
  detections,
  containerWidth,
  containerHeight,
  showLabels = true,
  showConfidence = true,
  className,
}: DetectionOverlayProps) => {
  if (detections.length === 0) return null;

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {detections.map((detection) => {
        const { bbox, class: cls, confidence, id } = detection;
        const colors = classColors[cls];
        
        // Convert normalized coordinates to pixels
        const left = bbox.x * containerWidth;
        const top = bbox.y * containerHeight;
        const width = bbox.width * containerWidth;
        const height = bbox.height * containerHeight;

        return (
          <div
            key={id}
            className={cn(
              "absolute border-2 rounded-sm",
              colors.border,
              "transition-all duration-75"
            )}
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
            }}
          >
            {/* Label */}
            {showLabels && (
              <div 
                className={cn(
                  "absolute -top-5 left-0 px-1.5 py-0.5 rounded-sm text-[10px] font-medium uppercase tracking-wide whitespace-nowrap",
                  colors.bg,
                  colors.text
                )}
              >
                {cls}
                {showConfidence && (
                  <span className="ml-1 opacity-80">
                    {(confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            )}

            {/* Corner markers for style */}
            <div className={cn("absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2", colors.border)} />
            <div className={cn("absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2", colors.border)} />
            <div className={cn("absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2", colors.border)} />
            <div className={cn("absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2", colors.border)} />
          </div>
        );
      })}
    </div>
  );
});

DetectionOverlay.displayName = "DetectionOverlay";

export { DetectionOverlay };
