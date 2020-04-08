const { execSync } = require('child_process');
const { join } = require('path');

module.exports = () => {
  // eslint-disable-next-line no-console
  console.log(
    execSync(
      `node ${join(
        __dirname,
        '..',
        '..',
        '..',
        'node_modules',
        'puppeteer-core',
        'install.js',
      )}`,
      { encoding: 'utf-8' },
    ).trim() || 'Puppeteer already downloaded.',
  );
};
