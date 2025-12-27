import React, { useState, useEffect, useCallback, useContext } from 'react';
import { getUsers, createUser, bulkDeleteUsers, updateUser } from '../../services/userService.ts';
import type { User } from '../../types';
import { ToastContext } from '../../contexts/ToastContext';
import Modal from '../common/Modal';
import TableSkeleton from '../common/TableSkeleton';

const UserForm = ({ onSave, onCancel, user, initial }: { onSave: (data: Partial<User> & { password?: string }) => void; onCancel: () => void; user?: User | null; initial?: Partial<Pick<User, 'email' | 'role' | 'seller_code'>> }) => {
    const [formData, setFormData] = useState<{ email: string; password?: string; role: 'Admin' | 'Commercial' | 'BackOffice'; seller_code?: string }>({
        email: user?.email || initial?.email || '',
        password: '',
        role: ((user?.role || initial?.role || 'Commercial') as 'Admin' | 'Commercial' | 'BackOffice'),
        seller_code: user?.seller_code || initial?.seller_code || ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.email.trim()) newErrors.email = "Email is required.";
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid.";
        if (!user && !formData.password) newErrors.password = "Password is required.";
        else if (formData.password && formData.password.length < 6) newErrors.password = "Password must be at least 6 characters.";
        if (formData.seller_code && !/^[0-9]{3}$/.test(formData.seller_code)) newErrors.seller_code = "Seller code must be exactly 3 digits.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave({ ...(user ? { id: user.id } as any : {}), ...formData });
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                {!user && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                        <input type="password" name="password" value={formData.password || ''} onChange={handleChange} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                    <select name="role" value={formData.role} onChange={handleChange} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                        <option value="Commercial">Commercial</option>
                        <option value="Admin">Admin</option>
                        <option value="BackOffice">BackOffice</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Codigo Vendedor (3 dígitos)</label>
                    <input type="text" name="seller_code" maxLength={3} value={formData.seller_code || ''} onChange={handleChange} placeholder="Ej: 047" className="mt-1 w-32 border border-slate-300 rounded-md px-3 py-2 bg-white text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    {errors.seller_code && <p className="text-red-500 text-xs mt-1">{errors.seller_code}</p>}
                </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-hover sm:ml-3 sm:w-auto sm:text-sm">{user ? 'Save Changes' : 'Create User'}</button>
                <button type="button" onClick={onCancel} className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500 text-slate-700 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
            </div>
        </form>
    );
};

function Users() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [cloneInitial, setCloneInitial] = useState<Partial<Pick<User, 'email' | 'role' | 'seller_code'>> | null>(null);
    const [selected, setSelected] = useState<number[]>([]);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const toastContext = useContext(ToastContext);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (e) {
            toastContext?.showToast('Failed to load users.', 'danger');
        } finally {
            setLoading(false);
        }
    }, [toastContext]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleSaveUser = async (userData: Omit<User, 'id'>) => {
        try {
            await createUser(userData);
            toastContext?.showToast('User created successfully!', 'success');
            setIsModalOpen(false);
            fetchUsers();
        } catch (e) {
            toastContext?.showToast('Failed to create user. Email may already exist.', 'danger');
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelected(e.target.checked ? users.map(u => u.id) : []);
    };

    const handleSelectOne = (id: number) => {
        setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkDelete = async () => {
        try {
            await bulkDeleteUsers(selected);
            toastContext?.showToast('Users deleted.', 'success');
            setSelected([]);
            setConfirmDelete(false);
            fetchUsers();
        } catch {
            toastContext?.showToast('Failed to delete users.', 'danger');
        }
    };

    const handleUpdateUser = async (payload: Partial<User> & { password?: string }) => {
        try {
            if (!editingUser) return;
            // Merge updates; password handling would be in backend in a real app
            const updated: User = { ...editingUser, ...payload } as User;
            await updateUser(updated);
            toastContext?.showToast('User updated successfully!', 'success');
            setEditingUser(null);
            fetchUsers();
        } catch {
            toastContext?.showToast('Failed to update user.', 'danger');
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">User Management</h2>
                <div className="flex items-center gap-2">
                    {selected.length > 0 && (
                        <button onClick={() => setConfirmDelete(true)} className="px-2 py-1 text-xs bg-danger text-white font-semibold rounded-md hover:bg-danger-hover">Delete</button>
                    )}
                    <button onClick={() => { setCloneInitial(null); setIsModalOpen(true); }} className="px-2 py-1 text-xs bg-primary text-white font-semibold rounded-md hover:bg-primary-hover">
                        New User
                    </button>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-3 py-3"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 dark:border-slate-500 text-primary focus:ring-primary dark:bg-slate-600" onChange={handleSelectAll} checked={selected.length > 0 && selected.length === users.length} /></th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">Email</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">Role</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">Seller Code</th>
                            <th className="px-3 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {loading ? <TableSkeleton columns={2} rows={3} /> : users.map(user => (
                            <tr key={user.id}>
                                <td className="px-3 py-2"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 dark:border-slate-500 text-primary focus:ring-primary dark:bg-slate-600" checked={selected.includes(user.id)} onChange={() => handleSelectOne(user.id)} /></td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-slate-900 dark:text-slate-100">{user.email}</td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : user.role === 'BackOffice' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-900 dark:text-slate-100">{user.seller_code || '-'}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-right space-x-2">
                                    <button onClick={() => setEditingUser(user)} className="px-3 py-1 text-sm rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">Edit</button>
                                    <button
                                        onClick={() => {
                                            setCloneInitial({ email: '', role: user.role, seller_code: '' });
                                            setIsModalOpen(true);
                                        }}
                                        className="px-3 py-1 text-sm rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        title="Clone seller (prefill role and blank email/code)">
                                        Clone
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {loading ? <div className="text-center py-4">Loading...</div> : users.map(user => (
                    <div key={user.id} className="bg-white dark:bg-slate-700 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{user.email}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">Code: {user.seller_code || 'N/A'}</span>
                            </div>
                            <span className={`px-2 py-0.5 inline-flex text-[10px] font-bold uppercase leading-4 rounded-full ${user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : user.role === 'BackOffice' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'}`}>
                                {user.role}
                            </span>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-600">
                            <input type="checkbox" className="h-5 w-5 rounded border-slate-300 dark:border-slate-500 text-primary focus:ring-primary dark:bg-slate-600" checked={selected.includes(user.id)} onChange={() => handleSelectOne(user.id)} />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setEditingUser(user)}
                                    className="px-3 py-1.5 text-xs font-medium rounded border border-slate-200 dark:border-slate-500 bg-white dark:bg-slate-600 hover:bg-slate-50"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => {
                                        setCloneInitial({ email: '', role: user.role, seller_code: '' });
                                        setIsModalOpen(true);
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium rounded border border-slate-200 dark:border-slate-500 bg-white dark:bg-slate-600 hover:bg-slate-50"
                                >
                                    Clone
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <Modal title="Create New User" onClose={() => setIsModalOpen(false)}>
                    <UserForm initial={cloneInitial || undefined} onSave={handleSaveUser as any} onCancel={() => setIsModalOpen(false)} />
                </Modal>
            )}

            {editingUser && (
                <Modal title={`Edit User: ${editingUser.email}`} onClose={() => setEditingUser(null)}>
                    <UserForm user={editingUser} onSave={handleUpdateUser} onCancel={() => setEditingUser(null)} />
                </Modal>
            )}

            {confirmDelete && (
                <Modal title="Confirm Deletion" onClose={() => setConfirmDelete(false)}>
                    <div className="p-6">
                        <p>Delete {selected.length} selected users?</p>
                        <div className="mt-6 flex justify-end gap-4">
                            <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-xs bg-slate-200 rounded-md hover:bg-slate-300">Cancel</button>
                            <button onClick={handleBulkDelete} className="px-2 py-1 text-xs bg-danger text-white rounded-md hover:bg-danger-hover">Delete</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

export default Users;