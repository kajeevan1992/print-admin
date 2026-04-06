export type SupportTicket = {
  id: string;
  subject: string;
  customer: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Waiting' | 'Resolved';
  updatedAt: string;
  assignee: string;
};

export type KnowledgeArticle = {
  id: string;
  title: string;
  category: string;
  status: 'Draft' | 'Published';
  updatedAt: string;
  author: string;
};

export const supportTicketsMock: SupportTicket[] = [
  { id: 'T-8124', subject: 'Checkout customization request', customer: 'Acme Events', priority: 'High', status: 'Waiting', updatedAt: '2026-04-05 10:24', assignee: 'Mina Chen' },
  { id: 'T-8118', subject: 'Vendor proof mismatch', customer: 'North Retail', priority: 'Critical', status: 'In Progress', updatedAt: '2026-04-05 09:08', assignee: 'Alex Rivera' },
  { id: 'T-8099', subject: 'Store clone assistance', customer: 'Bright Print', priority: 'Medium', status: 'Resolved', updatedAt: '2026-04-04 16:42', assignee: 'Jordan Lee' },
  { id: 'T-8087', subject: 'API rate limit clarification', customer: 'Wholesale Hub', priority: 'Low', status: 'Open', updatedAt: '2026-04-04 12:11', assignee: 'Priya Shah' }
];

export const knowledgeArticlesMock: KnowledgeArticle[] = [
  { id: 'KB-101', title: 'How to launch a new storefront', category: 'Launch', status: 'Published', updatedAt: '2026-04-03', author: 'Admin Ops' },
  { id: 'KB-118', title: 'Pricing override troubleshooting', category: 'Pricing', status: 'Published', updatedAt: '2026-04-02', author: 'Finance Ops' },
  { id: 'KB-126', title: 'Proof approval workflow', category: 'Production', status: 'Published', updatedAt: '2026-04-01', author: 'Support' },
  { id: 'KB-130', title: 'Managing multi-store user access', category: 'Users', status: 'Draft', updatedAt: '2026-04-05', author: 'Admin Ops' }
];
