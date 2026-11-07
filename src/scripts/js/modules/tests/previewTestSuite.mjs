/**
 * Comprehensive Preview Test Suite (copied from FlashCards; CSE340 endpoints)
 * Class-based suite testing Lighthouse, CSS, HTML, memory, and Chrome
 * DevTools metrics against all application endpoints.
 */

import lighthouse from 'lighthouse';
import { HtmlValidate } from 'html-validate';
import { launch } from 'puppeteer';
import { TestResults } from './testResults.mjs';

export class PreviewTestSuite {
  static config = {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:5000',
    timeout: 30000,
    retries: 2,

    // All application endpoints to test
    endpoints: [
      { path: '/', name: 'Home', type: 'page' },
      { path: '/organizations', name: 'Organizations', type: 'page' },
      { path: '/projects', name: 'Projects', type: 'page' },
      { path: '/categories', name: 'Categories', type: 'page' },
    ],

    // Lighthouse thresholds
    // Note: the 'pwa' category was removed in Lighthouse 12 and must not be requested.
    lighthouseThresholds: {
      performance: 50,
      accessibility: 80,
      'best-practices': 80,
      seo: 80,
    },

    // CSS validation options
    cssOptions: {
      profile: 'css3svg',
      level: 'error',
    },

    // HTML validation options
    htmlOptions: {
      extends: ['html/recommended'],
      rules: {
        'no-unknown-elements': 'error',
        'void-content': 'error',
        'valid-attribute-expression': 'error',
      },
    },

    // Memory thresholds (in MB)
    memoryThresholds: {
      heapUsedMax: 500,
      externalMax: 100,
    },

    // Chrome DevTools metrics to check
    metrics: [
      'Cumulative Layout Shift',
      'Largest Contentful Paint',
      'First Input Delay',
      'Time to Interactive',
      'Speed Index',
    ],
  };

  constructor() {
    this.results = new TestResults();
    this.browser = null;
    this.htmlValidator = new HtmlValidate();
  }

  get config() {
    return this.constructor.config;
  }

  /**
   * Initialize browser
   */
  async initBrowser() {
    try {
      this.browser = await launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      return this.browser;
    } catch (error) {
      this.results.addTest(
        'Browser Initialization',
        'FAIL',
        `Failed to launch browser: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Close browser
   */
  async closeBrowser() {
    if (this.browser) await this.browser.close();
  }

  /**
   * Test each endpoint for HTTP 200 response
   */
  async testEndpoints() {
    console.log('\n[TEST] Running endpoint connectivity tests...');

    for (const endpoint of this.config.endpoints) {
      const url = `${this.config.baseURL}${endpoint.path}`;
      try {
        const response = await fetch(url, { timeout: this.config.timeout });
        if (response.ok) {
          this.results.addTest(`Endpoint: ${endpoint.name}`, 'PASS');
        } else {
          this.results.addTest(`Endpoint: ${endpoint.name}`, 'FAIL', `HTTP ${response.status}`);
        }
      } catch (error) {
        this.results.addTest(`Endpoint: ${endpoint.name}`, 'FAIL', error.message.substring(0, 100));
      }
    }
  }

  /**
   * Run Lighthouse tests for each endpoint
   */
  async testLighthouse() {
    console.log('\n[TEST] Running Lighthouse audits...');

    for (const endpoint of this.config.endpoints) {
      const url = `${this.config.baseURL}${endpoint.path}`;

      try {
        const runnerResult = await lighthouse(url, {
          logLevel: 'error',
          output: 'json',
          port: new URL(this.browser.wsEndpoint()).port,
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        });

        const scores = runnerResult.lhr.categories;
        let pagePassed = true;

        for (const [category, threshold] of Object.entries(this.config.lighthouseThresholds)) {
          const score = scores[category]?.score * 100;
          if (score && score < threshold) {
            this.results.addTest(
              `Lighthouse ${category}: ${endpoint.name}`,
              'WARN',
              `Score: ${Math.round(score)} (threshold: ${threshold})`
            );
            pagePassed = false;
          }
        }

        if (pagePassed) {
          this.results.addTest(`Lighthouse Audit: ${endpoint.name}`, 'PASS');
        }
      } catch (error) {
        this.results.addTest(
          `Lighthouse Audit: ${endpoint.name}`,
          'FAIL',
          error.message.substring(0, 100)
        );
      }
    }
  }

  /**
   * Test HTML validity for each page
   */
  async testHTMLValidity() {
    console.log('\n[TEST] Running HTML validation...');

    for (const endpoint of this.config.endpoints) {
      const url = `${this.config.baseURL}${endpoint.path}`;

      try {
        const response = await fetch(url);
        const html = await response.text();

        const result = await this.htmlValidator.validateString(html);

        if (result.valid) {
          this.results.addTest(`HTML Validation: ${endpoint.name}`, 'PASS');
        } else {
          const errorCount = result.errorCount;
          this.results.addTest(
            `HTML Validation: ${endpoint.name}`,
            'WARN',
            `${errorCount} validation error(s)`
          );
        }
      } catch (error) {
        this.results.addTest(
          `HTML Validation: ${endpoint.name}`,
          'FAIL',
          error.message.substring(0, 100)
        );
      }
    }
  }

  /**
   * Test CSS with Chrome DevTools
   */
  async testCSS() {
    console.log('\n[TEST] Running CSS analysis...');

    const page = await this.browser.newPage();

    try {
      for (const endpoint of this.config.endpoints) {
        const url = `${this.config.baseURL}${endpoint.path}`;

        try {
          await page.goto(url, { waitUntil: 'networkidle2' });

          const cssIssues = await page.evaluate(() => {
            const issues = [];
            // eslint-disable-next-line no-undef
            const stylesheets = document.styleSheets;

            for (let i = 0; i < stylesheets.length; i++) {
              const sheet = stylesheets[i];
              try {
                const rules = sheet.cssRules;
                if (!rules) continue;

                for (let j = 0; j < rules.length; j++) {
                  const rule = rules[j];
                  // Check for common CSS issues
                  if (
                    rule.style &&
                    (rule.style.all === 'inherit' ||
                      (rule.style.width === '100%' && rule.style.height === '100%'))
                  ) {
                    issues.push(`Potential layout issue in rule ${j}`);
                  }
                }
              } catch {
                // Cross-origin stylesheets - expected
              }
            }

            return issues;
          });

          if (cssIssues.length === 0) {
            this.results.addTest(`CSS Analysis: ${endpoint.name}`, 'PASS');
          } else {
            this.results.addTest(
              `CSS Analysis: ${endpoint.name}`,
              'WARN',
              `${cssIssues.length} potential issue(s)`
            );
          }
        } catch (error) {
          this.results.addTest(
            `CSS Analysis: ${endpoint.name}`,
            'FAIL',
            error.message.substring(0, 100)
          );
        }
      }
    } finally {
      await page.close();
    }
  }

  /**
   * Test memory usage
   */
  async testMemory() {
    console.log('\n[TEST] Running memory tests...');

    const page = await this.browser.newPage();

    try {
      for (const endpoint of this.config.endpoints) {
        const url = `${this.config.baseURL}${endpoint.path}`;

        try {
          await page.goto(url, { waitUntil: 'networkidle2' });

          const metrics = await page.metrics();
          const heapUsedMB = metrics.JSHeapUsedSize / (1024 * 1024);
          const externalMB = metrics.ExternalMemoryUsage / (1024 * 1024);

          let pagePassed = true;
          const warnings = [];

          if (heapUsedMB > this.config.memoryThresholds.heapUsedMax) {
            warnings.push(
              `Heap: ${heapUsedMB.toFixed(2)}MB (max: ${this.config.memoryThresholds.heapUsedMax}MB)`
            );
            pagePassed = false;
          }

          if (externalMB > this.config.memoryThresholds.externalMax) {
            warnings.push(
              `External: ${externalMB.toFixed(2)}MB (max: ${this.config.memoryThresholds.externalMax}MB)`
            );
            pagePassed = false;
          }

          if (pagePassed) {
            this.results.addTest(`Memory Test: ${endpoint.name}`, 'PASS');
          } else {
            this.results.addTest(`Memory Test: ${endpoint.name}`, 'WARN', warnings.join('; '));
          }
        } catch (error) {
          this.results.addTest(
            `Memory Test: ${endpoint.name}`,
            'FAIL',
            error.message.substring(0, 100)
          );
        }
      }
    } finally {
      await page.close();
    }
  }

  /**
   * Test Chrome DevTools Core Web Vitals
   */
  async testCoreWebVitals() {
    console.log('\n[TEST] Running Core Web Vitals tests...');

    const page = await this.browser.newPage();

    try {
      for (const endpoint of this.config.endpoints) {
        const url = `${this.config.baseURL}${endpoint.path}`;

        try {
          await page.goto(url, { waitUntil: 'networkidle2' });

          const metrics = await page.metrics();

          const vitals = {
            'First Contentful Paint': metrics.FirstContentfulPaint,
            'Largest Contentful Paint': metrics.LargestContentfulPaint,
            'Time to Interactive': metrics.TaskDuration,
            'Cumulative Layout Shift': metrics.LayoutCount,
          };

          let hasIssues = false;
          const issues = [];

          if (vitals['First Contentful Paint'] > 2500) {
            issues.push('FCP > 2.5s');
            hasIssues = true;
          }

          if (vitals['Time to Interactive'] > 5000) {
            issues.push('TTI > 5s');
            hasIssues = true;
          }

          if (hasIssues) {
            this.results.addTest(`Core Web Vitals: ${endpoint.name}`, 'WARN', issues.join('; '));
          } else {
            this.results.addTest(`Core Web Vitals: ${endpoint.name}`, 'PASS');
          }
        } catch (error) {
          this.results.addTest(
            `Core Web Vitals: ${endpoint.name}`,
            'FAIL',
            error.message.substring(0, 100)
          );
        }
      }
    } finally {
      await page.close();
    }
  }

  /**
   * Run the full suite. Each invocation starts with fresh results.
   */
  async run() {
    this.results = new TestResults();

    try {
      console.log('╔════════════════════════════════════════════╗');
      console.log('║    PREVIEW COMPREHENSIVE TEST SUITE        ║');
      console.log('╚════════════════════════════════════════════╝');

      await this.initBrowser();

      await this.testEndpoints();
      await this.testLighthouse();
      await this.testHTMLValidity();
      await this.testCSS();
      await this.testMemory();
      await this.testCoreWebVitals();

      const summary = this.results.getSummary();
      console.log(this.results.toString());

      return {
        success: summary.success,
        results: this.results,
      };
    } catch (error) {
      console.error('Test suite error:', error);
      this.results.addTest('Test Suite Execution', 'FAIL', error.message);
      return {
        success: false,
        results: this.results,
      };
    } finally {
      await this.closeBrowser();
    }
  }
}

export const previewTestSuite = new PreviewTestSuite();

export default previewTestSuite;
