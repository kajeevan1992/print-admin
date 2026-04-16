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
    { id: 's1', type: 'hero', props: { title: 'Welcome', subtitle: 'Edit me' }},
    { id: 's2', type: 'text', props: { text: 'Editable block' }}
  ]
};
