
import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from '../../services/i18nService';
import { SearchContext } from '../pages/Documentation';

const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>;

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

// FIX: Explicitly type as React.FC to correctly handle the 'key' prop from mapping.
const AccordionItem: React.FC<{ question: string; answer: string, searchTerm: string }> = ({ question, answer, searchTerm }) => {
    const [isOpen, setIsOpen] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        if (searchTerm && (question.toLowerCase().includes(searchTerm.toLowerCase()) || answer.toLowerCase().includes(searchTerm.toLowerCase()))) {
            setIsOpen(true);
        } else if (!searchTerm) {
            setIsOpen(false);
        }
    }, [searchTerm, question, answer]);

    return (
        <div className="border-b">
            <button
                className="w-full flex justify-between items-center text-left py-4 px-2 hover:bg-slate-50"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="font-medium text-slate-800"><Highlight text={question} highlight={searchTerm} /></span>
                <ChevronDownIcon className={`h-5 w-5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div
                ref={contentRef}
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: isOpen ? `${contentRef.current?.scrollHeight}px` : '0px' }}
            >
                <div className="p-4 pt-0 text-slate-600"><Highlight text={answer} highlight={searchTerm} /></div>
            </div>
        </div>
    );
};

function FAQ() {
    const { t } = useTranslation();
    const searchContext = useContext(SearchContext);
    const searchTerm = searchContext?.searchTerm ?? '';
    const categories = ['general', 'leads', 'customers', 'deals', 'integrations'];

    const filteredCategories = useMemo(() => {
        if (!searchTerm) return categories;
        return categories.filter(catKey => {
            const category = t(`faq.${catKey}` as any);
            return category.items.some((item: {q: string, a: string}) =>
                item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.a.toLowerCase().includes(searchTerm.toLowerCase())
            );
        });
    }, [searchTerm, t, categories]);


    return (
        <div className="max-w-4xl mx-auto">
            {filteredCategories.map(catKey => {
                const category = t(`faq.${catKey}` as any);
                const items = category.items.filter((item: {q: string, a: string}) =>
                    !searchTerm ||
                    item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.a.toLowerCase().includes(searchTerm.toLowerCase())
                );
                
                if (items.length === 0) return null;

                return (
                    <div key={catKey} className="mb-8">
                        <h2 className="text-2xl font-bold mb-4 text-slate-800"><Highlight text={category.title} highlight={searchTerm} /></h2>
                        <div>
                            {items.map((item: { q: string; a: string }, index: number) => (
                                <AccordionItem key={index} question={item.q} answer={item.a} searchTerm={searchTerm} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default FAQ;