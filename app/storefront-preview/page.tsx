'use client';

import { useEffect, useState } from 'react';

export default function Page() {
  const [products, setProducts] = useState<any[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/internal/catalog/storefront-products');
    const json = await res.json();
    setProducts(json.data?.items || []);

    const cartRes = await fetch('/api/internal/storefront/cart');
    const cartJson = await cartRes.json();
    setCartCount(cartJson.data?.items?.length || 0);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addToCart(p: any) {
    await fetch('/api/internal/storefront/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: p.id,
        productSlug: p.slug,
        productName: p.name,
        quantity: 250
      })
    });

    alert('Added to cart');
    load();
  }

  if (loading) return <div style={{ padding: 20 }}>Loading storefront...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Storefront</h1>

      <div style={{ marginBottom: 20 }}>
        Cart: {cartCount}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {products.map(p => (
          <div key={p.id} style={{ border: '1px solid #ccc', padding: 10 }}>
            <h2>{p.name}</h2>
            <p>£{(p.priceFromMinor / 100).toFixed(2)}</p>

            <button onClick={() => addToCart(p)}>
              Add to cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
