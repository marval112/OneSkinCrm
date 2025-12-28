import React, { useState, useContext } from 'react';
import Modal from './Modal';
import { sendEmail } from '../../services/emailService';
import { ToastContext } from '../../contexts/ToastContext';
import { draftCommercialEmail, draftCustomerFollowUpEmail } from '../../services/geminiService';
import type { Lead, Customer } from '../../types';

interface EmailComposerProps {
    recipient: { name: string; email: string };
    initialSubject?: string;
    initialBody?: string;
    inline?: boolean;
    leadData?: Lead;
    customerData?: Customer;
    onClose: () => void;
    onSent: () => void;
}

const PaperAirplaneIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
);

function EmailComposer({ recipient, initialSubject = '', initialBody = '', inline = false, leadData, customerData, onClose, onSent }: EmailComposerProps) {
    const [subject, setSubject] = useState(initialSubject);
    const [body, setBody] = useState(initialBody);
    const [isLoading, setIsLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiLanguage, setAiLanguage] = useState<'English' | 'Spanish' | 'Portuguese'>('English');
    const toastContext = useContext(ToastContext);

    const handleDraftWithAI = async () => {
        if (!leadData && !customerData) return;
        setAiLoading(true);
        try {
            let draft;
            if (customerData) {
                draft = await draftCustomerFollowUpEmail(customerData, [], aiLanguage);
            } else if (leadData) {
                draft = await draftCommercialEmail(
                    leadData.name,
                    leadData.company || 'your company',
                    aiLanguage
                );
            }

            if (draft) {
                setSubject(draft.subject);
                setBody(draft.body);
                toastContext?.showToast('AI draft generated successfully!', 'success');
            }
        } catch (error) {
            console.error('AI draft error:', error);
            toastContext?.showToast('Failed to generate AI draft', 'danger');
        } finally {
            setAiLoading(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !body.trim()) {
            toastContext?.showToast('Subject and body cannot be empty.', 'warning');
            return;
        }
        setIsLoading(true);
        try {
            const result = await sendEmail({ to: [recipient.email], subject, text: body });
            if (result.ok) {
                onSent();
                onClose();
            } else {
                toastContext?.showToast(result.error || 'Failed to send email', 'danger');
            }
        } catch (error) {
            console.error(error);
            toastContext?.showToast('An unexpected error occurred', 'danger');
        } finally {
            setIsLoading(false);
        }
    };

    const formContent = (
        <form onSubmit={handleSend}>
            <div className="p-6 space-y-4 dark:text-slate-300">
                {(leadData || customerData) && (
                    <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-md border border-slate-200 dark:border-slate-600">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">AI Email Assistant</h3>
                        <div className="flex items-center gap-2">
                            <select
                                value={aiLanguage}
                                onChange={(e) => setAiLanguage(e.target.value as 'English' | 'Spanish' | 'Portuguese')}
                                className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="English">English</option>
                                <option value="Spanish">Spanish</option>
                                <option value="Portuguese">Portuguese</option>
                            </select>
                            <button
                                type="button"
                                onClick={handleDraftWithAI}
                                disabled={aiLoading}
                                className="px-4 py-1.5 text-sm bg-primary text-white rounded-md hover:bg-primary-hover disabled:bg-slate-400 disabled:cursor-not-allowed"
                            >
                                {aiLoading ? 'Generating...' : 'Draft with AI'}
                            </button>
                        </div>
                    </div>
                )}
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
    );

    if (inline) {
        return <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">{formContent}</div>;
    }

    return (
        <Modal title={`Emailing ${recipient.name}`} onClose={onClose}>
            {formContent}
        </Modal>
    );
}

export default EmailComposer;
