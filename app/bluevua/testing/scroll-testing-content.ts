/** Keep the collapsed action at the same screen position in either layout. */
export function scrollTestingContentBy(element: HTMLElement, top: number) {
  const scroller = element.closest<HTMLElement>('[data-testing-scroll]');
  if (scroller) scroller.scrollBy({ top, behavior: 'instant' });
  else window.scrollBy({ top, behavior: 'instant' });
}
