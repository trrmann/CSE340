/**
 * Database test suite entry point (npm run test:db).
 * All suite behavior lives in the class-based ProvisioningTest module.
 */

import { ProvisioningTest } from './provisioningTest.mjs';

const { success } = await new ProvisioningTest().run();
process.exitCode = success ? 0 : 1;
