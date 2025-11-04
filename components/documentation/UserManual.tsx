import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from '../../services/i18nService';
import { SearchContext } from '../pages/Documentation';
import ReactMarkdown from 'react-markdown';

const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;

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

const Section = ({ title, content, searchTerm, initiallyOpen = false }: { title: string, content: string, searchTerm: string, initiallyOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(initiallyOpen);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (searchTerm && content.toLowerCase().includes(searchTerm.toLowerCase())) {
            setIsOpen(true);
        } else if (!searchTerm) {
            setIsOpen(initiallyOpen);
        }
    }, [searchTerm, content, initiallyOpen]);

    return (
        <div className="border-b border-slate-200">
            <button
                className="w-full flex justify-between items-center text-left p-4 hover:bg-slate-50"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h3 className="text-lg font-semibold text-slate-800"><Highlight text={title} highlight={searchTerm} /></h3>
                <ChevronRightIcon className={`h-5 w-5 text-slate-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            <div
                ref={contentRef}
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: isOpen ? `${contentRef.current?.scrollHeight}px` : '0px' }}
            >
                <div className="prose max-w-none p-4 pt-0">
                   <ReactMarkdown
                        components={{
                            p: ({node, ...props}) => <p className="mb-4" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4" {...props} />,
                            li: ({node, ...props}) => <li className="mb-2" {...props} />,
                            code: ({node, ...props}) => <code className="bg-slate-100 text-sm rounded px-1 py-0.5" {...props} />,
                            img: ({node, ...props}) => <img className="rounded-md border border-slate-200" {...props} />
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
};

function UserManual() {
    const { t } = useTranslation();
    const searchContext = useContext(SearchContext);
    const searchTerm = searchContext?.searchTerm ?? '';
    const [activeSection, setActiveSection] = useState('dashboard');
    const sections = ['dashboard', 'leads', 'customers', 'deals', 'products', 'reports', 'webhooks', 'integrations', 'alerts'];

    const filteredSections = useMemo(() => {
        if (!searchTerm) return sections;
        return sections.filter(sectionKey => {
            const section = t(`userManual.${sectionKey}` as any);
            return section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   section.content.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [searchTerm, t, sections]);
    
    const scrollToSection = (id: string) => {
        const element = document.getElementById(`manual-${id}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveSection(id);
    };

    return (
        <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <nav className="w-full md:w-1/4 lg:w-1/5">
                <h2 className="font-semibold mb-2">{t('userManual.navigation')}</h2>
                <ul>
                    {filteredSections.map(sectionKey => (
                        <li key={sectionKey}>
                            <button
                                onClick={() => scrollToSection(sectionKey)}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                                    activeSection === sectionKey ? 'bg-primary text-white font-semibold' : 'hover:bg-slate-100'
                                }`}
                            >
                                <Highlight text={t(`userManual.${sectionKey}.title`)} highlight={searchTerm} />
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Content */}
            <main className="flex-1">
                {filteredSections.map((sectionKey, index) => {
                    const section = t(`userManual.${sectionKey}` as any);
                    return (
                        <div id={`manual-${sectionKey}`} key={sectionKey} className="mb-4">
                             <Section
                                title={section.title}
                                content={section.content}
                                searchTerm={searchTerm}
                                initiallyOpen={index === 0 && !searchTerm}
                            />
                        </div>
                    );
                })}
            </main>
        </div>
    );
}

export default UserManual;
