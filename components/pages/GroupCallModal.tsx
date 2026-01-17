import React, { useState, useEffect } from 'react';
import type { User } from '../../types/domain';

interface GroupCallModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    onStartCall: (selectedUserIds: number[]) => void;
}

const GroupCallModal: React.FC<GroupCallModalProps> = ({ isOpen, onClose, users, onStartCall }) => {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Reset selection when modal opens
    useEffect(() => {
        if (isOpen) {
            // Select all by default
            setSelectedIds(new Set(users.map(u => u.id)));
        }
    }, [isOpen, users]);

    const toggleUser = (userId: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedIds(newSelected);
    };

    const handleStart = () => {
        onStartCall(Array.from(selectedIds));
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Start Group Call</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select participants to invite</p>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                        {users.map(user => (
                            <label
                                key={user.id}
                                className="flex items-center p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(user.id)}
                                    onChange={() => toggleUser(user.id)}
                                    className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary"
                                />
                                <div className="ml-3">
                                    <div className="font-medium text-slate-900 dark:text-white">{user.email}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{user.role}</div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleStart}
                        disabled={selectedIds.size === 0}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                        </svg>
                        Start Call ({selectedIds.size})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupCallModal;
