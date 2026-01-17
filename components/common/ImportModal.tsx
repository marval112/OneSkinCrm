import React, { useState, useRef, useContext } from 'react';
import Modal from './Modal';
import { ToastContext } from '../../contexts/ToastContext';

interface ImportModalProps {
    title: string;
    requiredHeaders: string[];
    optionalHeaders: string[];
    onClose: () => void;
    onImport: (file: File) => Promise<void>;
}

const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);


const ImportModal: React.FC<ImportModalProps> = ({ title, requiredHeaders, optionalHeaders, onClose, onImport }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toastContext = useContext(ToastContext);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== 'text/csv') {
                toastContext?.showToast('Invalid file type. Please upload a .csv file.', 'danger');
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, dragging: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(dragging);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        handleDragEvents(e, false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type !== 'text/csv') {
                toastContext?.showToast('Invalid file type. Please upload a .csv file.', 'danger');
                return;
            }
            setFile(droppedFile);
        }
    };

    const handleImportClick = async () => {
        if (!file) {
            toastContext?.showToast('Please select a file to import.', 'warning');
            return;
        }
        setIsLoading(true);
        try {
            await onImport(file);
        } catch (error: any) {
            toastContext?.showToast(error.message || 'An unknown error occurred during import.', 'danger');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal title={title} onClose={onClose}>
            <div className="p-6 space-y-4">
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-blue-700">
                                Your CSV file must have a header row with the following columns.
                            </p>
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-sm">Required Columns:</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {requiredHeaders.map(h => <code key={h} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">{h}</code>)}
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-sm">Optional Columns:</h4>
                     <div className="flex flex-wrap gap-2 mt-1">
                        {optionalHeaders.map(h => <code key={h} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">{h}</code>)}
                    </div>
                </div>
                <p className="text-xs text-slate-500">To update existing records, include an `id` column with the corresponding record ID.</p>
                
                <div 
                    onDragEnter={(e) => handleDragEvents(e, true)}
                    onDragLeave={(e) => handleDragEvents(e, false)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`mt-4 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer ${isDragging ? 'border-primary bg-primary/10' : 'border-slate-300'}`}
                >
                    <div className="space-y-1 text-center">
                        <UploadIcon className="mx-auto h-12 w-12 text-slate-400"/>
                        {file ? (
                            <p className="font-medium text-primary">{file.name}</p>
                        ) : (
                            <div className="flex text-sm text-slate-600">
                                <p className="pl-1">Click to upload or drag and drop a .csv file</p>
                            </div>
                        )}
                        <p className="text-xs text-slate-500">CSV up to 5MB</p>
                    </div>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </div>
             <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                    onClick={handleImportClick}
                    disabled={isLoading || !file}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-hover sm:ml-3 sm:w-auto sm:text-sm disabled:bg-slate-400"
                >
                    {isLoading ? 'Importing...' : 'Start Import'}
                </button>
                <button type="button" onClick={onClose} disabled={isLoading} className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50">
                    Cancel
                </button>
            </div>
        </Modal>
    );
};

export default ImportModal;