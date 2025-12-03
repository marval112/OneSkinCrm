import React from 'react';
import { useTeam } from '../../contexts/TeamContext';
import { useTranslation } from '../../services/i18nService';

const PhoneIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
);

const VideoCameraIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
);

const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const IncomingCallModal = () => {
    const { incomingCall, acceptCall, rejectCall } = useTeam();
    const { t } = useTranslation();

    if (!incomingCall) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center animate-bounce-slight">
                <div className="mx-auto w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-6 relative">
                    {incomingCall.type === 'video_call' ? (
                        <VideoCameraIcon className="w-12 h-12 text-primary animate-pulse" />
                    ) : (
                        <PhoneIcon className="w-12 h-12 text-primary animate-pulse" />
                    )}
                    <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping"></div>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    {incomingCall.caller.email}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                    {incomingCall.type === 'video_call' ? 'Incoming Video Call...' : 'Incoming Call...'}
                </p>

                <div className="flex items-center justify-center gap-6">
                    <button
                        onClick={rejectCall}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all">
                            <XMarkIcon className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium text-slate-500 group-hover:text-red-600">Decline</span>
                    </button>

                    <button
                        onClick={acceptCall}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-all">
                            {incomingCall.type === 'video_call' ? (
                                <VideoCameraIcon className="w-6 h-6" />
                            ) : (
                                <PhoneIcon className="w-6 h-6" />
                            )}
                        </div>
                        <span className="text-xs font-medium text-slate-500 group-hover:text-green-600">Accept</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IncomingCallModal;
