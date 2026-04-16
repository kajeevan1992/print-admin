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
