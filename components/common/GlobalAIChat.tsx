
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { sendMessageToAssistant, executeAction, ChatMessage } from '../../services/aiAssistantService';

const BotIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12h15m-15 3.75h15m-15 3.75h15M8.25 21v1.5m7.5-19.5v1.5m0 20.25v1.5m-9-5.25v.75a2.25 2.25 0 002.25 2.25h3.75a2.25 2.25 0 002.25-2.25v-.75m-9-3.75h.008v.008H12v-.008zM4.5 7.5h.008v.008H4.5V7.5zm15 0h.008v.008H19.5V7.5z" />
    </svg>
);

const SendIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor">
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
);

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export default function GlobalAIChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', content: 'Hi! I am your OneSkin Executive Assistant. How can I help you be more productive today?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || !user) return;

        const userMsg = { role: 'user', content: input } as ChatMessage;
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const { text, action } = await sendMessageToAssistant(input, messages, user, location.pathname);

            const botMsg = { role: 'model', content: text, action: action ? { ...action, status: 'pending' } : undefined } as ChatMessage;
            setMessages(prev => [...prev, botMsg]);

            // Auto-execute if it's a safe action or navigate
            if (action) {
                if (action.action === 'navigate') {
                    navigate(action.params.path);
                    setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, action: { ...m.action!, status: 'success', result: 'Navigated' } } : m));
                } else {
                    // For other actions (like creating tasks), we might want to ask confirmation or just do it.
                    // For now, let's just do it and update status.
                    const result = await executeAction(action.action, action.params, user);
                    setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, action: { ...m.action!, status: result.success ? 'success' : 'error', result: result.message } } : m));
                }
            }

        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', content: 'Something went wrong. Please try again.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!user) return null;

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-transform hover:scale-105 ${isOpen ? 'bg-red-500 text-white' : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'}`}
            >
                {isOpen ? <CloseIcon className="w-6 h-6" /> : <BotIcon className="w-6 h-6" />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl z-50 flex flex-col border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade-in-up">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full">
                            <BotIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm">OneSkin Executive AI</h3>
                            <div className="text-xs text-blue-100 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                Online
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-600'
                                    }`}>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>

                                    {/* Action Status Indicator */}
                                    {msg.action && (
                                        <div className="mt-2 text-xs bg-black/5 dark:bg-white/10 p-2 rounded">
                                            <div className="font-mono opacity-70">Executing: {msg.action.action}</div>
                                            {msg.action.status === 'pending' && <span className="text-amber-500">Processing...</span>}
                                            {msg.action.status === 'success' && <span className="text-green-500">✅ {msg.action.result}</span>}
                                            {msg.action.status === 'error' && <span className="text-red-500">❌ {msg.action.result}</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask me to do anything..."
                                className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <SendIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
