import React from 'react';
import {
    OPENROUTER_FREE_MODELS,
    SCANNER_VISION_MODELS,
    getPreferredOpenRouterModel,
    setPreferredOpenRouterModel,
    isGeminiQuotaExhausted
} from '../../services/geminiService';
import { getOpenAIKey } from '../../services/aiSettingsService';
import { useTranslation } from '../../services/i18nService';

interface ModelSelectorProps {
    visionOnly?: boolean;
    scannerOnly?: boolean;
    compact?: boolean;
    className?: string;
    forceShow?: boolean; // Force show even if Gemini quota is not exhausted (for error dialogs)
}

const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
);

const ModelSelector: React.FC<ModelSelectorProps> = ({ visionOnly = false, scannerOnly = false, compact = false, className = '', forceShow = false }) => {
    const { language } = useTranslation();
    const [selectedModel, setSelectedModel] = React.useState<string>(getPreferredOpenRouterModel(visionOnly));
    const quotaExhausted = isGeminiQuotaExhausted();
    const openAIKey = getOpenAIKey();

    // Priority 1: OpenAI (Primary)
    if (openAIKey) {
        if (compact) {
            return (
                <div className={`flex items-center gap-1.5 ${className}`}>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Using:</span>
                    <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
                        OpenAI (GPT-4o)
                    </span>
                </div>
            );
        }
        return (
            <div className={`flex flex-col gap-1 ${className}`}>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                    Using Primary Model
                </label>
                <div className="w-full px-3 py-1.5 text-xs border border-green-200 dark:border-green-800 rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-medium flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    OpenAI (GPT-4o)
                </div>
            </div>
        );
    }

    // Don't render if Gemini is still active (unless forceShow is true, e.g., in error dialogs)
    if (!quotaExhausted && !forceShow) {
        return null;
    }

    // Filter models based on requirements
    let availableModels = OPENROUTER_FREE_MODELS;

    if (scannerOnly) {
        // Use limited scanner-specific models (4 best for OCR)
        availableModels = OPENROUTER_FREE_MODELS.filter(m => SCANNER_VISION_MODELS.includes(m.id));
    } else if (visionOnly) {
        // Use all vision-capable models
        availableModels = OPENROUTER_FREE_MODELS.filter(m => m.supportsVision);
    }

    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newModel = e.target.value;
        setSelectedModel(newModel);
        setPreferredOpenRouterModel(newModel, visionOnly);
    };

    const getLabel = () => {
        if (language === 'es') return 'Usando';
        if (language === 'pt') return 'Usando';
        return 'Using';
    };

    const currentModelName = OPENROUTER_FREE_MODELS.find(m => m.id === selectedModel)?.name || 'OpenRouter';

    if (compact) {
        return (
            <div className={`flex items-center gap-1.5 ${className}`}>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{getLabel()}:</span>
                <div className="relative inline-block">
                    <select
                        value={selectedModel}
                        onChange={handleModelChange}
                        className="appearance-none text-[10px] font-medium text-primary dark:text-blue-400 bg-transparent border-none pr-4 cursor-pointer focus:outline-none hover:underline"
                    >
                        {availableModels.map(model => (
                            <option key={model.id} value={model.id}>
                                {model.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDownIcon className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-primary dark:text-blue-400 pointer-events-none" />
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                {getLabel()} OpenRouter
            </label>
            <div className="relative">
                <select
                    value={selectedModel}
                    onChange={handleModelChange}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    {availableModels.map(model => (
                        <option key={model.id} value={model.id}>
                            {model.name}
                        </option>
                    ))}
                </select>
                <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500">
                {language === 'es' ? 'Cuota de Gemini agotada' : language === 'pt' ? 'Cota Gemini esgotada' : 'Gemini quota exhausted'}
            </p>
        </div>
    );
};

export default ModelSelector;
