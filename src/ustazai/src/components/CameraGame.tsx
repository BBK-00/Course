import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, RefreshCw, User, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';
import { cn } from '@/src/lib/utils';

interface CameraGameProps {
  questions: { text: string; hint?: string }[];
  onBack: () => void;
}

export default function CameraGame({ questions, onBack }: CameraGameProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedFacesCount, setDetectedFacesCount] = useState(0);
  const [zoomTarget, setZoomTarget] = useState<{ x: number; y: number; scale: number } | null>(null);

  useEffect(() => {
    let closed = false;
    let stream: MediaStream | undefined;
    async function loadModels() {
      try {
        if (!faceapi.nets.tinyFaceDetector.isLoaded) {
          await faceapi.nets.tinyFaceDetector.loadFromUri(import.meta.env.BASE_URL + 'models/face');
        }
        if (!closed) setIsModelLoaded(true);
      } catch {
        if (!closed) setError("Камера моделін жүктеу мүмкін болмады.");
      }
    }

    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        if (closed) { s.getTracks().forEach(track => track.stop()); return; }
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        if (closed) return;
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setError("Камераға рұқсат берілмеді. Браузер параметрлерінен камераға рұқсат беріп, бетті жаңартыңыз немесе қайта көріңіз.");
        } else {
          setError("Камераны іске қосу мүмкін болмады. Құрылғыңызда камера бар екеніне көз жеткізіңіз.");
        }
      }
    }

    loadModels();
    startCamera();

    return () => {
      closed = true;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Continuous face detection for feedback - Throttled to save CPU
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let closed = false;
    const detect = async () => {
      if (videoRef.current && videoRef.current.readyState >= 2 && isModelLoaded) {
        try {
          // High sensitivity for classroom detection
          const detections = await faceapi.detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.1 })
          );
          if (closed) return;
          setDetectedFacesCount(detections.length);

          if (overlayRef.current && videoRef.current) {
            const canvas = overlayRef.current;
            const displaySize = {
              width: videoRef.current.clientWidth,
              height: videoRef.current.clientHeight
            };

            if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
              canvas.width = displaySize.width;
              canvas.height = displaySize.height;
            }

            faceapi.matchDimensions(canvas, displaySize);
            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);

            // Custom drawing for more "modern" look
            resizedDetections.forEach(detection => {
              const box = detection.box;
              if (ctx) {
                // If selecting, use a scanning color (e.g. orange/red) or flashing
                const isScanning = isSelecting;
                ctx.strokeStyle = isScanning ? '#fbbf24' : '#3b82f6';
                ctx.lineWidth = isScanning ? 4 : 3;
                ctx.setLineDash([]);

                // Draw corners only for a hi-tech look
                const s = 20; // corner size
                // Top-left
                ctx.beginPath();
                ctx.moveTo(box.x, box.y + s);
                ctx.lineTo(box.x, box.y);
                ctx.lineTo(box.x + s, box.y);
                ctx.stroke();

                // Top-right
                ctx.beginPath();
                ctx.moveTo(box.x + box.width - s, box.y);
                ctx.lineTo(box.x + box.width, box.y);
                ctx.lineTo(box.x + box.width, box.y + s);
                ctx.stroke();

                // Bottom-right
                ctx.beginPath();
                ctx.moveTo(box.x + box.width, box.y + box.height - s);
                ctx.lineTo(box.x + box.width, box.y + box.height);
                ctx.lineTo(box.x + box.width - s, box.y + box.height);
                ctx.stroke();

                // Bottom-left
                ctx.beginPath();
                ctx.moveTo(box.x + s, box.y + box.height);
                ctx.lineTo(box.x, box.y + box.height);
                ctx.lineTo(box.x, box.y + box.height - s);
                ctx.stroke();

                // Semi-transparent fill
                ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
                ctx.fillRect(box.x, box.y, box.width, box.height);
              }
            });
          }
        } catch (err) {
          console.error("Detection error:", err);
        }
      } else if (overlayRef.current) {
        const ctx = overlayRef.current.getContext('2d');
        ctx?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      }
      if (!closed) timeoutId = setTimeout(detect, 100);
    };
    detect();
    return () => { closed = true; clearTimeout(timeoutId); };
  }, [isModelLoaded, isSelecting, selectedStudent]);

  const selectRandomStudent = async () => {
    if (!videoRef.current || !isModelLoaded) return;

    setIsSelecting(true);
    setSelectedStudent(null);
    setZoomTarget(null);
    setError(null);
    setDetectedFacesCount(0);

    // Scanning phase: Collect detections over 4 seconds to find the frame with the MOST faces
    let bestDetections: faceapi.FaceDetection[] = [];
    const startTime = Date.now();

    while (Date.now() - startTime < 4000) {
      if (!videoRef.current) break;

      try {
        // High resolution (416-512) is critical for detecting many small faces in a classroom
        const current = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.1 })
        );

        if (current.length > bestDetections.length) {
          bestDetections = current;
          setDetectedFacesCount(current.length);
        }
      } catch (e) {
        console.error("Scanning error", e);
      }

      await new Promise(resolve => setTimeout(resolve, 80));
    }

    const detections = bestDetections;

    if (detections.length > 0) {
      // Pick a random face
      const randomFace = detections[Math.floor(Math.random() * detections.length)];
      const { x, y, width, height } = randomFace.box;

      // Calculate zoom parameters
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;

      // Target center of the face
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      // Calculate how much to translate to bring face to center
      // (videoWidth/2 - centerX) * scale
      const scale = 3; // Zoom level
      const translateX = (videoWidth / 2 - centerX) * (scale / videoWidth) * 100;
      const translateY = (videoHeight / 2 - centerY) * (scale / videoHeight) * 100;

      setZoomTarget({ x: translateX, y: translateY, scale });

      // Wait 1 second for zoom animation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capture the face
      const padding = 0.2;
      const padW = width * padding;
      const padH = height * padding;

      const cropX = Math.max(0, x - padW);
      const cropY = Math.max(0, y - padH * 2);
      const cropW = Math.min(videoWidth - cropX, width + padW * 2);
      const cropH = Math.min(videoHeight - cropY, height + padH * 3);

      const canvas = canvasRef.current!;
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      setSelectedStudent(canvas.toDataURL());
      setIsSelecting(false);
      setZoomTarget(null);
    } else {
      setIsSelecting(false);
      setError("Адам беті табылмады. Камераны оқушыларға жақындатыңыз.");
    }
  };

  const nextQuestion = () => {
    setSelectedStudent(null);
    setCurrentQuestionIndex((prev) => (prev + 1) % questions.length);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFCF8] text-[#1A1A1A] p-4 md:p-8 overflow-hidden font-sans">
      <div className="w-full max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <button
            onClick={onBack}
            className="btn-secondary text-sm px-4 py-2"
          >
            ← Артқа
          </button>
          <div className="badge-modern bg-brand-primary text-white px-6 py-2">
            Камера Ойыны
          </div>
        </div>

        <div className="card-modern p-4 md:p-6 relative overflow-hidden flex flex-col gap-6">
          <div className="relative aspect-video bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-200 shadow-xl">
            <motion.video
              ref={videoRef}
              autoPlay
              playsInline
              animate={zoomTarget ? {
                scale: zoomTarget.scale,
                x: `${zoomTarget.x}%`,
                y: `${zoomTarget.y}%`,
              } : {
                scale: 1,
                x: 0,
                y: 0,
              }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className={cn(
                "w-full h-full object-cover transition-all duration-700",
                selectedStudent ? "opacity-60" : "opacity-100"
              )}
            />

            <canvas
              ref={overlayRef}
              className="absolute inset-0 z-20 pointer-events-none"
            />

            {/* HUD Overlay */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              <div className="px-4 py-2 rounded-xl bg-white/90 backdrop-blur-sm border border-zinc-100 shadow-sm flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full animate-pulse", detectedFacesCount > 0 ? "bg-brand-primary" : "bg-zinc-300")} />
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-text">
                   {detectedFacesCount} бет анықталды
                </span>
              </div>
            </div>

            {/* Selected Student Display Overlay */}
            <AnimatePresence>
              {selectedStudent && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 20 }}
                  className="absolute bottom-4 right-4 z-40 w-40 md:w-56"
                >
                  <div className="relative card-modern p-2 bg-white shadow-2xl border-4 border-brand-primary">
                    <img
                      src={selectedStudent}
                      alt="Selected"
                      className="w-full aspect-[3/4] object-cover rounded-xl"
                    />
                    <div className="absolute -top-3 -left-3 bg-brand-primary p-2 rounded-lg shadow-lg border-2 border-white">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scanning Indicator Overlay */}
            <AnimatePresence>
              {isSelecting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 bg-brand-primary/10 backdrop-blur-[2px] flex flex-col items-center justify-center"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-32 h-32 border-8 border-brand-primary/20 rounded-full"
                    />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="absolute inset-0 border-8 border-transparent border-t-brand-primary rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                    />
                  </div>
                  <p className="mt-6 font-black uppercase tracking-widest text-2xl text-brand-primary animate-pulse drop-shadow-lg bg-white/80 px-6 py-2 rounded-2xl">Іздеуде...</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message Overlay */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute inset-x-0 bottom-10 flex justify-center z-50 pointer-events-none"
                >
                  <div className="px-6 py-3 bg-red-500 text-white rounded-2xl shadow-2xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-bold">{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* New Control Area Below Video */}
          <div className="flex flex-col gap-6">
            {!selectedStudent ? (
              <div className="flex flex-col gap-4">
                <button
                  onClick={selectRandomStudent}
                  disabled={isSelecting || !isModelLoaded}
                  className="w-full btn-primary text-xl py-6 flex items-center justify-center gap-4 shadow-xl shadow-brand-primary/25 active:scale-95 transition-transform"
                >
                  {isSelecting ? <Loader2 className="w-8 h-8 animate-spin" /> : <Camera className="w-8 h-8" />}
                  {isSelecting ? "Анықталуда..." : "Оқушыны таңдау"}
                </button>
                <div className="text-center">
                  <p className="font-black uppercase tracking-widest text-[11px] text-brand-muted">
                    {detectedFacesCount > 0
                      ? `${detectedFacesCount} оқушы көрініп тұр`
                      : "Камераны оқушыларға бағыттап, бірнеше секунд күтіңіз"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
                <div className="space-y-4">
                  <div className="inline-block px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-xs font-black uppercase tracking-widest text-brand-primary">
                    Сұрақ №{currentQuestionIndex + 1}
                  </div>
                  <h2 className="text-3xl font-black leading-tight tracking-tight text-brand-text">
                    {questions[currentQuestionIndex].text}
                  </h2>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={nextQuestion}
                    className="flex-1 btn-primary py-5 text-lg font-black shadow-lg shadow-brand-primary/20"
                  >
                    Жауап берді
                  </button>
                  <button
                    onClick={selectRandomStudent}
                    className="flex-1 btn-secondary py-5 text-lg font-black border-2"
                  >
                    Келесі оқушы
                  </button>
                </div>
              </div>
            )}

            {error && error.includes("рұқсат берілмеді") && (
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary w-full py-4 flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} /> Бетті жаңарту
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
