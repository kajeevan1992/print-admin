import { knowledgeArticlesMock, supportTicketsMock, type KnowledgeArticle, type SupportTicket } from '@/data/support';

type ConfigItemsPayload<T> = {
  ok?: boolean;
  data?: {
    metadataJson?: {
      items?: T[];
    };
  };
  error?: string;
};

let ticketsStore: SupportTicket[] = [...supportTicketsMock];
let articleStore: KnowledgeArticle[] = [...knowledgeArticlesMock];
let lastMode: 'database' | 'local' = 'local';
let lastError = '';

function nowStamp() {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function normaliseTicket(ticket: SupportTicket): SupportTicket {
  return {
    ...ticket,
    updatedAt: ticket.updatedAt || nowStamp(),
    assignee: ticket.assignee || 'Unassigned'
  };
}

function normaliseArticle(article: KnowledgeArticle): KnowledgeArticle {
  return {
    ...article,
    updatedAt: article.updatedAt || dateStamp(),
    author: article.author || 'Admin Ops',
    status: article.status || 'Draft'
  };
}

async function readItems<T>(key: string, fallback: T[]): Promise<T[]> {
  if (typeof fetch === 'undefined') return fallback;
  try {
    const response = await fetch(`/api/internal/config/${encodeURIComponent(key)}/items`, { cache: 'no-store' });
    const payload = (await response.json().catch(() => ({}))) as ConfigItemsPayload<T>;
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Internal support API failed.');
    const items = payload?.data?.metadataJson?.items;
    lastMode = 'database';
    lastError = '';
    return Array.isArray(items) && items.length ? items : fallback;
  } catch (error) {
    lastMode = 'local';
    lastError = error instanceof Error ? error.message : 'Unknown support API error.';
    return fallback;
  }
}

async function writeItems<T>(key: string, title: string, items: T[]): Promise<void> {
  if (typeof fetch === 'undefined') return;
  try {
    const response = await fetch(`/api/internal/config/${encodeURIComponent(key)}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: `${title} records`, items })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Internal support API save failed.');
    lastMode = 'database';
    lastError = '';
  } catch (error) {
    lastMode = 'local';
    lastError = error instanceof Error ? error.message : 'Unknown support API save error.';
  }
}

export const supportService = {
  getSyncStatus: () => ({ mode: lastMode, error: lastError }),

  listTickets: async () => {
    const items = await readItems<SupportTicket>('support-tickets', ticketsStore);
    ticketsStore = items.map(normaliseTicket);
    return ticketsStore;
  },

  listArticles: async () => {
    const items = await readItems<KnowledgeArticle>('knowledge-base-articles', articleStore);
    articleStore = items.map(normaliseArticle);
    return articleStore;
  },

  addTicket: async (ticket: Omit<SupportTicket, 'id' | 'updatedAt'>) => {
    const created: SupportTicket = {
      ...ticket,
      id: `T-${Math.floor(Math.random() * 9000) + 1000}`,
      updatedAt: nowStamp()
    };
    ticketsStore = [created, ...ticketsStore];
    await writeItems('support-tickets', 'Support Tickets', ticketsStore);
    return created;
  },

  updateTicket: async (id: string, patch: Partial<Omit<SupportTicket, 'id'>>) => {
    let updated: SupportTicket | undefined;
    ticketsStore = ticketsStore.map((ticket) => {
      if (ticket.id !== id) return ticket;
      updated = { ...ticket, ...patch, updatedAt: nowStamp() };
      return updated;
    });
    await writeItems('support-tickets', 'Support Tickets', ticketsStore);
    return updated;
  },

  deleteTicket: async (id: string) => {
    ticketsStore = ticketsStore.filter((ticket) => ticket.id !== id);
    await writeItems('support-tickets', 'Support Tickets', ticketsStore);
  },

  resetTickets: async () => {
    ticketsStore = [...supportTicketsMock];
    await writeItems('support-tickets', 'Support Tickets', ticketsStore);
    return ticketsStore;
  },

  addArticle: async (article: Omit<KnowledgeArticle, 'id' | 'updatedAt'>) => {
    const created: KnowledgeArticle = {
      ...article,
      id: `KB-${Math.floor(Math.random() * 900) + 100}`,
      updatedAt: dateStamp()
    };
    articleStore = [created, ...articleStore];
    await writeItems('knowledge-base-articles', 'Knowledge Base Articles', articleStore);
    return created;
  }
};
