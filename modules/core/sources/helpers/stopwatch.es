import console from '../console';

export default function stopwatch(name, module) {
  const key = `[${module}] ${name}`;
  const now = Date.now();
  return {
    stop: () => {
      console.log(`${key}: ${Date.now() - now} ms`);
    },
  };
}
