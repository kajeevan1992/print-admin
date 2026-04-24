import { knowledgeArticlesMock, supportTicketsMock, type KnowledgeArticle, type SupportTicket } from '@/data/support';

let ticketsStore: SupportTicket[] = [...supportTicketsMock];
let articleStore: KnowledgeArticle[] = [...knowledgeArticlesMock];

function nowStamp() {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

export const supportService = {
  listTickets: async () => ticketsStore,
  listArticles: async () => articleStore,
  addTicket: async (ticket: Omit<SupportTicket, 'id' | 'updatedAt'>) => {
    const created: SupportTicket = {
      ...ticket,
      id: `T-${Math.floor(Math.random() * 9000) + 1000}`,
      updatedAt: nowStamp()
    };
    ticketsStore = [created, ...ticketsStore];
    return created;
  },
  updateTicket: async (id: string, patch: Partial<Omit<SupportTicket, 'id'>>) => {
    let updated: SupportTicket | undefined;
    ticketsStore = ticketsStore.map((ticket) => {
      if (ticket.id !== id) return ticket;
      updated = { ...ticket, ...patch, updatedAt: nowStamp() };
      return updated;
    });
    return updated;
  },
  deleteTicket: async (id: string) => {
    ticketsStore = ticketsStore.filter((ticket) => ticket.id !== id);
  },
  resetTickets: async () => {
    ticketsStore = [...supportTicketsMock];
    return ticketsStore;
  },
  addArticle: async (article: Omit<KnowledgeArticle, 'id' | 'updatedAt'>) => {
    const created: KnowledgeArticle = {
      ...article,
      id: `KB-${Math.floor(Math.random() * 900) + 100}`,
      updatedAt: new Date().toISOString().slice(0, 10)
    };
    articleStore = [created, ...articleStore];
    return created;
  }
};
