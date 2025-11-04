import React, { useState, useContext } from 'react';
import Modal from './Modal';
import { sendEmail } from '../../services/emailService';
import { ToastContext } from '../../contexts/ToastContext';

interface EmailComposerProps {
  recipient: { name: string; email: string };
  onClose: () => void;
  onSent: () => void;
}

const PaperAirplaneIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
);

function EmailComposer({ recipient, onClose, onSent }: EmailComposerProps) {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const toastContext = useContext(ToastContext);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !body.trim()) {
            toastContext?.showToast('Subject and body cannot be empty.', 'warning');
            return;
        }
        setIsLoading(true);
        try {
            await sendEmail(recipient.email, subject, body, toastContext);
            onSent();
            onClose();
        } catch (error) {
            // Error toast is handled by the service
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal title={`Emailing ${recipient.name}`} onClose={onClose}>
            <form onSubmit={handleSend}>
                <div className="p-6 space-y-4 dark:text-slate-300">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-400">To</label>
                        <input
                            type="text"
                            value={recipient.email}
                            readOnly
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm bg-slate-100 dark:bg-slate-700 dark:border-slate-600"
                        />
                    </div>
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Subject</label>
                        <input
                            type="text"
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="body" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Message</label>
                        <textarea
                            id="body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={8}
                            className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            required
                        />
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 sm:px-6 flex justify-between items-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Markdown is supported.</p>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-md text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex items-center px-4 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover disabled:bg-slate-400"
                        >
                            {isLoading ? 'Sending...' : <><PaperAirplaneIcon className="h-5 w-5 mr-2" /> Send</>}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}

export default EmailComposer;
