export type Product = {
  id: string;
  name: string;
  category: string;
  vendor: string;
  sku: string;
  price: number;
  published: boolean;
  global: boolean;
  updatedAt: string;
};

export type ProductAttribute = {
  id: string;
  name: string;
  type: string;
  required: boolean;
};

export type ProductFormValues = {
  name: string;
  category: string;
  pages: string;
  units: string;
  width: string;
  height: string;
  bleed: string;
};
