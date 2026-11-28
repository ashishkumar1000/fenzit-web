// Inlines the entry stylesheet into a pre-rendered page's <head>, pure of file access, so the
// swap and its guards can be tested directly (see entry-css.test.ts). The I/O lives in
// scripts/lib/entry-css-files.ts.
//
// Only the head is touched, and only on the public pages: the entry stylesheet is the one request
// every page waits for before its first paint, and the same bytes would have downloaded anyway.
// The client-only shells (/login, /admin*) and the 404 page keep their <link>, so they share the
// one cached file. Inlining moves the CSS out of the immutable /assets/* cache and into the page,
// so it is only a win for a cold first visit; the pages revalidate with 304 afterwards.

// Vite writes <link rel="stylesheet" crossorigin href="/assets/index-*.css">. Match on rel and
// href in either order, so an attribute reorder upstream cannot silently skip a stylesheet.
function stylesheetLink(): RegExp {
  return /<link(?=[^>]*\brel=["']stylesheet["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
}

// Any link that claims to be a stylesheet, however its attributes are quoted or ordered. Used to
// prove that every one of them is a shape this build can inline.
const ANY_STYLESHEET_LINK = /<link[^>]*\brel=["']?stylesheet/gi;

function headEndOf(html: string): number {
  return html.search(/<\/head>/i);
}

/** The href of every stylesheet link in the document's <head>, in document order. */
export function stylesheetHrefs(html: string): string[] {
  const headEnd = headEndOf(html);
  if (headEnd === -1) return [];
  return [...html.slice(0, headEnd).matchAll(stylesheetLink())].map((match) => match[1]);
}

// An attribute such as media, title or disabled changes what a stylesheet applies to. Inlining it
// as an unconditional <style> would quietly change the page, so the build stops instead.
const CONDITIONAL_ATTRIBUTE = /\s(media|title|disabled|integrity|onload|onerror|as)=/i;

/**
 * Replaces every stylesheet link in the page's <head> with a <style> tag holding the file's CSS.
 * The hrefs are looked up in the map read from the built CSS, so a missing entry fails the build
 * instead of shipping a page with no styles. Anything outside the head is left untouched, so a
 * link the page itself renders in its body is never rewritten.
 */
export function inlineEntryStylesheets(
  html: string,
  cssByHref: ReadonlyMap<string, string>,
  page: string,
): string {
  const headEnd = headEndOf(html);
  if (headEnd === -1) {
    throw new Error(`${page} has no </head> to inline the stylesheet into.`);
  }
  const head = html.slice(0, headEnd);
  const rest = html.slice(headEnd);

  const links = [...head.matchAll(stylesheetLink())];
  if (links.length === 0) {
    throw new Error(`${page} has no stylesheet link in its <head> to inline.`);
  }
  // A link shape the strict pattern above cannot read (an unquoted rel, say) would survive the
  // swap and keep the render-blocking request. Fail loudly instead of shipping it.
  const strictStarts = new Set(links.map((link) => link.index));
  const odd = [...head.matchAll(ANY_STYLESHEET_LINK)].find(
    (candidate) => !strictStarts.has(candidate.index),
  );
  if (odd) {
    throw new Error(`${page} has a stylesheet link this build cannot inline: ${odd[0]}`);
  }

  const inlined = head.replace(stylesheetLink(), (tag: string, href: string) => {
    if (CONDITIONAL_ATTRIBUTE.test(tag)) {
      throw new Error(
        `${page} has a conditional stylesheet link (${tag}). Inlining it would drop the condition.`,
      );
    }
    const css = cssByHref.get(href);
    if (css === undefined) {
      throw new Error(`no CSS was read for ${href}, linked by ${page}. Was it built into dist?`);
    }
    // A literal </style> inside the CSS would close the tag early and spill the rest of the file
    // into the page. The escaped slash is valid CSS and resolves to the same character, so the
    // original spelling and its case are kept.
    return `<style>${css.replace(/<\/style/gi, (match) => `<\\/${match.slice(2)}`)}</style>`;
  });
  return inlined + rest;
}
