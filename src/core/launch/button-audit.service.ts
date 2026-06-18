import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

export type ButtonAuditSeverity = 'pass' | 'warning' | 'error' | 'info';
export type ButtonAuditFinding = { id: string; file: string; severity: ButtonAuditSeverity; label: string; detail: string; action?: string };

const ROOTS = ['src/modules', 'src/components', 'app'];
const EXTENSIONS = new Set(['.tsx', '.ts']);
const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);

function walk(dir: string, files: string[] = []) {
  const full = path.join(process.cwd(), dir);
  let entries: string[] = [];
  try { entries = readdirSync(full); } catch { return files; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const next = path.join(full, entry);
    const rel = path.relative(process.cwd(), next).replace(/\\/g, '/');
    let stats;
    try { stats = statSync(next); } catch { continue; }
    if (stats.isDirectory()) walk(rel, files);
    else if (EXTENSIONS.has(path.extname(entry))) files.push(rel);
  }
  return files;
}

function findLine(source: string, index: number) {
  return source.slice(0, index).split('\n').length;
}
function finding(file: string, severity: ButtonAuditSeverity, label: string, detail: string, action = ''): ButtonAuditFinding {
  return { id: `${file}:${label}:${detail}`.replace(/[^a-zA-Z0-9_:\/-]+/g, '-'), file, severity, label, detail, action };
}

function scanFile(file: string) {
  const source = readFileSync(path.join(process.cwd(), file), 'utf8');
  const findings: ButtonAuditFinding[] = [];
  const patterns: Array<{ pattern: RegExp; label: string; action: string }> = [
    { pattern: /<Button(?![^>]*(onClick|href|type=["']submit["']|disabled=\{true\}))/g, label: 'Button may have no action', action: 'Add onClick, href, submit type, or remove the button.' },
    { pattern: /<PrimaryButton(?![^>]*(onClick|href|type=["']submit["']|disabled=\{true\}))/g, label: 'Primary button may have no action', action: 'Add onClick, href, submit type, or remove the button.' },
    { pattern: /onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/g, label: 'Empty click handler', action: 'Implement the click handler or hide the control.' },
    { pattern: /alert\s*\(/g, label: 'Alert used as action', action: 'Replace alert with app toast/modal/action flow.' },
    { pattern: /coming soon|not implemented|todo|fixme/gi, label: 'Placeholder implementation text', action: 'Replace placeholder with working flow or hide before launch.' },
    { pattern: /href=["']#["']/g, label: 'Hash link placeholder', action: 'Replace # with a real route or button action.' },
  ];

  for (const item of patterns) {
    let match: RegExpExecArray | null;
    while ((match = item.pattern.exec(source))) {
      const line = findLine(source, match.index);
      findings.push(finding(file, item.label.includes('may') ? 'warning' : 'error', item.label, `Line ${line}: ${match[0].slice(0, 120)}`, item.action));
    }
  }
  return findings;
}

export async function buildButtonAudit() {
  const files = ROOTS.flatMap((root) => walk(root));
  const findings = files.flatMap((file) => {
    try { return scanFile(file); } catch { return []; }
  });
  const summary = findings.reduce((acc, item) => { acc.findings += 1; acc[item.severity] += 1; return acc; }, { findings: 0, pass: 0, warning: 0, error: 0, info: 0 } as Record<ButtonAuditSeverity | 'findings', number>);
  const checks = files.length;
  const score = Math.max(0, Math.min(100, 100 - summary.error * 8 - summary.warning * 3));
  const ready = summary.error === 0;
  const nextActions = findings.filter((item) => item.severity === 'error' || item.severity === 'warning').slice(0, 30).map((item) => ({ label: item.label, detail: `${item.file}: ${item.detail}`, action: item.action, severity: item.severity }));
  return {
    ready,
    score,
    generatedAt: new Date().toISOString(),
    summary: { ...summary, filesScanned: checks },
    findings,
    nextActions,
  };
}
