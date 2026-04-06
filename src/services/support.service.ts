import { knowledgeArticlesMock, supportTicketsMock, type KnowledgeArticle, type SupportTicket } from '@/data/support';

let ticketsStore: SupportTicket[] = [...supportTicketsMock];
let articleStore: KnowledgeArticle[] = [...knowledgeArticlesMock];

export const supportService = {
  listTickets: async () => ticketsStore,
  listArticles: async () => articleStore,
  addTicket: async (ticket: Omit<SupportTicket, 'id' | 'updatedAt'>) => {
    const created: SupportTicket = {
      ...ticket,
      id: `T-${Math.floor(Math.random() * 9000) + 1000}`,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };
    ticketsStore = [created, ...ticketsStore];
    return created;
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
