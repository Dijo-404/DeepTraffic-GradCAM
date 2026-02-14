import { useState, useRef, useCallback } from "react";

/**
 * Traffic Inference Hook with Real-Time Optimizations
 * 
 * This hook implements multiple optimization strategies for stable
 * traffic density predictions in real-time video analysis:
 * 
 * 1. Temporal Smoothing (Majority Voting)
 * 2. Confidence-Based Filtering
 * 3. Frame Skipping
 */

interface InferenceState {
  status: "low" | "high" | "analyzing";
  confidence: number;
  isProcessing: boolean;
  frameCount: number;
  processedFrames: number;
}

interface UseTrafficInferenceOptions {
  /** Number of frames to use for temporal smoothing (default: 10) */
  temporalWindow?: number;
  /** Minimum confidence threshold to accept prediction (default: 0.6) */
  confidenceThreshold?: number;
  /** Process every Nth frame for inference (default: 5) */
  frameSkipRate?: number;
}

/**
 * OPTIMIZATION #1: Temporal Smoothing via Majority Voting
 * 
 * Instead of updating the traffic state on every frame, we maintain
 * a sliding window of the last N predictions. The displayed state
 * only changes when a majority (>50%) of recent predictions agree.
 * This prevents rapid flickering between states due to noisy frames.
 */
const getMajorityVote = (predictions: ("low" | "high")[]): "low" | "high" => {
  if (predictions.length === 0) return "low";
  
  const highCount = predictions.filter(p => p === "high").length;
  const lowCount = predictions.length - highCount;
  
  // Require clear majority for state change
  return highCount > lowCount ? "high" : "low";
};

/**
 * OPTIMIZATION #2: Confidence-Based Filtering
 * 
 * Uses softmax confidence scores to filter unreliable predictions.
 * If the model's confidence is below the threshold (default 0.6),
 * we retain the previous traffic state instead of switching.
 * This acts as a "confidence thresholding mechanism" to prevent
 * low-confidence predictions from causing state changes.
 */
const shouldAcceptPrediction = (
  confidence: number, 
  threshold: number
): boolean => {
  return confidence >= threshold;
};

/**
 * Simulates CNN inference with realistic confidence scores
 * In production, this would call the actual PyTorch model via API
 */
const simulateInference = (): { prediction: "low" | "high"; confidence: number } => {
  // Simulate model output with varying confidence levels
  const baseConfidence = 0.65 + Math.random() * 0.30; // 0.65 - 0.95
  const prediction = Math.random() > 0.4 ? "high" : "low";
  
  // Add some noise to simulate real-world uncertainty
  const noise = (Math.random() - 0.5) * 0.2;
  const confidence = Math.max(0.3, Math.min(0.98, baseConfidence + noise));
  
  return { prediction, confidence };
};

export const useTrafficInference = (options: UseTrafficInferenceOptions = {}) => {
  const {
    temporalWindow = 10,
    confidenceThreshold = 0.6,
    frameSkipRate = 5,
  } = options;

  const [state, setState] = useState<InferenceState>({
    status: "analyzing",
    confidence: 0,
    isProcessing: false,
    frameCount: 0,
    processedFrames: 0,
  });

  // Sliding window for temporal smoothing (Optimization #1)
  const predictionHistory = useRef<("low" | "high")[]>([]);
  const lastStableStatus = useRef<"low" | "high">("low");
  const frameCounter = useRef(0);

  /**
   * OPTIMIZATION #5: Frame Skipping for Real-Time Performance
   * 
   * Process only 1 out of every N frames for inference.
   * This maintains smooth video playback while reducing
   * computational load. The prediction is interpolated
   * between processed frames using the last known state.
   */
  const processFrame = useCallback(() => {
    frameCounter.current += 1;
    
    setState(prev => ({
      ...prev,
      frameCount: prev.frameCount + 1,
    }));

    // Skip frames for performance (process every Nth frame)
    if (frameCounter.current % frameSkipRate !== 0) {
      return; // Skip this frame, maintain current prediction
    }

    setState(prev => ({ ...prev, isProcessing: true }));

    // Simulate inference (in production: call PyTorch API)
    const { prediction, confidence } = simulateInference();

    // Optimization #2: Confidence-based filtering
    if (shouldAcceptPrediction(confidence, confidenceThreshold)) {
      // Add to prediction history for temporal smoothing
      predictionHistory.current.push(prediction);
      
      // Keep only last N predictions (sliding window)
      if (predictionHistory.current.length > temporalWindow) {
        predictionHistory.current.shift();
      }

      // Optimization #1: Get majority vote from temporal window
      const stableStatus = getMajorityVote(predictionHistory.current);
      lastStableStatus.current = stableStatus;

      setState(prev => ({
        ...prev,
        status: stableStatus,
        confidence: confidence * 100,
        isProcessing: false,
        processedFrames: prev.processedFrames + 1,
      }));
    } else {
      // Low confidence: retain previous state (Optimization #2)
      setState(prev => ({
        ...prev,
        status: lastStableStatus.current,
        confidence: confidence * 100,
        isProcessing: false,
        processedFrames: prev.processedFrames + 1,
      }));
    }
  }, [temporalWindow, confidenceThreshold, frameSkipRate]);

  const reset = useCallback(() => {
    predictionHistory.current = [];
    lastStableStatus.current = "low";
    frameCounter.current = 0;
    setState({
      status: "analyzing",
      confidence: 0,
      isProcessing: false,
      frameCount: 0,
      processedFrames: 0,
    });
  }, []);

  return {
    ...state,
    processFrame,
    reset,
    // Expose optimization settings for UI display
    settings: {
      temporalWindow,
      confidenceThreshold,
      frameSkipRate,
    },
  };
};
