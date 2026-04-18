import logger from './logger.js';

class MetricsObserver {
  constructor() {
    this.metrics = new Map();
  }

  startTimer(operationId) {
    this.metrics.set(operationId, Date.now());
  }

  endTimer(operationId, metadata = {}) {
    const startTime = this.metrics.get(operationId);
    if (!startTime) return 0;

    const durationMs = Date.now() - startTime;
    this.metrics.delete(operationId);

    logger.info(`[OBSERVABILITY] ${operationId} completed`, {
      stage: operationId,
      latencyMs: durationMs,
      ...metadata,
    });

    return durationMs;
  }

  recordEvent(eventName, data = {}) {
    logger.info(`[EVENT] ${eventName}`, data);
  }
}

export function createRequestObserver() {
  return new MetricsObserver();
}

export const observer = new MetricsObserver();
