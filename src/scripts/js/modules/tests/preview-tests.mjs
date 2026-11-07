/**
 * Preview test suite entry point.
 * All suite behavior lives in the class-based PreviewTestSuite module.
 */

import { previewTestSuite } from './previewTestSuite.mjs';

const { success } = await previewTestSuite.run();
process.exitCode = success ? 0 : 1;
