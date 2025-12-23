import React, { useRef, useEffect, useState, useCallback } from 'react';
import ModelSelector from './ModelSelector';
import { scanBusinessCard } from '../../services/geminiService';

interface CameraScannerProps {
    onCapture: (data: any) => void;
    onClose: () => void;
}

type ScanStatus = 'idle' | 'scanning' | 'processing' | 'success' | 'timeout' | 'error';

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

const CameraIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
);

const CameraScanner: React.FC<CameraScannerProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<ScanStatus>('idle');
    const [attemptCount, setAttemptCount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const MAX_ATTEMPTS = 12; // 12 attempts at 5 seconds each = 60 seconds max
    const SCAN_INTERVAL = 5000; // 5 seconds between scans (safe for 15 RPM limit)

    // Start camera with autofocus
    useEffect(() => {
        let stream: MediaStream;
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "environment",
                        focusMode: "continuous", // Enable continuous autofocus
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    } as any
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
                const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95); // Higher quality for better OCR
                const base64Image = imageDataUrl.split(',')[1];
                return base64Image;
            }
        }
        return null;
    }, []);

    // Handle manual capture
    const handleManualCapture = useCallback(() => {
        if (isProcessing || status === 'success') return;

        setStatus('processing');
        const imageData = captureCurrentFrame();
        if (imageData) {
            performScan(imageData, true);
        }
    }, [captureCurrentFrame, isProcessing, status]);

    // Perform scan (separate function for reuse)
    const performScan = async (imageData: string, isManual: boolean = false) => {
        if (isProcessing) return; // Prevent concurrent scans

        setIsProcessing(true);

        try {
            const extractedData = await scanBusinessCard(imageData);

            // Success! Stop scanning
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }

            setStatus('success');

            // Show success animation briefly, then proceed
            setTimeout(() => {
                onCapture(extractedData);
            }, 800);
        } catch (err) {
            setIsProcessing(false);
            if (isManual) {
                // Show error for manual captures
                setStatus('error');
                setTimeout(() => setStatus('scanning'), 2000);
            }
            // For auto-scan, just log and continue
            console.log(`Scan attempt failed:`, err);
        }
    };

    // Auto-scan with controlled intervals
    useEffect(() => {
        if (!videoRef.current || error) return;

        let isActive = true;
        let attempts = 0;

        const scanFrame = async () => {
            if (!isActive || isProcessing) return;

            if (attempts >= MAX_ATTEMPTS) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
                setStatus('timeout');
                return;
            }

            attempts++;
            setAttemptCount(attempts);
            setStatus('scanning');

            const imageData = captureCurrentFrame();
            if (imageData) {
                await performScan(imageData, false);
            }
        };

        // Wait for video to be ready
        const startAutoScan = () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
                // Start scanning after brief delay for camera stabilization
                setTimeout(() => {
                    if (isActive) {
                        // First scan immediately
                        scanFrame();
                        // Then schedule subsequent scans every 3 seconds
                        intervalRef.current = setInterval(scanFrame, SCAN_INTERVAL);
                    }
                }, 1500);
            } else {
                videoRef.current?.addEventListener('loadedmetadata', startAutoScan);
            }
        };

        startAutoScan();

        return () => {
            isActive = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [captureCurrentFrame, error]);

    const getStatusText = () => {
        switch (status) {
            case 'idle':
                return 'Position the business card inside the frame';
            case 'scanning':
                return `Auto-scanning... (${attemptCount}/${MAX_ATTEMPTS})`;
            case 'processing':
                return 'Processing...';
            case 'success':
                return '✓ Card detected!';
            case 'timeout':
                return 'Unable to detect card. Please try manual capture.';
            case 'error':
                return 'Scan failed. Retrying...';
            default:
                return 'Position the business card inside the frame';
        }
    };

    const getBorderClass = () => {
        if (status === 'success') return 'border-green-500 border-solid shadow-lg shadow-green-500/50';
        if (status === 'processing') return 'border-yellow-400 border-solid animate-pulse';
        if (status === 'scanning') return 'border-blue-400 border-dashed';
        if (status === 'timeout' || status === 'error') return 'border-red-500 border-solid';
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
                status === 'processing' ? 'bg-yellow-500/90 text-white' :
                    status === 'scanning' ? 'bg-blue-500/90 text-white' :
                        status === 'timeout' || status === 'error' ? 'bg-red-500/90 text-white' :
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

            {/* Manual Capture Button */}
            <div className="absolute bottom-0 left-0 w-full p-4 bg-black/30 flex justify-center">
                <button
                    onClick={handleManualCapture}
                    disabled={isProcessing || status === 'success'}
                    className={`w-20 h-20 rounded-full flex items-center justify-center border-4 border-white/50 ring-2 ring-black/30 transition-all ${isProcessing || status === 'success'
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-white hover:bg-slate-100 active:bg-slate-200'
                        }`}
                    aria-label="Manual capture"
                >
                    <CameraIcon className="w-10 h-10 text-slate-700" />
                </button>
            </div>

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
                        setIsProcessing(false);
                        window.location.reload(); // Easiest way to restart
                    }}
                    className="absolute bottom-32 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                    Restart Auto-Scan
                </button>
            )}
        </div>
    );
};

export default CameraScanner;
