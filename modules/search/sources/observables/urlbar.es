export default function (input) {
  // TODO: use https://github.com/ReactiveX/rxjs/pull/2465
  //       .throttleTime(100, { leading: true, trailing: true })
  return input
    // take the first, then debounce
    .take(1)
    .concat(input
      // `debounceTime` resets the timer whenever a new event comes in while
      // `auditTime` does not; `debounceTime` will wait for a gap in the events
      .auditTime(10)
    )
    .distinctUntilChanged()
    .share();
}
