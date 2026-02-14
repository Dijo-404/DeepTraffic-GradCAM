import { useState, useEffect } from "react";
import { Car, TrendingUp, Clock, BarChart3 } from "lucide-react";
import { Header } from "@/components/Header";
import { VideoFeed } from "@/components/VideoFeed";
import { StatusIndicator } from "@/components/StatusIndicator";
import { MetricCard } from "@/components/MetricCard";
import { GradCAMPanel } from "@/components/GradCAMPanel";
import { ModelInfoCard } from "@/components/ModelInfoCard";
import { ActivityLog } from "@/components/ActivityLog";
import { InferenceStats } from "@/components/InferenceStats";
import { VehicleDetectionPanel } from "@/components/VehicleDetectionPanel";
import { useTrafficInference } from "@/hooks/useTrafficInference";
import { useYOLODetection } from "@/hooks/useYOLODetection";

/**
 * TrafficSense AI Dashboard - Main Page
 * 
 * This dashboard implements 6 key optimizations for real-time
 * traffic density estimation:
 * 
 * 1. Temporal Smoothing - Majority voting over last 10 frames
 * 2. Confidence Filtering - Threshold at 60% confidence
 * 3. ROI Optimization - Focus on bottom 65% of frame
 * 4. Conditional Grad-CAM - Only during HIGH traffic
 * 5. Frame Skipping - Process every 5th frame
 * 6. Pre-Inference Resize - 224×224 model input
 */
const Index = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState(60);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [yoloConfidence, setYoloConfidence] = useState(0.5);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [detectionCount, setDetectionCount] = useState(0);

  // Initialize traffic inference with optimizations
  const inference = useTrafficInference({
    temporalWindow: 10,      // Optimization #1: 10-frame sliding window
    confidenceThreshold: 0.6, // Optimization #2: 60% confidence threshold
    frameSkipRate: 5,         // Optimization #5: Process every 5th frame
  });

  // Initialize YOLO detection for vehicle counting (Hybrid approach)
  const yolo = useYOLODetection({
    confidenceThreshold: yoloConfidence,
    nmsEnabled: true,
    nmsThreshold: 0.45,
  });

  // Get hybrid density result combining YOLO + MobileNetV2
  const hybridResult = yolo.getHybridDensity(inference.status);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Track detections when HIGH traffic is detected
  useEffect(() => {
    if (inference.status === "high" && isConnected) {
      setDetectionCount(prev => prev + 1);
    }
  }, [inference.status, isConnected]);

  const handleVideoLoad = () => {
    setIsConnected(true);
    setSessionStart(new Date());
    inference.reset();
    yolo.reset();
  };

  const handleFrameProcess = () => {
    inference.processFrame();
    yolo.detectFrame(); // Run YOLO detection alongside classification
  };


  // Calculate session duration
  const getSessionTime = () => {
    if (!sessionStart || !isConnected) return "00:00";
    const diff = Math.floor((currentTime.getTime() - sessionStart.getTime()) / 1000);
    const mins = Math.floor(diff / 60).toString().padStart(2, "0");
    const secs = (diff % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // Calculate FPS (frames processed per second)
  const getFPS = () => {
    if (!sessionStart || !isConnected) return "0.0";
    const elapsed = (currentTime.getTime() - sessionStart.getTime()) / 1000;
    if (elapsed < 1) return "0.0";
    return (inference.frameCount / elapsed).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <Header isConnected={isConnected} />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Video Feed */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <VideoFeed 
              onVideoLoad={handleVideoLoad}
              onFrameProcess={handleFrameProcess}
              showHeatmap={heatmapEnabled}
              trafficStatus={hybridResult.status}
              detections={yolo.detections}
              showBoundingBoxes={showBoundingBoxes}
            />

            {/* Status Bar */}
            <div className="glass-card p-4 flex items-center justify-between">
              <StatusIndicator status={hybridResult.status} />
              
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Vehicles</p>
                  <p className="text-lg font-mono font-bold text-blue-400">
                    {yolo.vehicleCount}
                  </p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Hybrid Conf</p>
                  <p className="text-lg font-mono font-bold text-primary">
                    {hybridResult.confidence}%
                  </p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">FPS</p>
                  <p className="text-lg font-mono font-bold text-foreground">
                    {getFPS()}
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Frames Processed"
                value={inference.processedFrames.toLocaleString()}
                subtitle={inference.frameCount > 0 ? `of ${inference.frameCount.toLocaleString()}` : undefined}
                icon={BarChart3}
              />
              <MetricCard
                title="Hybrid Density"
                value={isConnected ? (hybridResult.status === "high" ? "High" : "Low") : "--"}
                subtitle={isConnected ? `${hybridResult.source.toUpperCase()}` : undefined}
                trend={hybridResult.status === "high" ? "up" : "down"}
                icon={TrendingUp}
              />
              <MetricCard
                title="Session Time"
                value={getSessionTime()}
                icon={Clock}
              />
              <MetricCard
                title="High Traffic Events"
                value={detectionCount.toString()}
                subtitle={detectionCount > 0 ? "detections" : undefined}
                icon={Car}
              />
            </div>
          </div>

          {/* Right Column - Controls & Info */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* YOLO Detection Panel (Hybrid Approach) */}
            <VehicleDetectionPanel
              detections={yolo.detections}
              vehicleCount={yolo.vehicleCount}
              countByClass={yolo.countByClass}
              fps={yolo.fps}
              lastInferenceTime={yolo.lastInferenceTime}
              isDetecting={yolo.isDetecting}
              showBoundingBoxes={showBoundingBoxes}
              onToggleBoundingBoxes={setShowBoundingBoxes}
              confidenceThreshold={yoloConfidence}
              onConfidenceChange={setYoloConfidence}
              hybridResult={hybridResult}
            />

            <GradCAMPanel
              enabled={heatmapEnabled}
              onToggle={setHeatmapEnabled}
              opacity={heatmapOpacity}
              onOpacityChange={setHeatmapOpacity}
              trafficStatus={hybridResult.status}
            />
            
            <InferenceStats
              frameCount={inference.frameCount}
              processedFrames={inference.processedFrames}
              confidence={inference.confidence}
              isProcessing={inference.isProcessing}
              settings={inference.settings}
            />
            
            <ModelInfoCard />
            
            <ActivityLog />
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            TrafficSense AI • Powered by <span className="text-blue-400">YOLOv8</span> + <span className="text-primary">MobileNetV2</span> + <span className="text-primary">Grad-CAM</span>
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Hybrid: YOLO Detection • CNN Classification • Temporal Smoothing • Confidence Filtering • ROI Cropping • Conditional Grad-CAM
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
