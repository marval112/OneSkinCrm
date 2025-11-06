import React, { useContext } from 'react';
import { useTranslation } from '../../services/i18nService';
import { SearchContext } from '../pages/Documentation';
import ReactMarkdown from 'react-markdown';

const Highlight = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight) return <>{text}</>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-200">{part}</mark>
                ) : (
                    part
                )
            )}
        </span>
    );
};

function Tutorials() {
    const { t } = useTranslation();
    const searchContext = useContext(SearchContext);
    const searchTerm = searchContext?.searchTerm ?? '';
    const tutorialKeys = ['createLead', 'manageDeal', 'setupReport', 'createWebhook'];

    const filteredTutorials = tutorialKeys.filter(key => {
        const tutorial = t(`tutorials.${key}` as any);
        return !searchTerm ||
               tutorial.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
               tutorial.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
               tutorial.steps.some((step: string) => step.toLowerCase().includes(searchTerm.toLowerCase()));
    });
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {filteredTutorials.map(key => {
                const tutorial = t(`tutorials.${key}` as any);
                return (
                    <div key={key} className="bg-white p-6 rounded-lg border border-slate-200">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">
                            <Highlight text={tutorial.title} highlight={searchTerm} />
                        </h2>
                        <p className="text-slate-600 mb-6">
                            <Highlight text={tutorial.description} highlight={searchTerm} />
                        </p>
                        <div className="space-y-4">
                            {tutorial.steps.map((step: string, index: number) => (
                                <div key={index} className="flex items-start">
                                    <div className="flex-shrink-0 h-8 w-8 bg-primary text-white rounded-full flex items-center justify-center font-bold mr-4">
                                        {index + 1}
                                    </div>
                                    <div className="prose max-w-none pt-1">
                                         <ReactMarkdown
                                            components={{
                                                p: ({node, ...props}) => <Highlight text={props.children as string} highlight={searchTerm} />,
                                                strong: ({node, ...props}) => <strong><Highlight text={props.children as string} highlight={searchTerm} /></strong>,
                                                code: ({node, ...props}) => <code className="bg-slate-100 text-sm rounded px-1 py-0.5"><Highlight text={props.children as string} highlight={searchTerm} /></code>
                                            }}
                                         >
                                            {step}
                                         </ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
             {filteredTutorials.length === 0 && (
                <p className="text-center text-slate-500 py-8">No tutorials found matching your search.</p>
            )}
        </div>
    );
}

export default Tutorials;
