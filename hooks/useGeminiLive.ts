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

            setIsConnected(true);

            // 2. Setup Audio
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 16000, // Re-sample to 16kHz
            });
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;

            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                // Convert Float32 to Int16
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                }
                geminiLiveService.sendAudio(pcmData);
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            setIsListening(true);
        } catch (err: any) {
            console.error('[useGeminiLive] Start error:', err);
            setError(err.message || 'Could not start voice session');
            stop();
        }
    }, [options, stop]);

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
