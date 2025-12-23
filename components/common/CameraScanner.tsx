import React, { useRef, useEffect, useState, useCallback } from 'react';
import ModelSelector from './ModelSelector';
import { scanBusinessCard } from '../../services/geminiService';

interface CameraScannerProps {
    onCapture: (imageDataUrl: string) => void;
    onClose: () => void;
}

type ScanStatus = 'idle' | 'scanning' | 'success' | 'timeout' | 'error';

const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const CameraScanner: React.FC<CameraScannerProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<ScanStatus>('idle');
    const [attemptCount, setAttemptCount] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const MAX_ATTEMPTS = 30; // 30 seconds of scanning

    // Start camera
    useEffect(() => {
        let stream: MediaStream;
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" } // Prefer rear camera
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setError("Could not access the camera. Please ensure you have given permission.");
            }
        };

        startCamera();

        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    }, []);

    // Capture current frame helper
    const captureCurrentFrame = useCallback((): string | null => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                // Strip the prefix `data:image/jpeg;base64,`
                const base64Image = imageDataUrl.split(',')[1];
                return base64Image;
            }
        }
        return null;
    }, []);

    // Automatic scanning logic
    useEffect(() => {
        if (!videoRef.current || error) return;

        // Wait for video to be ready, then start scanning
        const startAutoScan = () => {
            let attempts = 0;

            const scanFrame = async () => {
                if (attempts >= MAX_ATTEMPTS) {
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                    }
                    setStatus('timeout');
                    return;
                }

                attempts++;
                setAttemptCount(attempts);
                setStatus('scanning');

                try {
                    const imageData = captureCurrentFrame();
                    if (!imageData) return;

                    const extractedData = await scanBusinessCard(imageData);

                    // Success! Stop scanning
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                    }
                    setStatus('success');

                    // Show success animation briefly, then proceed
                    setTimeout(() => {
                        onCapture(imageData);
                    }, 800);
                } catch (err) {
                    // Silent fail during auto-scan, just log
                    console.log(`Auto-scan attempt ${attempts} failed:`, err);
                    // Continue scanning...
                }
            };

            // Start scanning after 1 second delay (let camera stabilize)
            setTimeout(() => {
                intervalRef.current = setInterval(scanFrame, 1000);
            }, 1000);
        };

        // Wait for video to have metadata
        if (videoRef.current.readyState >= 2) {
            startAutoScan();
        } else {
            videoRef.current.addEventListener('loadedmetadata', startAutoScan);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [captureCurrentFrame, onCapture, error, MAX_ATTEMPTS]);

    const getStatusText = () => {
        switch (status) {
            case 'idle':
                return 'Position the business card inside the frame';
            case 'scanning':
                return `Scanning${'.'.repeat((attemptCount % 3) + 1)} (${attemptCount}/${MAX_ATTEMPTS})`;
            case 'success':
                return '✓ Card detected!';
            case 'timeout':
                return 'Unable to detect card. Please try again.';
            default:
                return 'Position the business card inside the frame';
        }
    };

    const getBorderClass = () => {
        if (status === 'success') return 'border-green-500 border-solid shadow-lg shadow-green-500/50';
        if (status === 'scanning') return 'border-blue-400 border-dashed animate-pulse';
        if (status === 'timeout') return 'border-red-500 border-solid';
        return 'border-white/70 border-dashed';
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="absolute top-0 left-0 w-full h-full object-cover"></video>
            <canvas ref={canvasRef} className="hidden"></canvas>

            {/* Overlay Frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-[90%] max-w-lg aspect-[1.7/1] border-4 rounded-lg transition-all duration-300 ${getBorderClass()}`}></div>
            </div>

            {/* Status Text */}
            <p className={`absolute top-1/4 px-4 py-2 rounded-md font-medium transition-colors ${status === 'success' ? 'bg-green-500/90 text-white' :
                    status === 'scanning' ? 'bg-blue-500/90 text-white' :
                        status === 'timeout' ? 'bg-red-500/90 text-white' :
                            'bg-black/60 text-white/90'
                }`}>
                {getStatusText()}
            </p>

            {/* Success Icon */}
            {status === 'success' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <CheckCircleIcon className="w-24 h-24 text-green-500 animate-bounce" />
                </div>
            )}

            {error && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500/80 text-white p-4 rounded-lg">{error}</div>}

            {/* Model Selector for Vision */}
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-2">
                <ModelSelector visionOnly compact />
            </div>

            {/* Close Button */}
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors" aria-label="Close scanner">
                <XMarkIcon className="h-8 w-8" />
            </button>

            {/* Retry button on timeout */}
            {status === 'timeout' && (
                <button
                    onClick={() => {
                        setStatus('idle');
                        setAttemptCount(0);
                        // Reset will trigger useEffect to restart scanning
                    }}
                    className="absolute bottom-8 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                    Retry Scan
                </button>
            )}
        </div>
    );
};

export default CameraScanner;
