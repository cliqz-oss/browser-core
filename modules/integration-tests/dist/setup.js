/* global TAP */

mocha.setup({
  ui: 'bdd',
  timeout: 20000,
  reporter: TAP,
  grep: (() => {
    const searchParams = new window.URLSearchParams(window.location.search);
    const greps = searchParams.getAll('grep');
    const grep = greps[greps.length - 1];
    return grep;
  })(),
});

window.TESTS = {};
