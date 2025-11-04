import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { 
  getProducts, createProduct, updateProduct, deleteProduct,
  getProductCategories, createProductCategory, updateProductCategory, deleteProductCategory
} from '../../services/productService';
import type { Product, ProductCategory } from '../../types';
import { ToastContext } from '../../contexts/ToastContext';
import Modal from '../common/Modal';
import { useTranslation } from '../../services/i18nService';

// ICONS
const EditIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>;
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;

// --- FORMS ---

const CategoryFamilyForm = ({
  initialData, onSave, onCancel
}: {
  initialData: Partial<ProductCategory>,
  onSave: (data: Omit<ProductCategory, 'id'>) => void,
  onCancel: () => void,
}) => {
    const [formData, setFormData] = useState({ name: initialData.name || '', description: initialData.description || '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        onSave({ ...formData, parent_id: initialData.parent_id || null });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium">Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 w-full border rounded-md px-3 py-2" required />
                </div>
                <div>
                    <label className="block text-sm font-medium">Description</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
            </div>
            <div className="bg-slate-50 px-4 py-3 sm:px-6 flex flex-row-reverse">
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md ml-3">Save</button>
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-white border rounded-md">Cancel</button>
            </div>
        </form>
    );
};

const ProductForm = ({
  initialData, onSave, onCancel
}: {
  initialData: Partial<Product>,
  onSave: (data: Omit<Product, 'id'>) => void,
  onCancel: () => void,
}) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: initialData.name || '',
        sku: initialData.sku || '',
        description: initialData.description || '',
        price: initialData.price || 0,
        active: initialData.active !== undefined ? initialData.active : true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.sku.trim() || formData.price <= 0) return;
        onSave({ ...formData, category_id: initialData.category_id! });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium">Product Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 w-full border rounded-md px-3 py-2" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium">SKU</label>
                    <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="mt-1 w-full border rounded-md px-3 py-2" required />
                </div>
                <div>
                    <label className="block text-sm font-medium">Description</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="mt-1 w-full border rounded-md px-3 py-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Price (€)</label>
                    <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="mt-1 w-full border rounded-md px-3 py-2" required />
                </div>
                <div className="flex items-center">
                    <input type="checkbox" id="active" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="h-4 w-4 text-primary border-slate-300 rounded" />
                    <label htmlFor="active" className="ml-2 block text-sm">{t('products.active')}</label>
                </div>
            </div>
            <div className="bg-slate-50 px-4 py-3 sm:px-6 flex flex-row-reverse">
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md ml-3">Save</button>
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-white border rounded-md">Cancel</button>
            </div>
        </form>
    );
};


// --- MAIN COMPONENT ---
function Products() {
  const [allCategories, setAllCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null);
  const [modalState, setModalState] = useState<{ type: 'category' | 'family' | 'product', mode: 'create' | 'edit', data?: any } | null>(null);
  const toastContext = useContext(ToastContext);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
        const [categoriesData, productsData] = await Promise.all([getProductCategories(), getProducts()]);
        setAllCategories(categoriesData);
        setProducts(productsData);
    } catch(e) {
        toastContext?.showToast('Failed to load catalog data.', 'danger');
    } finally {
        setLoading(false);
    }
  }, [toastContext]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categories = useMemo(() => allCategories.filter(c => c.parent_id === null), [allCategories]);
  const families = useMemo(() => selectedCategoryId ? allCategories.filter(c => c.parent_id === selectedCategoryId) : [], [allCategories, selectedCategoryId]);
  const filteredProducts = useMemo(() => selectedFamilyId ? products.filter(p => p.category_id === selectedFamilyId) : [], [products, selectedFamilyId]);

  const handleSelectCategory = (id: number) => {
    setSelectedCategoryId(id === selectedCategoryId ? null : id);
    setSelectedFamilyId(null);
  };

  const handleSelectFamily = (id: number) => {
    setSelectedFamilyId(id === selectedFamilyId ? null : id);
  };

  const handleSave = async (formData: any) => {
    const { type, mode, data: originalData } = modalState!;
    try {
        if (type === 'category' || type === 'family') {
            const dataToSave: Omit<ProductCategory, 'id'> = {
                name: formData.name,
                description: formData.description,
                parent_id: formData.parent_id
            };
            if (mode === 'create') {
                await createProductCategory(dataToSave);
            } else {
                await updateProductCategory({ ...originalData, ...dataToSave });
            }
        } else if (type === 'product') {
             const dataToSave: Omit<Product, 'id'> = {
                name: formData.name,
                sku: formData.sku,
                description: formData.description,
                price: formData.price,
                active: formData.active,
                category_id: formData.category_id,
            };
            if (mode === 'create') {
                await createProduct(dataToSave);
            } else {
                await updateProduct({ ...originalData, ...dataToSave });
            }
        }
        toastContext?.showToast(`${type} saved successfully!`, 'success');
        setModalState(null);
        fetchData();
    } catch (e) {
        toastContext?.showToast(`Failed to save ${type}.`, 'danger');
    }
  };
  
  const handleDelete = async (type: 'category' | 'family' | 'product', id: number) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
        if (type === 'category') {
            if (families.length > 0) {
                toastContext?.showToast('Cannot delete a category that has families.', 'warning');
                return;
            }
            await deleteProductCategory(id);
            setSelectedCategoryId(null);
        } else if (type === 'family') {
             if (filteredProducts.length > 0) {
                toastContext?.showToast('Cannot delete a family that has products.', 'warning');
                return;
            }
            await deleteProductCategory(id);
            setSelectedFamilyId(null);
        } else if (type === 'product') {
            await deleteProduct(id);
        }
        toastContext?.showToast(`${type} deleted.`, 'success');
        fetchData();
    } catch(e) {
        toastContext?.showToast(`Failed to delete ${type}.`, 'danger');
    }
  };

  const renderModalContent = () => {
    if (!modalState) return null;
    const { type, mode, data } = modalState;
    const title = `${mode === 'create' ? 'New' : 'Edit'} ${type.charAt(0).toUpperCase() + type.slice(1)}`;

    return (
        <Modal title={title} onClose={() => setModalState(null)}>
            {(type === 'category' || type === 'family') &&
                <CategoryFamilyForm
                    initialData={data}
                    onSave={handleSave}
                    onCancel={() => setModalState(null)}
                />
            }
            {type === 'product' &&
                <ProductForm
                    initialData={data}
                    onSave={handleSave}
                    onCancel={() => setModalState(null)}
                />
            }
        </Modal>
    );
  };

  return (
    <>
      <div className="flex h-[calc(100vh-150px)] bg-white rounded-lg shadow-md overflow-hidden">
        {/* Categories Column */}
        <div className="w-1/3 border-r flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Categories</h2>
            <button onClick={() => setModalState({ type: 'category', mode: 'create', data: {} })} className="p-1 text-primary hover:bg-primary/10 rounded-full"><PlusIcon className="h-6 w-6" /></button>
          </div>
          <div className="overflow-y-auto">
            {categories.map(cat => (
              <div key={cat.id} onClick={() => handleSelectCategory(cat.id)} className={`p-3 cursor-pointer border-l-4 ${selectedCategoryId === cat.id ? 'bg-primary/10 border-primary' : 'border-transparent hover:bg-slate-50'}`}>
                <div className="flex justify-between items-center">
                  <span className="font-medium">{cat.name}</span>
                  <div>
                    <button onClick={e => { e.stopPropagation(); setModalState({ type: 'category', mode: 'edit', data: cat })}} className="p-1 hover:text-primary"><EditIcon className="h-4 w-4" /></button>
                    <button onClick={e => { e.stopPropagation(); handleDelete('category', cat.id)}} className="p-1 hover:text-danger"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Families Column */}
        <div className={`w-1/3 border-r flex flex-col ${!selectedCategoryId ? 'bg-slate-50' : ''}`}>
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Product Families</h2>
            {selectedCategoryId && <button onClick={() => setModalState({ type: 'family', mode: 'create', data: { parent_id: selectedCategoryId } })} className="p-1 text-primary hover:bg-primary/10 rounded-full"><PlusIcon className="h-6 w-6" /></button>}
          </div>
          <div className="overflow-y-auto">
            {selectedCategoryId ? families.map(fam => (
              <div key={fam.id} onClick={() => handleSelectFamily(fam.id)} className={`p-3 cursor-pointer border-l-4 ${selectedFamilyId === fam.id ? 'bg-primary/10 border-primary' : 'border-transparent hover:bg-slate-50'}`}>
                 <div className="flex justify-between items-center">
                  <span className="font-medium">{fam.name}</span>
                  <div>
                    <button onClick={e => { e.stopPropagation(); setModalState({ type: 'family', mode: 'edit', data: fam })}} className="p-1 hover:text-primary"><EditIcon className="h-4 w-4" /></button>
                    <button onClick={e => { e.stopPropagation(); handleDelete('family', fam.id)}} className="p-1 hover:text-danger"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            )) : <p className="p-4 text-sm text-slate-500">Select a category to see its families.</p>}
          </div>
        </div>
        
        {/* Products Column */}
        <div className={`w-1/3 flex flex-col ${!selectedFamilyId ? 'bg-slate-50' : ''}`}>
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Products</h2>
            {selectedFamilyId && <button onClick={() => setModalState({ type: 'product', mode: 'create', data: { category_id: selectedFamilyId } })} className="p-1 text-primary hover:bg-primary/10 rounded-full"><PlusIcon className="h-6 w-6" /></button>}
          </div>
          <div className="overflow-y-auto">
             {selectedFamilyId ? (
                <table className="min-w-full">
                    <tbody className="divide-y">
                        {filteredProducts.map(prod => (
                            <tr key={prod.id} className="hover:bg-slate-50">
                                <td className="p-3">
                                    <p className="font-medium text-slate-900 dark:text-slate-100">{prod.name}</p>
                                    <p className="text-xs text-slate-400 font-mono">{prod.sku}</p>
                                    <p className="text-sm text-slate-500">€{prod.price.toFixed(2)}</p>
                                </td>
                                <td className="p-3 text-right">
                                    <button onClick={() => setModalState({ type: 'product', mode: 'edit', data: prod })} className="p-1 hover:text-primary"><EditIcon className="h-4 w-4" /></button>
                                    <button onClick={() => handleDelete('product', prod.id)} className="p-1 hover:text-danger"><TrashIcon className="h-4 w-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             ) : <p className="p-4 text-sm text-slate-500">Select a family to see its products.</p>}
          </div>
        </div>
      </div>
      {renderModalContent()}
    </>
  );
}

export default Products;