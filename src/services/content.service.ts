import { contentRecordsSeed, htmlSnippetsSeed, type ContentKind, type ContentRecord, type HtmlSnippet } from '@/data/content';

const CONTENT_KEY = 'print-admin-content-records';
const SNIPPETS_KEY = 'print-admin-html-snippets';

const isBrowser = typeof window !== 'undefined';

function readRecords(): ContentRecord[] {
  if (!isBrowser) return contentRecordsSeed;
  const raw = window.localStorage.getItem(CONTENT_KEY);
  if (!raw) return contentRecordsSeed;
  try {
    return JSON.parse(raw) as ContentRecord[];
  } catch {
    return contentRecordsSeed;
  }
}

function writeRecords(items: ContentRecord[]) {
  if (!isBrowser) return;
  window.localStorage.setItem(CONTENT_KEY, JSON.stringify(items));
}

function readSnippets(): HtmlSnippet[] {
  if (!isBrowser) return htmlSnippetsSeed;
  const raw = window.localStorage.getItem(SNIPPETS_KEY);
  if (!raw) return htmlSnippetsSeed;
  try {
    return JSON.parse(raw) as HtmlSnippet[];
  } catch {
    return htmlSnippetsSeed;
  }
}

function writeSnippets(items: HtmlSnippet[]) {
  if (!isBrowser) return;
  window.localStorage.setItem(SNIPPETS_KEY, JSON.stringify(items));
}

export const contentService = {
  list(kind: ContentKind) {
    return readRecords()
      .filter((item) => item.kind === kind)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  save(record: Omit<ContentRecord, 'id' | 'updatedAt'> & { id?: string }) {
    const items = readRecords();
    const next: ContentRecord = {
      ...record,
      id: record.id ?? `cnt-${record.kind}-${Math.random().toString(36).slice(2, 8)}`,
      updatedAt: new Date().toISOString().slice(0, 10)
    };
    const updated = items.some((item) => item.id === next.id)
      ? items.map((item) => (item.id === next.id ? next : item))
      : [next, ...items];
    writeRecords(updated);
    return next;
  },
  remove(id: string) {
    writeRecords(readRecords().filter((item) => item.id !== id));
  }
};

export const htmlSnippetsService = {
  list() {
    return readSnippets().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  save(snippet: Omit<HtmlSnippet, 'id' | 'updatedAt'> & { id?: string }) {
    const items = readSnippets();
    const next: HtmlSnippet = {
      ...snippet,
      id: snippet.id ?? `snippet-${Math.random().toString(36).slice(2, 8)}`,
      updatedAt: new Date().toISOString().slice(0, 10)
    };
    const updated = items.some((item) => item.id === next.id)
      ? items.map((item) => (item.id === next.id ? next : item))
      : [next, ...items];
    writeSnippets(updated);
    return next;
  },
  remove(id: string) {
    writeSnippets(readSnippets().filter((item) => item.id !== id));
  }
};
