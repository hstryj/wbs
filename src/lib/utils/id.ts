let _counter = 0;
export function uid(): number {
  return ++_counter;
}
export function resetUid(max: number): void {
  _counter = Math.max(_counter, max);
}
