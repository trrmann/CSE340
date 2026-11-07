/**
 * Test Results Tracking
 * Collects test outcomes and renders a summary report.
 */

export class TestResults {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.warnings = 0;
    this.startTime = Date.now();
  }

  addTest(name, status, details = '') {
    this.tests.push({
      name,
      status,
      details,
      timestamp: new Date().toISOString(),
    });

    if (status === 'PASS') this.passed++;
    else if (status === 'FAIL') this.failed++;
    else if (status === 'WARN') this.warnings++;
  }

  getSummary() {
    const duration = Date.now() - this.startTime;
    return {
      total: this.tests.length,
      passed: this.passed,
      failed: this.failed,
      warnings: this.warnings,
      duration: `${(duration / 1000).toFixed(2)}s`,
      success: this.failed === 0,
    };
  }

  toJSON() {
    return {
      summary: this.getSummary(),
      tests: this.tests,
    };
  }

  toString() {
    const summary = this.getSummary();
    let output = '\n╔════════════════════════════════════════════════╗\n';
    output += '║         TEST RESULTS SUMMARY                  ║\n';
    output += '╚════════════════════════════════════════════════╝\n\n';
    output += `Total Tests: ${summary.total}\n`;
    output += `✅ Passed: ${summary.passed}\n`;
    output += `❌ Failed: ${summary.failed}\n`;
    output += `⚠️ Warnings: ${summary.warnings}\n`;
    output += `⏱️  Duration: ${summary.duration}\n\n`;

    if (summary.failed > 0) {
      output += '❌ FAILED TESTS:\n';
      this.tests
        .filter((t) => t.status === 'FAIL')
        .forEach((t) => {
          output += `  • ${t.name}\n`;
          if (t.details) output += `    ${t.details}\n`;
        });
    }

    if (summary.warnings > 0) {
      output += '\n⚠️ WARNINGS:\n';
      this.tests
        .filter((t) => t.status === 'WARN')
        .forEach((t) => {
          output += `  • ${t.name}\n`;
          if (t.details) output += `    ${t.details}\n`;
        });
    }

    output += '\n' + (summary.success ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED');
    output += '\n';

    return output;
  }
}

export default TestResults;
