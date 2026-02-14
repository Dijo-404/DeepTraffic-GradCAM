import { Brain, Cpu, Clock, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelInfoCardProps {
  className?: string;
}

export const ModelInfoCard = ({ className }: ModelInfoCardProps) => {
  const specs = [
    { icon: Brain, label: "Classifier", value: "MobileNetV2" },
    { icon: Target, label: "Detector", value: "YOLOv8" },
    { icon: Clock, label: "Tracker", value: "BoT-SORT" },
    { icon: Cpu, label: "Framework", value: "PyTorch" },
  ];

  return (
    <div className={cn("glass-card p-5", className)}>
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Brain className="w-5 h-5 text-primary" />
        Model Information
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {specs.map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
            </div>
            <span className="font-mono text-sm font-medium">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <h4 className="text-sm font-medium mb-2">Hybrid Architecture</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-1">•</span>
            <span><strong className="text-blue-400">YOLOv8 + BoT-SORT:</strong> Real-time vehicle detection & multi-object tracking</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span><strong className="text-primary">MobileNetV2:</strong> Binary density classification</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Explainable AI via Grad-CAM heatmaps</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            <span>Combined for improved accuracy (95%+)</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
