import { useState, useEffect, useRef, useCallback } from 'react';
import { geminiLiveService, LiveChatOptions } from '../services/geminiLiveService';

export interface UseGeminiLiveReturn {
    isConnected: boolean;
    isListening: boolean;
    start: () => Promise<void>;
    stop: () => void;
    sendText: (text: string) => void;
    error: string | null;
}

export function useGeminiLive(options: LiveChatOptions) {
    const [isConnected, setIsConnected] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const playbackContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);

    const playAudioChunk = useCallback((pcmData: Int16Array) => {
        if (pcmData.length === 0) return;
        console.log(`[useGeminiLive] Playing audio chunk (${pcmData.length} samples)`);

        if (!playbackContextRef.current) {
            playbackContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 24000,
            });
            nextStartTimeRef.current = playbackContextRef.current.currentTime;
        }

        const context = playbackContextRef.current;
        const buffer = context.createBuffer(1, pcmData.length, 24000);
        const channelData = buffer.getChannelData(0);

        for (let i = 0; i < pcmData.length; i++) {
            channelData[i] = pcmData[i] / 0x7FFF;
        }

        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);

        const startTime = Math.max(context.currentTime, nextStartTimeRef.current);
        source.start(startTime);
        nextStartTimeRef.current = startTime + buffer.duration;
    }, []);

    const stop = useCallback(() => {
        console.log('[useGeminiLive] stop() called - disconnecting');
        geminiLiveService.disconnect();
        setIsConnected(false);
        setIsListening(false);

        if (workletNodeRef.current) {
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (playbackContextRef.current) {
            playbackContextRef.current.close();
            playbackContextRef.current = null;
        }
    }, []);

    const start = useCallback(async () => {
        try {
            setError(null);

            // 1. Connect WebSocket
            await geminiLiveService.connect({
                ...options,
                onAudio: (data) => {
                    playAudioChunk(data);
                    options.onAudio?.(data);
                },
                onClose: () => {
                    setIsConnected(false);
                    stop();
                    options.onClose?.();
                },
                onError: (err) => {
                    setError(typeof err === 'string' ? err : 'Connection error');
                    stop();
                    options.onError?.(err);
                }
            });
            setIsConnected(true);

            // 2. Setup Audio - Use 24kHz
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 16000,
            });
            audioContextRef.current = audioContext;

            // Load the PCM processor worklet
            try {
                await audioContext.audioWorklet.addModule('/pcm-processor.js');
            } catch (workletErr) {
                console.error('[useGeminiLive] Failed to load audio worklet:', workletErr);
                throw new Error('Failed to initialize audio processor');
            }

            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;

            const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
            workletNodeRef.current = workletNode;

            workletNode.port.onmessage = (event) => {
                const pcmData = event.data;
                geminiLiveService.sendAudio(pcmData);
            };

            source.connect(workletNode);
            workletNode.connect(audioContext.destination);

            setIsListening(true);
        } catch (err: any) {
            console.error('[useGeminiLive] Start error:', err);
            setError(err.message || 'Could not start voice session');
            stop();
        }
    }, [options, stop, playAudioChunk]);

    const sendText = useCallback((text: string) => {
        geminiLiveService.sendText(text);
    }, []);

    useEffect(() => {
        return () => stop();
    }, [stop]);

    return {
        isConnected,
        isListening,
        start,
        stop,
        sendText,
        error
    };
}
