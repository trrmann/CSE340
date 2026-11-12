import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_API_BASE = 'https://api.render.com';
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../');
const ENV_FILE = process.env.RENDER_ENV_FILE || path.join(PROJECT_ROOT, '.env');
if (existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}
const DEFAULT_SERVICE_NAME = process.env.RENDER_SERVICE_NAME ?? 'heros-companion';
const DEFAULT_REQUIRED_KEYS = [
  'NODE_ENV',
  'NODE_VERSION',
  'DB_PG_INTERNAL_HOSTNAME',
  'DB_PG_PORT',
  'DB_PG_DATABASE',
  'DB_PG_USER',
  'DB_PG_PASSWORD',
  'DB_PG_POOL_MAX',
  'IAM_URL',
  'IAM_CLIENT_SECRET',
  'SESSION_SECRET',
  'GITHUB_TOKEN',
];
const REQUIRED_KEYS =
  process.env.RENDER_REQUIRED_KEYS === undefined
    ? DEFAULT_REQUIRED_KEYS
    : process.env.RENDER_REQUIRED_KEYS.split(',').filter(Boolean);

export class RenderEnvClient {
  static REQUIRED_KEYS = REQUIRED_KEYS;

  constructor({ apiBase = DEFAULT_API_BASE, apiToken, serviceName = DEFAULT_SERVICE_NAME } = {}) {
    this.apiBase = apiBase;
    this.apiToken = apiToken ?? RenderEnvClient.resolveApiToken();
    this.serviceName = serviceName;
    this.serviceId = null;
  }

  static resolveApiToken(env = process.env) {
    return env.RENDER_API_KEY || env.RENDER_API_TOKEN || RenderEnvClient.readKeyringValue();
  }

  static readKeyringValue() {
    try {
      const value = execFileSync(
        'secret-tool',
        ['lookup', 'service', 'render-api', 'key', 'render-api'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      ).trim();
      if (value) {
        return value;
      }
    } catch {
      // No secret-tool entry is configured locally; the caller can provide a token explicitly.
    }
    return null;
  }

  static maskValue(value) {
    if (value === undefined || value === null || value === '') {
      return 'empty';
    }
    const text = String(value);
    if (text.length <= 4) {
      return '****';
    }
    return `${text.slice(0, 2)}…${text.slice(-2)}`;
  }

  static maybeServiceId(service) {
    return service && /[a-f0-9]{8,}/i.test(service) ? service : null;
  }

  static presentKeys(envVars = []) {
    return new Set(envVars.filter(Boolean).map((entry) => entry.key));
  }

  static requiredKeysMissing(envVars = [], requiredKeys = REQUIRED_KEYS) {
    const present = RenderEnvClient.presentKeys(envVars);
    return requiredKeys.filter((key) => !present.has(key));
  }

  static explainMissing(envVars = [], requiredKeys = REQUIRED_KEYS) {
    const missing = RenderEnvClient.requiredKeysMissing(envVars, requiredKeys);
    return missing.length
      ? `Missing Render vars: ${missing.join(', ')}`
      : 'All required Render vars are present.';
  }

  headers() {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(this.apiToken ? { Authorization: `Bearer ${this.apiToken}` } : {}),
    };
  }

  async request(path, init = {}) {
    const response = await fetch(`${this.apiBase}${path}`, {
      ...init,
      headers: { ...this.headers(), ...(init.headers || {}) },
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const message = body?.message || body?.error || text || response.statusText;
      throw new Error(`Render API request failed (${response.status}): ${message}`);
    }
    return body;
  }

  async resolveServiceId(serviceName = this.serviceName) {
    if (!serviceName) {
      throw new Error('Specify a Render service with --service <name> or --service <id>');
    }
    if (RenderEnvClient.maybeServiceId(serviceName)) {
      this.serviceId = serviceName;
      return serviceName;
    }
    const services = await this.listServices();
    const match = services.find((item) => {
      const service = item?.service ?? item;
      return service?.name === serviceName || service?.serviceId === serviceName;
    });
    if (!match) {
      throw new Error(`Render service not found: ${serviceName}`);
    }
    const service = match.service ?? match;
    this.serviceId = service.id || service.serviceId || service.name;
    return this.serviceId;
  }

  async listServices() {
    return this.request('/v1/services');
  }

  static formatServices(services = []) {
    const entries = services.map((item) => item?.service ?? item);
    if (!entries.length) {
      return 'No Render services found.';
    }
    return entries
      .map(
        (service) => `${service.name || 'unnamed'} (${service.type || 'unknown'}): ${service.id}`
      )
      .join('\n');
  }

  async listEnvVars(serviceName = this.serviceName) {
    const serviceId = await this.resolveServiceId(serviceName);
    const response = await this.request(`/v1/services/${encodeURIComponent(serviceId)}/env-vars`);
    const envVars = Array.isArray(response) ? response : response?.envVars || [];
    return envVars.map((item) => item?.envVar ?? item);
  }

  async getEnvVar(key, serviceName = this.serviceName) {
    const envVars = await this.listEnvVars(serviceName);
    return envVars.find((entry) => entry.key === key) || null;
  }

  async setEnvVar(key, value, { serviceName = this.serviceName, confirm = true } = {}) {
    const serviceId = await this.resolveServiceId(serviceName);
    if (confirm) {
      const exists = await this.getEnvVar(key, serviceId);
      if (exists && exists.value === value) {
        return { ...exists, updated: false, message: `${key} already set to the same value` };
      }
    }
    return this.request(
      `/v1/services/${encodeURIComponent(serviceId)}/env-vars/${encodeURIComponent(key)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ value: String(value) }),
      }
    );
  }

  async removeEnvVar(key, { serviceName = this.serviceName } = {}) {
    const serviceId = await this.resolveServiceId(serviceName);
    const envVar = await this.getEnvVar(key, serviceId);
    if (!envVar) {
      return { removed: false, key, message: `${key} is not set` };
    }
    const result = await this.request(
      `/v1/services/${encodeURIComponent(serviceId)}/env-vars/${encodeURIComponent(envVar.id || key)}`,
      { method: 'DELETE' }
    );
    return { removed: true, key, result };
  }

  async ensureRequired(serviceName = this.serviceName, requiredKeys = REQUIRED_KEYS) {
    if (!requiredKeys.length) {
      return {
        present: [],
        missing: [],
        ok: false,
        summary: `No required-key list configured for ${serviceName || 'this project'}; use --required-key KEY.`,
      };
    }
    const envVars = await this.listEnvVars(serviceName);
    const missing = RenderEnvClient.requiredKeysMissing(envVars, requiredKeys);
    return {
      present: envVars,
      missing,
      ok: missing.length === 0,
      summary: missing.length
        ? `Missing Render vars: ${missing.join(', ')}`
        : 'All required Render vars are present.',
    };
  }

  static formatList(envVars = []) {
    if (!envVars.length) {
      return 'No env vars found.';
    }
    const lines = envVars.map((entry) => `${entry.key}=${RenderEnvClient.maskValue(entry.value)}`);
    return lines.join('\n');
  }

  static generateSecret(bytes = 32) {
    return randomBytes(bytes).toString('hex');
  }

  static parseArgs(argv = process.argv.slice(2)) {
    const options = {
      command: 'list',
      serviceName: DEFAULT_SERVICE_NAME || null,
      key: null,
      value: null,
      confirm: true,
      bytes: 32,
      requiredKeys: [],
    };

    for (let index = 0; index < argv.length; index += 1) {
      const arg = argv[index];
      if (
        arg === 'list' ||
        arg === 'get' ||
        arg === 'set' ||
        arg === 'remove' ||
        arg === 'check' ||
        arg === 'check-token' ||
        arg === 'generate-secret' ||
        arg === 'generate' ||
        arg === 'services'
      ) {
        options.command = arg;
      } else if (arg === '--service' || arg === '-s') {
        options.serviceName = argv[++index];
      } else if (arg === '--key' || arg === '-k') {
        options.key = argv[++index];
      } else if (arg === '--value' || arg === '-v') {
        options.value = argv[++index];
      } else if (arg === '--bytes') {
        options.bytes = Number(argv[++index] || 32);
      } else if (arg === '--required-key') {
        options.requiredKeys.push(argv[++index]);
      } else if (arg === '--no-confirm') {
        options.confirm = false;
      } else if (arg === '--help' || arg === '-h') {
        options.command = 'help';
      } else if (!options.serviceName && arg.startsWith('heros-companion')) {
        options.serviceName = arg;
      }
    }

    return options;
  }
}

async function main() {
  const args = RenderEnvClient.parseArgs();
  if (args.command === 'help') {
    console.log(`Render environment manager

Usage:
  node renderEnv.mjs services
  node renderEnv.mjs list [--service <name>]
  node renderEnv.mjs get --key <KEY> [--service <name>]
  node renderEnv.mjs set --key <KEY> --value <VALUE> [--service <name>]
  node renderEnv.mjs remove --key <KEY> [--service <name>]
  node renderEnv.mjs check [--service <name>] [--required-key <KEY> ...]
  node renderEnv.mjs check-token
  node renderEnv.mjs generate-secret [--bytes 32]

The script reads RENDER_API_KEY / RENDER_API_TOKEN from the project .env file,
the process environment, or the local secret-tool entry service=render-api key=render-api.
`);
    return;
  }

  if (args.command === 'check-token') {
    if (!RenderEnvClient.resolveApiToken()) {
      throw new Error(
        'No Render API token found. Set RENDER_API_KEY in this project’s .env file, RENDER_API_KEY / RENDER_API_TOKEN in the environment, or store it in the local keyring.'
      );
    }
    console.log('Render API token found.');
    return;
  }

  if (args.command === 'generate-secret' || args.command === 'generate') {
    console.log(RenderEnvClient.generateSecret(args.bytes));
    return;
  }

  const client = new RenderEnvClient({ serviceName: args.serviceName });
  if (!client.apiToken) {
    throw new Error(
      'No Render API token found. Set RENDER_API_KEY / RENDER_API_TOKEN, or add a secret-tool entry for service=render-api and key=render-api.'
    );
  }

  switch (args.command) {
    case 'list': {
      if (args.serviceName) {
        const vars = await client.listEnvVars(args.serviceName);
        console.log(RenderEnvClient.formatList(vars));
      } else {
        console.log(RenderEnvClient.formatServices(await client.listServices()));
      }
      break;
    }
    case 'services': {
      console.log(RenderEnvClient.formatServices(await client.listServices()));
      break;
    }
    case 'get': {
      if (!args.key) {
        throw new Error('A --key value is required for get');
      }
      const variable = await client.getEnvVar(args.key, args.serviceName);
      if (!variable) {
        console.log(`${args.key}: not set`);
      } else {
        console.log(`${variable.key}=${RenderEnvClient.maskValue(variable.value)}`);
      }
      break;
    }
    case 'set': {
      if (!args.key || args.value === null) {
        throw new Error('Both --key and --value are required for set');
      }
      const result = await client.setEnvVar(args.key, args.value, {
        serviceName: args.serviceName,
        confirm: args.confirm,
      });
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'remove': {
      if (!args.key) {
        throw new Error('A --key value is required for remove');
      }
      const result = await client.removeEnvVar(args.key, { serviceName: args.serviceName });
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'check': {
      const result = await client.ensureRequired(
        args.serviceName,
        args.requiredKeys.length ? args.requiredKeys : REQUIRED_KEYS
      );
      console.log(result.summary);
      if (!result.ok) {
        process.exitCode = 1;
      }
      break;
    }
    default:
      throw new Error(`Unknown command: ${args.command}`);
  }
}

const isDirectScript = (() => {
  const currentFile = fileURLToPath(import.meta.url);
  const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : null;
  return invokedFile && currentFile === invokedFile;
})();

if (isDirectScript) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

export default RenderEnvClient;
