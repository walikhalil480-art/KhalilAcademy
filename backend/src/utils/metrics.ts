import client from 'prom-client';

export const register = new client.Registry();

client.collectDefaultMetrics({ register });

export const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 1, 3, 5],
});

export const authFailuresCounter = new client.Counter({
  name: 'auth_failures_total',
  help: 'Total number of failed authentication attempts',
});

export const paymentFailuresCounter = new client.Counter({
  name: 'payment_failures_total',
  help: 'Total number of failed payments',
});

export const enrollmentsCounter = new client.Counter({
  name: 'course_enrollments_total',
  help: 'Total course enrollments',
});

register.registerMetric(httpRequestCounter);
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(authFailuresCounter);
register.registerMetric(paymentFailuresCounter);
register.registerMetric(enrollmentsCounter);
