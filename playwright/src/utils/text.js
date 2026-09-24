// Product titles render with a trailing non-breaking space, and several names are
// prefixes of others ("Pliers" vs "Combination Pliers"), so substring matching picks
// the wrong row. Anchor the match and tolerate surrounding whitespace.
export function exactText(value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*${escaped}\\s*$`);
}
