import test from 'node:test';
import assert from 'node:assert/strict';
import { RenderEnvClient } from '../tools/renderEnv.mjs';

test('maskValue redacts secrets without hiding short values completely', () => {
  assert.equal(RenderEnvClient.maskValue(''), 'empty');
  assert.equal(RenderEnvClient.maskValue('abcd'), '****');
  assert.equal(RenderEnvClient.maskValue('super-secret-value'), 'su…ue');
});

test('requiredKeysMissing flags absent service variables', () => {
  const envVars = [
    { key: 'NODE_ENV', value: 'production' },
    { key: 'DB_PG_PORT', value: '5432' },
    { key: 'SESSION_SECRET', value: 'abc123' },
  ];
  assert.deepEqual(RenderEnvClient.requiredKeysMissing(envVars), [
    'NODE_VERSION',
    'DB_PG_INTERNAL_HOSTNAME',
    'DB_PG_DATABASE',
    'DB_PG_USER',
    'DB_PG_PASSWORD',
    'DB_PG_POOL_MAX',
    'IAM_URL',
    'IAM_CLIENT_SECRET',
    'GITHUB_TOKEN',
  ]);
});

test('explainMissing is clear when some keys are absent', () => {
  const summary = RenderEnvClient.explainMissing([{ key: 'NODE_ENV', value: 'production' }]);
  assert.match(summary, /Missing Render vars:/);
});

test('generateSecret produces a stable hex secret length', () => {
  const secret = RenderEnvClient.generateSecret(32);
  assert.equal(secret.length, 64);
  assert.match(secret, /^[0-9a-f]+$/);
});

test('resolveServiceId handles Render service records nested in service wrappers', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify([{ service: { id: 'srv-example123', name: 'heros-companion' } }]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  try {
    const client = new RenderEnvClient({
      apiBase: 'https://render.example.test',
      apiToken: 'test-token',
      serviceName: 'heros-companion',
    });
    assert.equal(await client.resolveServiceId(), 'srv-example123');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('listEnvVars unwraps Render env-var records', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify([
        { envVar: { key: 'NODE_ENV', value: 'production' }, cursor: 'next-page' },
        { envVar: { key: 'SESSION_SECRET', value: 'secret' }, cursor: null },
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  try {
    const client = new RenderEnvClient({
      apiBase: 'https://render.example.test',
      apiToken: 'test-token',
      serviceName: 'srv-1234567890',
    });
    assert.deepEqual(await client.listEnvVars(), [
      { key: 'NODE_ENV', value: 'production' },
      { key: 'SESSION_SECRET', value: 'secret' },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('setEnvVar uses Render’s single-variable update endpoint', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), method: init?.method, body: init?.body });
    if (!init?.method) {
      return new Response(
        JSON.stringify([{ envVar: { key: 'SESSION_SECRET', value: 'old-value' }, cursor: null }]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(JSON.stringify({ key: 'SESSION_SECRET', value: 'new-value' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    const client = new RenderEnvClient({
      apiBase: 'https://render.example.test',
      apiToken: 'test-token',
      serviceName: 'srv-1234567890',
    });
    await client.setEnvVar('SESSION_SECRET', 'new-value');
    assert.equal(requests[0].method, undefined);
    assert.match(requests[0].url, /\/env-vars$/);
    assert.equal(requests[1].method, 'PUT');
    assert.match(requests[1].url, /\/env-vars\/SESSION_SECRET$/);
    assert.deepEqual(JSON.parse(requests[1].body), { value: 'new-value' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
