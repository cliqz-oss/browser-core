'use strict';

const program = require('commander');

function checkIfValidOption(option, validOptions) {
  if (!validOptions.includes(option)) {
    throw new Error('Wrong / non-existent option!');
  }
}

program.command('lint')
  .option('--fix', 'fix style errors if possible')
  .option('--tests-only', 'check only test files')
  .option('--sources-only', 'check only source files')
  .option('--platform-only', 'check only "platforms/**" files')
  .option('-f --filetype <filetype>', 'specify file extension ("es", "jsx")')
  .option('-m --module <module>', 'specify module folder')
  .action((options) => {
    const CLIEngine = require('eslint').CLIEngine;
    const cli = new CLIEngine({
      fix: options.fix,
    });
    const formatter = cli.getFormatter();

    const module = options.module ? `${options.module}/**` : '**';
    let validSources = ['sources', 'tests'];
    let validFileTypes = ['es', 'jsx'];

    if (options.testsOnly) {
      validSources = ['tests'];
    } else if (options.sourcesOnly) {
      validSources = ['sources'];
    }

    if (options.filetype) {
      checkIfValidOption(options.filetype, validFileTypes);
      validFileTypes = [options.filetype];
    }

    let modulesPath = validSources.length === 1
      ? `modules/${module}/${validSources}/**/*.`
      : `modules/${module}/{${validSources.join(',')}}/**/*.`;

    modulesPath = validFileTypes.length === 1
      ? `${modulesPath}${validFileTypes}`
      : `${modulesPath}{${validFileTypes.join(',')}}`;

    const platformsPath = validFileTypes.length === 1
      ? `platforms/**/*.${validFileTypes}`
      : `platforms/**/*.{${validFileTypes.join(',')}}`;

    let pathsToLint = [modulesPath, platformsPath];

    if (options.testsOnly || options.sourcesOnly) {
      pathsToLint = [modulesPath];
    } else if (options.platformOnly) {
      pathsToLint = [platformsPath];
    }

    console.log('Linting the following paths: ', pathsToLint);
    const report = cli.executeOnFiles(pathsToLint);

    if (options.fix) {
      CLIEngine.outputFixes(report);
    }

    const logs = formatter(report.results);

    if (logs.replace(/\s/g, '').length === 0) {
      console.log('No errors were found!');
    } else {
      console.log(logs);
    }
  });
