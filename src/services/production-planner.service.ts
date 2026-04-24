import { productionPlannerMock, type PlannerRecord } from '@/data/production-planner';

const KEY = 'admin_production_planner_store';

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

function save<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const productionPlannerService = {
  getPlans: async (): Promise<PlannerRecord[]> => load(KEY, productionPlannerMock),
  savePlan: async (plan: PlannerRecord) => {
    const items = load(KEY, productionPlannerMock);
    const next = items.some((item) => item.id === plan.id) ? items.map((item) => (item.id === plan.id ? plan : item)) : [plan, ...items];
    save(KEY, next);
    return plan;
  },
  deletePlan: async (id: string) => save(KEY, load(KEY, productionPlannerMock).filter((item) => item.id !== id)),
  resetPlans: async () => save(KEY, productionPlannerMock)
};
