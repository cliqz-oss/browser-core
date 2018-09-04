'use strict';

const program = require('commander');

program.command('lint')
  .option('--fix', 'fix style errors if possible')
  .action((options) => {
    /* eslint-disable global-require */
    const CLIEngine = require('eslint').CLIEngine;
    const cli = new CLIEngine({
      fix: options.fix,
    });
    const formatter = cli.getFormatter();
    const report = cli.executeOnFiles(['modules/**/sources/**/*.es']);
    if (options.fix) {
      CLIEngine.outputFixes(report);
    }
    console.log(formatter(report.results));
  });
