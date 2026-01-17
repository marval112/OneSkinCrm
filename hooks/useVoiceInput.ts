import { useState, useEffect, useRef } from 'react';

interface UseVoiceInputReturn {
    isListening: boolean;
    transcript: string;
    error: string | null;
    isSupported: boolean;
    startListening: () => void;
    stopListening: () => void;
}

export default function useVoiceInput(): UseVoiceInputReturn {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);

    // Check browser support
    const isSupported = typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    useEffect(() => {
        if (!isSupported) {
            setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        // Initialize speech recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false; // Stop after user finishes speaking
        recognition.interimResults = true; // Show interim results
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcriptPiece = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcriptPiece;
                } else {
                    interimTranscript += transcriptPiece;
                }
            }

            setTranscript(finalTranscript || interimTranscript);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);

            switch (event.error) {
                case 'no-speech':
                    setError('No speech detected. Please try again.');
                    break;
                case 'not-allowed':
                    setError('Microphone access denied. Please allow microphone access.');
                    break;
                case 'network':
                    setError('Network error. Please check your connection.');
                    break;
                default:
                    setError(`Error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [isSupported]);

    const startListening = () => {
        if (!isSupported) {
            setError('Speech recognition is not supported in this browser.');
            return;
        }

        setTranscript('');
        setError(null);

        try {
            recognitionRef.current?.start();
        } catch (e) {
            console.error('Failed to start recognition:', e);
            setError('Failed to start voice input. Please try again.');
        }
    };

    const stopListening = () => {
        try {
            recognitionRef.current?.stop();
        } catch (e) {
            console.error('Failed to stop recognition:', e);
        }
    };

    return {
        isListening,
        transcript,
        error,
        isSupported,
        startListening,
        stopListening
    };
}
