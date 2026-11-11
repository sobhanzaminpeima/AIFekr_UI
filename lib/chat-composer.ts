/** The composer resets only when the page's query string changes, never when the same page re-renders. */
export function composerShouldReset(previousQuery: string | null, nextQuery: string): boolean {
  return previousQuery !== nextQuery;
}
