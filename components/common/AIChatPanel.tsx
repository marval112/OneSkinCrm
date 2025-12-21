import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { processCommand, Command, CommandResponse } from '../../services/aiCommandService';
import { ToastContext } from '../../contexts/ToastContext';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../services/i18nService';
import useVoiceInput from '../../hooks/useVoiceInput';
import { useGeminiLive } from '../../hooks/useGeminiLive';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

interface AIChatPanelProps {
  onClose: () => void;
}

const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 21.75l-.648-1.188a2.25 2.25 0 01-1.47-1.472L13 18.25l1.188-.648a2.25 2.25 0 011.47 1.472L16.25 20l.648-.102a2.25 2.25 0 011.47 1.472l.648 1.188-.648 1.188a2.25 2.25 0 01-1.47-1.472L16.25 20z" />
  </svg>
);

const PaperAirplaneIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const MicrophoneIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
  </svg>
);

function AIChatPanel({ onClose }: AIChatPanelProps) {
  const location = useLocation();
  const { initialMessage } = useChat();
  const { user } = useAuth();
  const { language } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Set initial greeting based on language and user
    const sellerName = user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : 'Seller';

    let greeting = '';
    if (language === 'es') {
      greeting = `¡Hola ${sellerName}! 🚀 Estoy listo para ayudarte a romper tus récords de venta hoy. ¿Qué desafío tenemos entre manos?`;
    } else if (language === 'pt') {
      greeting = `Olá ${sellerName}! 🚀 Estou pronto para te ajudar a superar suas metas de venda hoje. Qual é o desafio de agora?`;
    } else {
      greeting = `Hello ${sellerName}! 🚀 I'm ready to help you crush your sales goals today. What challenge are we tackling?`;
    }

    setMessages([{ id: 1, text: greeting, sender: 'ai' }]);
  }, [language, user]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>(() => (localStorage.getItem('oneskin_ai_input_mode') as 'text' | 'voice') || 'text');
  const [forceOpenRouter, setForceOpenRouter] = useState<boolean>(() => localStorage.getItem('oneskin_force_openrouter') === 'true');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Standard Voice Input (for transcription in text mode)
  const { isListening: isSTTListening, transcript, error: voiceError, isSupported, startListening, stopListening } = useVoiceInput();

  // Gemini Live API (for native audio dialog)
  const {
    start: startLive,
    stop: stopLive,
    isListening: isLiveListening,
    isConnected: isLiveConnected,
    error: liveError
  } = useGeminiLive({
    onMessage: (text) => {
      setMessages(prev => {
        // Check if last message is AI and update it or add new
        const last = prev[prev.length - 1];
        if (last && last.sender === 'ai' && Date.now() - last.id < 5000) {
          return [...prev.slice(0, -1), { ...last, text: last.text + text }];
        }
        return [...prev, { id: Date.now(), text, sender: 'ai' }];
      });
    },
    onCommand: (command, args) => {
      handleCommandResponse({ type: 'command', data: { command: command as Command, args } });
    },
    onError: (err) => {
      const msg = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
      console.error('[GeminiLive] Error reported to panel:', msg);

      const isQuota = msg.includes('quota') || msg.includes('429') || msg.includes('1011') || msg.includes('plan');
      const isManual = msg === 'MANUAL_FALLBACK';

      if (isQuota || isManual) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          sender: 'ai',
          text: isManual
            ? (language === 'es'
              ? "🛡️ **Modo Manual Activo.** Usando modelos de respaldo de OpenRouter para evitar problemas de cuota Gemini."
              : "🛡️ **Manual Mode Active.** Using OpenRouter fallback models to bypass Gemini quota issues.")
            : (language === 'es'
              ? "🎤 **Cuota de voz excedida.** No te preocupes, he activado el **Modo Texto de emergencia** usando modelos gratuitos para que podamos seguir hablando. ¡Dime qué necesitas! ✨"
              : "🎤 **Voice quota exceeded.** No worries, I've activated **Emergency Text Mode** using free models so we can keep talking. Tell me what you need! ✨"),
        }]);
        setInputMode('text');
        stopLive();
      } else {
        showToast?.(language === 'es' ? "Error en la conexión de voz." : "Voice connection error.", 'danger');
      }
    }
  });

  const activeIsListening = inputMode === 'voice' ? isLiveListening : isSTTListening;

  useEffect(() => {
    localStorage.setItem('oneskin_ai_input_mode', inputMode);
    // Stop any active listening when switching modes
    if (isSTTListening) stopListening();
    if (isLiveListening) stopLive();
  }, [inputMode, isSTTListening, isLiveListening, stopListening, stopLive]);

  useEffect(() => {
    localStorage.setItem('oneskin_force_openrouter', String(forceOpenRouter));
  }, [forceOpenRouter]);

  useEffect(() => {
    if (initialMessage) {
      setInputValue(initialMessage);
      // Optional: Auto-send
      // handleSendMessage(initialMessage); 
    }
  }, [initialMessage]);

  // Update input with voice transcript (only in text mode)
  useEffect(() => {
    if (transcript && inputMode === 'text') {
      setInputValue(transcript);
    }
  }, [transcript, inputMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    return () => {
      window.speechSynthesis?.cancel();
      stopLive();
    };
  }, [messages, stopLive]);

  const { showToast } = useContext(ToastContext) || {};
  const navigate = useNavigate();

  const speak = useCallback((text: string) => {
    // Only speak via TTS if NOT in Live Mode (Live Mode has native audio out)
    if (inputMode === 'voice' && isLiveConnected) return;
    if (!('speechSynthesis' in window)) return;

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'es' ? 'es-ES' : language === 'pt' ? 'pt-BR' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  }, [inputMode, language, isLiveConnected]);

  const handleCommandResponse = (response: CommandResponse) => {
    let aiText = '';
    if (response.type === 'text') {
      aiText = response.data;
    } else if (response.type === 'command') {
      const { command, args } = response.data;
      console.log('[AI Action]', command, args);

      switch (command) {
        case Command.SHOW_LEADS:
          const leadsQuery = args.status ? `status=${args.status}` : '';
          navigate(`/leads?${leadsQuery}`);
          aiText = language === 'es' ? `Entendido. Te muestro los leads${args.status ? ` con estado ${args.status}` : ''}.` : `Sure. Showing leads${args.status ? ` with status ${args.status}` : ''}.`;
          break;
        case Command.CREATE_TASK:
          aiText = language === 'es' ? `¡Hecho! He creado la tarea para ${args.assignee}: "${args.title}"${args.dueDate ? ` para el ${args.dueDate}` : ''}.` : `Done! I created the task for ${args.assignee}: "${args.title}"${args.dueDate ? ` for ${args.dueDate}` : ''}.`;
          showToast?.(aiText, 'success');
          break;
        case Command.FIND_CUSTOMER:
          navigate(`/customers?search=${args.name || args.company || ''}`);
          aiText = language === 'es' ? `Buscando al cliente ${args.name || args.company}...` : `Searching for customer ${args.name || args.company}...`;
          break;
        case 'navigate' as Command:
          const screen = (args.screen || '').toLowerCase();
          navigate(`/${screen}`);
          aiText = language === 'es' ? `Cambiando a la pantalla de ${screen}.` : `Navigating to the ${screen} screen.`;
          break;
        case 'create_lead' as Command:
          navigate(`/leads?create=true&name=${encodeURIComponent(args.name || '')}&company=${encodeURIComponent(args.company || '')}`);
          aiText = language === 'es' ? `He abierto el formulario para crear el nuevo lead: ${args.name}.` : `I've opened the form to create a new lead for ${args.name}.`;
          break;
        case 'create_deal' as Command:
          navigate(`/deals?create=true&title=${encodeURIComponent(args.title || '')}`);
          aiText = language === 'es' ? `Preparando la nueva oportunidad: ${args.title}.` : `Preparing the new opportunity: ${args.title}.`;
          break;
        case 'create_alert' as Command:
          aiText = language === 'es' ? `Alerta creada: "${args.message}". Te lo recordaré.` : `Alert created: "${args.message}". I'll remind you.`;
          showToast?.(aiText, 'info');
          break;
        case 'initiate_call' as Command:
          aiText = language === 'es' ? `Iniciando ${args.type === 'video' ? 'videollamada' : 'llamada'} con ${args.member}...` : `Initiating ${args.type === 'video' ? 'video call' : 'call'} with ${args.member}...`;
          showToast?.(aiText, 'info');
          break;
        default:
          aiText = language === 'es' ? "Entiendo la orden, pero aún estoy aprendiendo a ejecutar esa acción específica." : "I understand the instruction, but I'm still learning how to perform that specific action.";
      }
    }
    setMessages(prev => [...prev, { id: Date.now(), text: aiText, sender: 'ai' }]);
    speak(aiText);
  }

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now(), text, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Pass current path as context
      const context = `Current Page: ${location.pathname}`;
      const sellerName = user?.email ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1) : undefined;
      const response = await processCommand(text, context, sellerName, language);
      handleCommandResponse(response);

      // If we are in "voice-emulated" mode, speak the result
      if (inputMode === 'voice' && forceOpenRouter) {
        if (response.type === 'text') {
          speak(response.data);
        }
      }
    } catch (error) {
      const errorMessage: Message = { id: Date.now() + 1, text: "Sorry, something went wrong.", sender: 'ai' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, location.pathname, language, user, inputMode, forceOpenRouter, speak]);

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const toggleVoiceInput = () => {
    if (inputMode === 'voice') {
      if (forceOpenRouter) {
        // Manual Fallback: Use standard STT instead of Gemini Live
        if (isSTTListening) {
          stopListening();
        } else {
          startListening();
        }
      } else {
        // Normal Mode: Use Gemini Live
        if (isLiveListening) {
          stopLive();
        } else {
          startLive();
        }
      }
    } else {
      if (isSTTListening) {
        stopListening();
      } else {
        startListening();
      }
    }
  };

  const suggestedCommands = [
    "Show me new leads from the website",
    "Create a task for Juan to follow up on the Archviz deal",
    "Find the customer from 'Luxury Homes LLC'"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl flex flex-col w-full max-w-2xl h-full max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <SparklesIcon className="w-6 h-6 text-primary mr-2" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              {language === 'es' ? 'Tu Mentor de Ventas' : language === 'pt' ? 'Seu Mentor de Vendas' : 'AI Sales Mentor'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${msg.sender === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 rounded-bl-none'}`}>
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-xs px-4 py-2 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none">
                <div className="flex items-center justify-center space-x-1">
                  <div className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-wrap gap-2">
              {messages.length <= 1 && suggestedCommands.map(cmd => (
                <button key={cmd} onClick={() => handleSuggestionClick(cmd)} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">{cmd}</button>
              ))}
            </div>
            {/* Fallback Mode Toggle */}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Manual Fallback</span>
              <button
                onClick={() => setForceOpenRouter(!forceOpenRouter)}
                className={`w-8 h-4 rounded-full relative transition-all duration-200 ${forceOpenRouter ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                title={forceOpenRouter ? "Forcing OpenRouter (Free Models)" : "Using Default Priority (Gemini first)"}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${forceOpenRouter ? 'left-4.5' : 'left-0.5'}`} style={{ left: forceOpenRouter ? '1.1rem' : '0.125rem' }}></div>
              </button>
            </div>

            {/* Input Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-0.5 rounded-lg border border-slate-200 dark:border-slate-600">
              <button
                onClick={() => setInputMode('text')}
                className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-all ${inputMode === 'text' ? 'bg-white dark:bg-slate-600 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                TEXT
              </button>
              <button
                onClick={() => setInputMode('voice')}
                className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-all ${inputMode === 'voice' ? 'bg-white dark:bg-slate-600 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                VOICE
              </button>
            </div>
          </div>
          {(voiceError || liveError) && (
            <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-600 dark:text-red-400">
              {voiceError || liveError}
            </div>
          )}
          {inputMode === 'voice' ? (
            <div className="flex flex-col items-center justify-center py-6">
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${activeIsListening
                  ? 'bg-red-500 text-white animate-pulse scale-110 shadow-red-500/50'
                  : 'bg-primary text-white hover:bg-primary-hover'
                  }`}
                disabled={isLoading}
              >
                <MicrophoneIcon className="w-10 h-10" />
              </button>
              <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                {activeIsListening ? (language === 'es' ? 'Voz Activa (Sigue hablando...)' : 'Live Voice (Keep speaking...)') : (language === 'es' ? 'Toca para iniciar sesión de voz' : 'Tap to start voice session')}
              </p>
              {inputValue && !activeIsListening && (
                <div className="mt-4 w-full flex items-center gap-2">
                  <div className="flex-1 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 italic">
                    "{inputValue}"
                  </div>
                  <button
                    onClick={() => handleSendMessage(inputValue)}
                    className="p-3 bg-primary text-white rounded-full hover:bg-primary-hover shadow-md"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={language === 'es' ? "Pregúntame lo que quieras..." : "Ask me anything..."}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:disabled:bg-slate-600"
                disabled={isLoading}
                aria-label="Chat input"
              />
              <button type="submit" className="p-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:bg-slate-400 dark:disabled:bg-slate-500" disabled={isLoading}>
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIChatPanel;