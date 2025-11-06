import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CameraScannerProps {
    onCapture: (imageDataUrl: string) => void;
    onClose: () => void;
}

const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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

    const handleCapture = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                // We need to strip the prefix `data:image/jpeg;base64,`
                const base64Image = imageDataUrl.split(',')[1];
                onCapture(base64Image);
            }
        }
    }, [onCapture]);

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="absolute top-0 left-0 w-full h-full object-cover"></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            
            {/* Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[90%] max-w-lg aspect-[1.7/1] border-4 border-dashed border-white/70 rounded-lg shadow-lg"></div>
            </div>
            <p className="absolute top-1/4 text-white/90 bg-black/40 px-4 py-2 rounded-md">Position the business card inside the frame</p>


            {error && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500/80 text-white p-4 rounded-lg">{error}</div>}
            
            {/* Controls */}
            <div className="absolute bottom-0 left-0 w-full p-4 bg-black/30 flex justify-center">
                <button
                    onClick={handleCapture}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-4 border-white/50 ring-2 ring-black/30 active:bg-slate-200"
                    aria-label="Capture business card"
                >
                    <CameraIcon className="w-10 h-10 text-slate-700" />
                </button>
            </div>
            
            {/* Close Button */}
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white" aria-label="Close scanner">
                <XMarkIcon className="h-8 w-8" />
            </button>
        </div>
    );
};

export default CameraScanner;
