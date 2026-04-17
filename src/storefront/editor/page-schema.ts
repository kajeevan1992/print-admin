export type SectionType = 'hero' | 'text' | 'cta';

export type Section = {
  id: string;
  type: SectionType;
  props: Record<string, any>;
};

export type PageSchema = {
  id: string;
  name: string;
  sections: Section[];
};

export type SectionPreset = {
  id: string;
  label: string;
  type: SectionType;
  hint: string;
  create: () => Section;
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export const sectionPresets: SectionPreset[] = [
  {
    id: 'hero-standard',
    label: 'Hero · Standard',
    type: 'hero',
    hint: 'Headline, subtitle, and primary top-of-page intro.',
    create: () => ({
      id: uid('hero'),
      type: 'hero',
      props: { title: 'New hero title', subtitle: 'New hero subtitle' }
    })
  },
  {
    id: 'hero-campaign',
    label: 'Hero · Campaign',
    type: 'hero',
    hint: 'Promotional hero for launches, seasonal campaigns, and offers.',
    create: () => ({
      id: uid('hero'),
      type: 'hero',
      props: {
        title: 'Seasonal campaign headline',
        subtitle: 'Promote a featured collection, discount, or campaign landing page.'
      }
    })
  },
  {
    id: 'text-standard',
    label: 'Text · Standard',
    type: 'text',
    hint: 'Simple editable content block.',
    create: () => ({
      id: uid('text'),
      type: 'text',
      props: { text: 'New editable text block' }
    })
  },
  {
    id: 'text-story',
    label: 'Text · Brand Story',
    type: 'text',
    hint: 'Use for about sections, print process, or value messaging.',
    create: () => ({
      id: uid('text'),
      type: 'text',
      props: {
        text: 'Tell your brand story, explain your print offer, or describe what makes this storefront different.'
      }
    })
  },
  {
    id: 'cta-standard',
    label: 'CTA · Standard',
    type: 'cta',
    hint: 'Primary call-to-action with supporting description.',
    create: () => ({
      id: uid('cta'),
      type: 'cta',
      props: { label: 'Call to action', description: 'New call-to-action description' }
    })
  },
  {
    id: 'cta-shop',
    label: 'CTA · Shop Products',
    type: 'cta',
    hint: 'Preset CTA for storefront browsing journeys.',
    create: () => ({
      id: uid('cta'),
      type: 'cta',
      props: {
        label: 'Browse products',
        description: 'Guide customers into your product catalogue, featured categories, or promotional collection.'
      }
    })
  }
];

export const demoPage: PageSchema = {
  id: 'home',
  name: 'Homepage',
  sections: [
    {
      id: 's1',
      type: 'hero',
      props: {
        title: 'Welcome to your storefront',
        subtitle: 'This hero block is now editable live from the visual editor.'
      }
    },
    {
      id: 's2',
      type: 'text',
      props: {
        text: 'Use the editor controls to change this content and preview it immediately.'
      }
    },
    {
      id: 's3',
      type: 'cta',
      props: {
        label: 'Shop now',
        description: 'Call-to-action blocks will later connect to storefront routes and campaign pages.'
      }
    }
  ]
};
