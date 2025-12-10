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

  return false;
};
