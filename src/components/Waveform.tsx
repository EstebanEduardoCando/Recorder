import { useEffect, useRef, useState } from 'react';
import './Waveform.css';

interface WaveformProps {
  isRecording: boolean;
  isPaused: boolean;
}

export default function Waveform({ isRecording, isPaused }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  // Inicializar Web Audio API cuando empiece la grabación
  useEffect(() => {
    if (!isRecording) {
      // Cleanup cuando no está grabando
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      dataArrayRef.current = null;
      setMicPermissionError(null);
      return;
    }

    // Inicializar cuando empiece la grabación
    const initAudio = async () => {
      try {
        // Solicitar acceso al micrófono
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Crear contexto de audio
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        // Crear analizador
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 128; // 64 barras (la mitad de fftSize)
        analyser.smoothingTimeConstant = 0.8; // Suavizado
        analyserRef.current = analyser;

        // Crear array para datos de frecuencia
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        dataArrayRef.current = dataArray;

        // Conectar el stream al analizador
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        setMicPermissionError(null);
      } catch (error) {
        console.error('Error al acceder al micrófono:', error);
        setMicPermissionError('No se pudo acceder al micrófono');
      }
    };

    initAudio();

    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isRecording]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      if (!isRecording) return;

      // Limpiar canvas
      ctx.fillStyle = 'rgba(102, 126, 234, 0.1)';
      ctx.fillRect(0, 0, width, height);

      // Obtener datos del analizador si está disponible
      let waveData: number[] = [];

      if (analyserRef.current && dataArrayRef.current && !isPaused) {
        // Obtener datos de frecuencia del micrófono
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);

        // Convertir los datos de Uint8Array (0-255) a valores normalizados (0-1)
        const rawData = Array.from(dataArrayRef.current);

        // Tomar solo las primeras 60 barras para el visualizador
        const barCount = 60;
        const step = Math.floor(rawData.length / barCount);

        for (let i = 0; i < barCount; i++) {
          const index = i * step;
          // Normalizar de 0-255 a 0-1 y aplicar un boost para que sea más visible
          const normalized = (rawData[index] / 255) * 1.5;
          waveData.push(Math.min(normalized, 1)); // Cap at 1
        }
      } else {
        // Fallback: mantener valores bajos cuando está pausado o sin datos
        waveData = new Array(60).fill(0.1);
      }

      const barCount = waveData.length;
      const barWidth = width / barCount;
      const maxBarHeight = height * 0.8;

      // Dibujar barras de onda
      for (let i = 0; i < barCount; i++) {
        const barHeight = waveData[i] * maxBarHeight;
        const x = i * barWidth;
        const y = (height - barHeight) / 2;

        // Gradiente de color
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(0.5, '#764ba2');
        gradient.addColorStop(1, '#667eea');

        ctx.fillStyle = isPaused ? 'rgba(245, 158, 11, 0.8)' : gradient;
        ctx.fillRect(x, y, barWidth - 2, barHeight);

        // Efecto de reflejo
        ctx.fillStyle = isPaused ? 'rgba(245, 158, 11, 0.2)' : 'rgba(102, 126, 234, 0.2)';
        ctx.fillRect(x, height / 2 + barHeight / 2, barWidth - 2, barHeight * 0.3);
      }

      // Línea central
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Continuar animación
      animationRef.current = requestAnimationFrame(draw);
    };

    if (isRecording) {
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, isPaused]);

  if (!isRecording) return null;

  return (
    <div className="waveform-container">
      <canvas
        ref={canvasRef}
        width={800}
        height={120}
        className="waveform-canvas"
      />
      {isPaused && (
        <div className="waveform-paused-indicator">
          <span>⏸️ Pausado</span>
        </div>
      )}
      {micPermissionError && (
        <div className="waveform-error">
          <span>⚠️ {micPermissionError}</span>
        </div>
      )}
    </div>
  );
}
