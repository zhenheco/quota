const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|password|secret|token|api[-_]?key|session|quota_api_token)/i;

function stripUrlSecrets(value) {
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return value.split(/[?#]/, 1)[0] ?? value;
  }
}

function scrubValue(value) {
  if (typeof value === 'string') {
    return stripUrlSecrets(value);
  }

  if (Array.isArray(value)) {
    return value.map(scrubValue);
  }

  if (value && typeof value === 'object') {
    return scrubRecord(value);
  }

  return value;
}

function scrubRecord(record) {
  if (!record) {
    return record;
  }

  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
      .map(([key, value]) => [key, scrubValue(value)])
  );
}

export function scrubSentryEvent(event) {
  const scrubbed = { ...event };

  if (event.request) {
    const request = { ...event.request };
    if (typeof request.url === 'string') {
      request.url = stripUrlSecrets(request.url);
    }
    delete request.query_string;
    delete request.cookies;
    delete request.data;
    request.headers = scrubRecord(request.headers);
    scrubbed.request = request;
  }

  if (event.user) {
    const { id } = event.user;
    scrubbed.user = id === undefined ? undefined : { id };
  }

  scrubbed.extra = scrubRecord(event.extra);
  if (event.breadcrumbs) {
    scrubbed.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
      ...breadcrumb,
      ...(typeof breadcrumb.message === 'string' ? { message: stripUrlSecrets(breadcrumb.message) } : {}),
      data: scrubRecord(breadcrumb.data),
    }));
  }

  return scrubbed;
}

function parseTraceSampleRate(value) {
  if (!value) {
    return 0.1;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0.1;
  }

  return Math.min(1, Math.max(0, parsed));
}

export function buildSentryOptions(env) {
  if (!env.SENTRY_DSN) {
    return undefined;
  }

  return {
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.ENVIRONMENT ?? 'production',
    release: env.SENTRY_RELEASE,
    tracesSampleRate: parseTraceSampleRate(env.SENTRY_TRACES_SAMPLE_RATE),
    sendDefaultPii: false,
    beforeSend: scrubSentryEvent,
    beforeSendTransaction: scrubSentryEvent,
  };
}
