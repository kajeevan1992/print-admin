export type KPI = {
  label: string;
  value: string;
  trend: string;
};

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
