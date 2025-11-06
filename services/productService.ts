import type { Product, ProductCategory } from '../types';
import * as db from './databaseService';

export const getProducts = async (): Promise<Product[]> => db.getAll<Product>('products');

export const createProduct = async (productData: Omit<Product, 'id'>): Promise<Product> => {
    return db.create<Product>('products', productData);
};

export const updateProduct = async (updatedProductData: Product): Promise<Product> => {
    return db.update<Product>('products', updatedProductData);
};

export const deleteProduct = async (productId: number): Promise<void> => {
    return db.remove('products', productId);
};

export const getProductCategories = async (): Promise<ProductCategory[]> => db.getAll<ProductCategory>('product_categories');

export const createProductCategory = async (categoryData: Omit<ProductCategory, 'id'>): Promise<ProductCategory> => {
    return db.create<ProductCategory>('product_categories', categoryData);
};

export const updateProductCategory = async (updatedCategoryData: ProductCategory): Promise<ProductCategory> => {
    return db.update<ProductCategory>('product_categories', updatedCategoryData);
};

export const deleteProductCategory = async (categoryId: number): Promise<void> => {
    return db.remove('product_categories', categoryId);
};