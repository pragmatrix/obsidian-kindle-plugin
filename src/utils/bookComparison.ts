import type { Book } from '~/models';

export const areBooksSame = (book1: Book, book2: Book): boolean => {
  // 1. Check ASIN (Most reliable)
  if (book1.asin && book2.asin && book1.asin === book2.asin) {
    return true;
  }

  // 2. Check ID (Title Hash)
  if (book1.id === book2.id) {
    return true;
  }

  // 3. Fuzzy Title Match
  // This handles cases where Amazon changes the title (e.g. adds "Kindle Edition")
  // but the user has an old file without ASIN in frontmatter.
  const t1 = book1.title.toLowerCase();
  const t2 = book2.title.toLowerCase();

  if (t1 === t2) return true;

  // If one title is a prefix of the other and is long enough to be unique
  if (t1.length > 10 && t2.startsWith(t1)) return true;
  if (t2.length > 10 && t1.startsWith(t2)) return true;

  return false;
};
