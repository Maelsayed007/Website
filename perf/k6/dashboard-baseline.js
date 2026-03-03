import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://staging.example.com';

export const options = {
  scenarios: {
    smoke_public: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
    },
    ramp_api: {
      executor: 'ramping-vus',
      startVUs: 2,
      stages: [
        { duration: '2m', target: 15 },
        { duration: '3m', target: 25 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1200'],
  },
};

function get(path, tags = {}) {
  const res = http.get(`${BASE_URL}${path}`, { tags: { ...tags, path } });
  check(res, {
    'status is < 500': (r) => r.status < 500,
  });
  return res;
}

export default function () {
  get('/', { type: 'page' });
  get('/offers', { type: 'page' });
  get('/river-cruise', { type: 'page' });
  get('/api/payments/link/validate?token=invalid-token', { type: 'api' });
  sleep(1);
}
