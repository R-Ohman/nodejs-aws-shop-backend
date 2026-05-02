import { products, Product } from "../data/products";

export const getAllProducts = async (): Promise<Product[]> => {
  return products;
};

export const getProductById = async (id: string): Promise<Product | null> => {
  const p = products.find((x) => x.id === id);
  return p ?? null;
};
