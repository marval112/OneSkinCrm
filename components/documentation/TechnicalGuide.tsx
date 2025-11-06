
import React, { useContext } from 'react';
import { useTranslation } from '../../services/i18nService';
import { SearchContext } from '../pages/Documentation';
import CodeBlock from './CodeBlock';

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

function TechnicalGuide() {
    const { t } = useTranslation();
    const searchContext = useContext(SearchContext);
    const searchTerm = searchContext?.searchTerm ?? '';
    const sections = ['architecture', 'databaseSchema', 'apiReference', 'webhooks'];

     const filteredSections = sections.filter(key => {
        const section = t(`technicalGuide.${key}` as any);
        return !searchTerm ||
               section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
               section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
               (section.sql && section.sql.toLowerCase().includes(searchTerm.toLowerCase()));
    });

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {filteredSections.map(key => {
                 const section = t(`technicalGuide.${key}` as any);
                 return (
                    <div key={key} className="bg-white p-6 rounded-lg border border-slate-200">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">
                           <Highlight text={section.title} highlight={searchTerm} />
                        </h2>
                        <p className="text-slate-600 mb-4">
                           <Highlight text={section.description} highlight={searchTerm} />
                        </p>
                        {section.sql && (
                            <CodeBlock code={section.sql} language="sql" />
                        )}
                        {section.reference && (
                             <div className="font-mono text-sm space-y-4">
                                {Object.entries(section.reference).map(([service, methods]: [string, any]) => (
                                    <div key={service}>
                                        <h4 className="font-bold text-slate-700">{service}</h4>
                                        <ul className="list-disc pl-5 mt-2 text-slate-600">
                                            {methods.map((method: string) => <li key={method}><Highlight text={method} highlight={searchTerm} /></li>)}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                         {section.payloads && (
                             <div className="space-y-4">
                                {Object.entries(section.payloads).map(([event, payload]: [string, any]) => (
                                    <div key={event}>
                                        <h4 className="font-bold text-slate-700">{event}</h4>
                                        <CodeBlock code={JSON.stringify(payload, null, 2)} language="json" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                 );
            })}
             {filteredSections.length === 0 && (
                <p className="text-center text-slate-500 py-8">No technical documentation found matching your search.</p>
            )}
        </div>
    );
}

export default TechnicalGuide;
