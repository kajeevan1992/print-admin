export const productCards = [
  { slug: 'standard-business-cards', category: 'business-cards', title: 'Standard Business Cards', text: 'Premium business cards with sharp print, clean stock options and simple artwork upload.', image: '/native-theme-assets/atlantis/business-card-front.svg', price: 'From £21.99' },
  { slug: 'a5-flyers', category: 'flyers', title: 'A5 Flyers', text: 'A popular flyer size for local promotions, menus, campaigns and event handouts.', image: '/native-theme-assets/atlantis/flyer-front.svg', price: 'From £18.40' },
  { slug: 'a4-posters', category: 'posters-large-format-prints', title: 'A4 Posters', text: 'Sharp poster printing for windows, counters, walls and local events.', image: '/native-theme-assets/atlantis/poster-main.svg', price: 'From £8.49' },
  { slug: 'stapled-booklets', category: 'booklets', title: 'Stapled Booklets', text: 'Booklets for programmes, events, guides, brochures and local businesses.', image: '/native-theme-assets/atlantis/hero-slide-2.svg', price: 'Quote ready' },
  { slug: 'roller-banners', category: 'signage', title: 'Roller Banners', text: 'Portable display banners for exhibitions, launches, events and shop promotions.', image: '/native-theme-assets/atlantis/poster-main.svg', price: 'Quote ready' },
];

export function titleFromSlug(slug: string) {
  return String(slug || '').replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
