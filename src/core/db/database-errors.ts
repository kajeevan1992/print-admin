function errorText(cause: unknown) {
  if (cause instanceof Error) return `${cause.name} ${cause.message}`;
  if (cause && typeof cause === 'object') {
    const record = cause as Record<string, unknown>;
    return `${String(record.code || '')} ${String(record.message || '')} ${String(record.cause || '')}`;
  }
  return String(cause || '');
}

export function isDatabaseConnectionCapacityError(cause: unknown) {
  const message = errorText(cause).toLowerCase();
  return [
    'too many database connections',
    'remaining connection slots are reserved',
    'connection pool',
    'timed out fetching a new connection',
    'p2024',
    'can\'t reach database server',
    'connection terminated unexpectedly',
    'server closed the connection unexpectedly',
    'econnreset',
    'etimedout',
    'epipe',
  ].some((pattern) => message.includes(pattern));
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function retryDatabaseConnection<T>(operation: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= Math.max(1, attempts); attempt += 1) {
    try {
      return await operation();
    } catch (cause) {
      lastError = cause;
      if (!isDatabaseConnectionCapacityError(cause) || attempt >= attempts) throw cause;
      await wait(150 * attempt);
    }
  }
  throw lastError;
}
