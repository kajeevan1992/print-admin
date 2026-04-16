'use client';

type StorefrontFilterBarProps = {
  search: string;
  setSearch: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  sort: string;
  setSort: (value: string) => void;
  categories: Array<{ id: string; label: string }>;
};

export function StorefrontFilterBar({
  search,
  setSearch,
  category,
  setCategory,
  sort,
  setSort,
  categories
}: StorefrontFilterBarProps) {
  return (
    <div
      className="rounded-3xl border p-4"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="grid gap-3 md:grid-cols-[1.4fr_220px_220px]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products, categories, or print needs"
          className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
          style={{
            borderColor: 'var(--theme-border)',
            background: 'var(--theme-surface-alt)',
            color: 'var(--theme-text)'
          }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-2xl border px-4 py-3 text-sm outline-none"
          style={{
            borderColor: 'var(--theme-border)',
            background: 'var(--theme-surface-alt)',
            color: 'var(--theme-text)'
          }}
        >
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-2xl border px-4 py-3 text-sm outline-none"
          style={{
            borderColor: 'var(--theme-border)',
            background: 'var(--theme-surface-alt)',
            color: 'var(--theme-text)'
          }}
        >
          <option value="featured">Sort: Featured</option>
          <option value="popular">Sort: Popular</option>
          <option value="price-asc">Sort: Price (low to high)</option>
          <option value="price-desc">Sort: Price (high to low)</option>
        </select>
      </div>
    </div>
  );
}
