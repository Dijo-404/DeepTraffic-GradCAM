import { useState, useRef, useCallback } from "react";

/**
 * YOLO Vehicle Detection Hook (Hybrid Approach)
 * 
 * This hook simulates YOLO-based vehicle detection for counting purposes.
 * It works alongside the MobileNetV2 classifier in a hybrid architecture:
 * 
 * - YOLO: Provides precise vehicle count and bounding boxes
 * - MobileNetV2: Provides binary density classification (Low/High)
 * - Combined: More accurate density estimation with explainability
 * 
 * In production, this would call a YOLOv8/YOLOv5 model via API.
 * The hybrid approach maintains the "no bounding box annotation" requirement
 * for the classification model while adding detection capabilities.
 */

export interface Detection {
  id: string;
  class: VehicleClass;
  confidence: number;
  bbox: {
    x: number;      // Normalized x (0-1)
    y: number;      // Normalized y (0-1)
    width: number;  // Normalized width (0-1)
    height: number; // Normalized height (0-1)
  };
}

export type VehicleClass = "car" | "truck" | "bus" | "motorcycle" | "bicycle";

interface DetectionState {
  detections: Detection[];
  vehicleCount: number;
  countByClass: Record<VehicleClass, number>;
  isDetecting: boolean;
  fps: number;
  lastInferenceTime: number;
}

interface UseYOLODetectionOptions {
  /** Minimum confidence threshold for detection (default: 0.5) */
  confidenceThreshold?: number;
  /** Target classes to detect (default: all vehicles) */
  targetClasses?: VehicleClass[];
  /** Enable Non-Maximum Suppression (default: true) */
  nmsEnabled?: boolean;
  /** NMS IoU threshold (default: 0.45) */
  nmsThreshold?: number;
}

/**
 * Simulates YOLO inference with realistic detection patterns
 * In production: Replace with actual YOLOv8 API call
 */
const simulateYOLOInference = (
  confidenceThreshold: number,
  targetClasses: VehicleClass[]
): Detection[] => {
  // Simulate varying number of detections based on "traffic conditions"
  const numDetections = Math.floor(Math.random() * 12) + 3; // 3-14 vehicles
  const detections: Detection[] = [];
  
  const classWeights: Record<VehicleClass, number> = {
    car: 0.6,        // 60% cars
    truck: 0.15,     // 15% trucks
    bus: 0.08,       // 8% buses
    motorcycle: 0.12, // 12% motorcycles
    bicycle: 0.05,    // 5% bicycles
  };

  for (let i = 0; i < numDetections; i++) {
    // Weighted random class selection
    const rand = Math.random();
    let cumulative = 0;
    let selectedClass: VehicleClass = "car";
    
    for (const [cls, weight] of Object.entries(classWeights)) {
      cumulative += weight;
      if (rand <= cumulative) {
        selectedClass = cls as VehicleClass;
        break;
      }
    }

    // Skip if class not in target
    if (!targetClasses.includes(selectedClass)) continue;

    // Generate realistic confidence (higher for common classes)
    const baseConfidence = 0.55 + Math.random() * 0.40;
    const confidence = Math.min(0.98, baseConfidence);
    
    if (confidence < confidenceThreshold) continue;

    // Generate bounding box in lower portion of frame (ROI area)
    // X: distributed across frame, Y: concentrated in bottom 65%
    const bbox = {
      x: 0.05 + Math.random() * 0.85,
      y: 0.40 + Math.random() * 0.50, // Focus on bottom 60%
      width: selectedClass === "truck" || selectedClass === "bus" 
        ? 0.12 + Math.random() * 0.10 
        : 0.06 + Math.random() * 0.06,
      height: selectedClass === "truck" || selectedClass === "bus"
        ? 0.10 + Math.random() * 0.08
        : 0.05 + Math.random() * 0.05,
    };

    detections.push({
      id: `det_${i}_${Date.now()}`,
      class: selectedClass,
      confidence,
      bbox,
    });
  }

  return detections;
};

/**
 * Applies Non-Maximum Suppression to remove overlapping detections
 */
const applyNMS = (detections: Detection[], iouThreshold: number): Detection[] => {
  if (detections.length === 0) return [];
  
  // Sort by confidence (descending)
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const kept: Detection[] = [];
  const suppressed = new Set<string>();

  for (const det of sorted) {
    if (suppressed.has(det.id)) continue;
    kept.push(det);

    // Suppress overlapping lower-confidence detections
    for (const other of sorted) {
      if (other.id === det.id || suppressed.has(other.id)) continue;
      
      // Simple IoU approximation
      const overlapX = Math.max(0, 
        Math.min(det.bbox.x + det.bbox.width, other.bbox.x + other.bbox.width) -
        Math.max(det.bbox.x, other.bbox.x)
      );
      const overlapY = Math.max(0,
        Math.min(det.bbox.y + det.bbox.height, other.bbox.y + other.bbox.height) -
        Math.max(det.bbox.y, other.bbox.y)
      );
      const intersection = overlapX * overlapY;
      const union = det.bbox.width * det.bbox.height + 
                   other.bbox.width * other.bbox.height - intersection;
      const iou = intersection / union;

      if (iou > iouThreshold) {
        suppressed.add(other.id);
      }
    }
  }

  return kept;
};

export const useYOLODetection = (options: UseYOLODetectionOptions = {}) => {
  const {
    confidenceThreshold = 0.5,
    targetClasses = ["car", "truck", "bus", "motorcycle", "bicycle"],
    nmsEnabled = true,
    nmsThreshold = 0.45,
  } = options;

  const [state, setState] = useState<DetectionState>({
    detections: [],
    vehicleCount: 0,
    countByClass: { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 },
    isDetecting: false,
    fps: 0,
    lastInferenceTime: 0,
  });

  const frameTimestamps = useRef<number[]>([]);

  /**
   * Process a single frame through YOLO detection
   * Called by the video processing loop
   */
  const detectFrame = useCallback(() => {
    const startTime = performance.now();
    setState(prev => ({ ...prev, isDetecting: true }));

    // Simulate YOLO inference
    let detections = simulateYOLOInference(confidenceThreshold, targetClasses);

    // Apply NMS if enabled
    if (nmsEnabled) {
      detections = applyNMS(detections, nmsThreshold);
    }

    // Count by class
    const countByClass: Record<VehicleClass, number> = {
      car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0
    };
    for (const det of detections) {
      countByClass[det.class]++;
    }

    // Calculate FPS
    const now = performance.now();
    frameTimestamps.current.push(now);
    // Keep only last 30 timestamps
    if (frameTimestamps.current.length > 30) {
      frameTimestamps.current.shift();
    }
    const fps = frameTimestamps.current.length > 1
      ? 1000 / ((now - frameTimestamps.current[0]) / frameTimestamps.current.length)
      : 0;

    const inferenceTime = performance.now() - startTime;

    setState({
      detections,
      vehicleCount: detections.length,
      countByClass,
      isDetecting: false,
      fps: Math.round(fps * 10) / 10,
      lastInferenceTime: Math.round(inferenceTime * 100) / 100,
    });
  }, [confidenceThreshold, targetClasses, nmsEnabled, nmsThreshold]);

  const reset = useCallback(() => {
    frameTimestamps.current = [];
    setState({
      detections: [],
      vehicleCount: 0,
      countByClass: { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 },
      isDetecting: false,
      fps: 0,
      lastInferenceTime: 0,
    });
  }, []);

  /**
   * Hybrid density estimation combining YOLO count with classification
   * Uses vehicle count thresholds to validate/refine classification
   */
  const getHybridDensity = useCallback((
    classificationStatus: "low" | "high" | "analyzing"
  ): { status: "low" | "high"; confidence: number; source: "yolo" | "classifier" | "hybrid" } => {
    const count = state.vehicleCount;
    
    // Define thresholds for YOLO-based density
    const LOW_THRESHOLD = 5;
    const HIGH_THRESHOLD = 8;
    
    // If classifier is still analyzing, use YOLO alone
    if (classificationStatus === "analyzing") {
      if (count >= HIGH_THRESHOLD) {
        return { status: "high", confidence: 85, source: "yolo" };
      }
      return { status: "low", confidence: 80, source: "yolo" };
    }

    // Hybrid: Both agree
    if (count >= HIGH_THRESHOLD && classificationStatus === "high") {
      return { status: "high", confidence: 95, source: "hybrid" };
    }
    if (count < LOW_THRESHOLD && classificationStatus === "low") {
      return { status: "low", confidence: 95, source: "hybrid" };
    }

    // Disagreement: Weight towards YOLO for extreme counts
    if (count >= HIGH_THRESHOLD + 3) {
      return { status: "high", confidence: 88, source: "yolo" };
    }
    if (count <= 2) {
      return { status: "low", confidence: 88, source: "yolo" };
    }

    // Otherwise trust the classifier with reduced confidence
    return { 
      status: classificationStatus, 
      confidence: 75, 
      source: "classifier" 
    };
  }, [state.vehicleCount]);

  return {
    ...state,
    detectFrame,
    reset,
    getHybridDensity,
    settings: {
      confidenceThreshold,
      targetClasses,
      nmsEnabled,
      nmsThreshold,
    },
  };
};
