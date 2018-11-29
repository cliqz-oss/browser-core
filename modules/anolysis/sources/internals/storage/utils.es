

export default function sortByTs(signals) {
  // Sort signals by `ts`
  return signals.sort((s1, s2) => {
    if (s1.ts === undefined || s1.ts < s2.ts) {
      return -1;
    }
    if (s2.ts === undefined || s1.ts > s2.ts) {
      return 1;
    }
    return 0;
  });
}
