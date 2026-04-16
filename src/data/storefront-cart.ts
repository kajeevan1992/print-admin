export type CartItem = {
  id: string;
  title: string;
  variant: string;
  quantity: number;
  turnaround: string;
  unitPrice: number;
  subtotal: number;
};

export const storefrontCartSeed: CartItem[] = [
  {
    id: 'cart-1',
    title: 'Standard Business Cards',
    variant: '500 / Premium uncoated / Standard turnaround',
    quantity: 1,
    turnaround: '2–3 days',
    unitPrice: 37,
    subtotal: 37
  },
  {
    id: 'cart-2',
    title: 'A5 Flyers',
    variant: '250 / Silk / Priority turnaround',
    quantity: 2,
    turnaround: '1–2 days',
    unitPrice: 29,
    subtotal: 58
  }
];
