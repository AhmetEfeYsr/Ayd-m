import React, { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Canvas, Path, Skia, SkPath } from '@shopify/react-native-skia';

export interface Point {
  x: number;
  y: number;
}

export interface DrawingCanvasRef {
  clear: () => void;
  getPaths: () => SkPath[];
  getStrokes: () => Point[][];
}

interface DrawingCanvasProps {
  onStrokeEnd?: (path: SkPath) => void;
  disabled?: boolean;
}

export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({ onStrokeEnd, disabled = false }, ref) => {
  const [completedPaths, setCompletedPaths] = useState<SkPath[]>([]);
  const [currentPath, setCurrentPath] = useState<{ path: SkPath } | null>(null);

  // Use refs for mutable stroke data to avoid stale closures in gesture handlers
  const completedStrokesRef = useRef<Point[][]>([]);
  const currentStrokeRef = useRef<Point[]>([]);
  // Keep a ref to the live path to avoid toSVGString/parse round-trips
  const livePathRef = useRef<SkPath | null>(null);

  useImperativeHandle(ref, () => ({
    clear: () => {
      setCompletedPaths([]);
      setCurrentPath(null);
      completedStrokesRef.current = [];
      currentStrokeRef.current = [];
      livePathRef.current = null;
    },
    getPaths: () => {
      return [...completedPaths, ...(currentPath ? [currentPath.path] : [])];
    },
    getStrokes: () => {
      const current = currentStrokeRef.current;
      return [...completedStrokesRef.current, ...(current.length > 0 ? [current] : [])];
    }
  }));

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(1) // Activate immediately for stylus precision
    .runOnJS(true)
    .onStart((e) => {
      const newPath = Skia.Path.Make();
      newPath.moveTo(e.x, e.y);
      livePathRef.current = newPath;
      currentStrokeRef.current = [{ x: e.x, y: e.y }];
      setCurrentPath({ path: newPath });
    })
    .onChange((e) => {
      const path = livePathRef.current;
      if (path) {
        // Mutate the path in-place (Skia paths are mutable objects)
        path.lineTo(e.x, e.y);
        currentStrokeRef.current.push({ x: e.x, y: e.y });
        // Force a re-render by creating a shallow copy reference
        setCurrentPath({ path });
      }
    })
    .onEnd(() => {
      const path = livePathRef.current;
      if (path) {
        setCompletedPaths((prev) => [...prev, path]);
        completedStrokesRef.current.push([...currentStrokeRef.current]);
        if (onStrokeEnd) {
          onStrokeEnd(path);
        }
        livePathRef.current = null;
        currentStrokeRef.current = [];
        setCurrentPath(null);
      }
    });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            {completedPaths.map((p, index) => (
              <Path key={index} path={p} color="rgba(220, 38, 38, 0.85)" style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
            ))}
            {currentPath && (
              <Path path={currentPath.path} color="rgba(220, 38, 38, 0.85)" style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
            )}
          </Canvas>
        </View>
      </GestureDetector>
    </View>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';
