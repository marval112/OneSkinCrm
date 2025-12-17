import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { processCommand, Command, CommandResponse } from '../../services/aiCommandService';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../services/i18nService';
import useVoiceInput from '../../hooks/useVoiceInput';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isListening, transcript, error: voiceError, isSupported, startListening, stopListening } = useVoiceInput();

  useEffect(() => {
    if (initialMessage) {
      setInputValue(initialMessage);
      // Optional: Auto-send
      // handleSendMessage(initialMessage); 
    }
  }, [initialMessage]);

  // Update input with voice transcript
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleCommandResponse = (response: CommandResponse) => {
    let aiText = '';
    if (response.type === 'text') {
      aiText = response.data;
    } else if (response.type === 'command') {
      const { command, args } = response.data;
      // In a real app, you would dispatch actions here based on the command.
      // For this example, we'll just log it and formulate a text response.
      console.log('[AI Action]', command, args);
      switch (command) {
        case Command.SHOW_LEADS:
          aiText = `Okay, I'm showing you leads with these filters: ${JSON.stringify(args)}`;
          break;
        case Command.CREATE_TASK:
          aiText = `✅ Task created for ${args.assignee}: "${args.title}"`;
          break;
        case Command.FIND_CUSTOMER:
          aiText = `Searching for customer: ${JSON.stringify(args)}`;
          break;
        default:
          aiText = "I understood a command, but I'm not sure how to execute it yet.";
      }
    }
    setMessages(prev => [...prev, { id: Date.now(), text: aiText, sender: 'ai' }]);
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
    } catch (error) {
      const errorMessage: Message = { id: Date.now() + 1, text: "Sorry, something went wrong.", sender: 'ai' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, location.pathname]);

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
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
          <div className="flex flex-wrap gap-2 mb-2">
            {messages.length <= 1 && suggestedCommands.map(cmd => (
              <button key={cmd} onClick={() => handleSuggestionClick(cmd)} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">{cmd}</button>
            ))}
          </div>
          {voiceError && (
            <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-600 dark:text-red-400">
              {voiceError}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me anything..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:disabled:bg-slate-600"
              disabled={isLoading}
              aria-label="Chat input"
            />
            {isSupported && (
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-2 rounded-md transition-all ${isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                disabled={isLoading}
                title={isListening ? 'Stop recording' : 'Start voice input'}
              >
                <MicrophoneIcon className="w-5 h-5" />
              </button>
            )}
            <button type="submit" className="p-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:bg-slate-400 dark:disabled:bg-slate-500" disabled={isLoading}>
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AIChatPanel;