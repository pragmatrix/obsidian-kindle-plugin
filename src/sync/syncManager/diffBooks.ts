import _ from 'lodash';
import moment from 'moment';

import type { Book } from '~/models';

const isEqual = (book1: Book, book2: Book): boolean => {
  if (book1.asin && book2.asin && book1.asin === book2.asin) {
    return true;
  }
  return book1.id === book2.id;
};

const isSameDate = (date1: Date | undefined, date2: Date | undefined): boolean => {
  if (!date1 && !date2) {
    return true;
  }
  if (!date1 || !date2) {
    return false;
  }
  return moment(date1).isSame(date2, 'day');
};

const updatedSince = (book: Book, lastSyncDate: Date): boolean => {
  if (book.lastAnnotatedDate != null) {
    return moment(book.lastAnnotatedDate).isSameOrAfter(lastSyncDate, 'day');
  }
  return false;
};

export const diffBooks = (
  remoteBooks: Book[],
  vaultBooks: Book[],
  lastSyncDate: Date
): Book[] => {
  const newBooks = remoteBooks.filter((remote) => !vaultBooks.some((v) => isEqual(v, remote)));

  const diffAnnotatedDates = remoteBooks.filter((remote) =>
    vaultBooks.some(
      (v) => isEqual(v, remote) && !isSameDate(remote.lastAnnotatedDate, v.lastAnnotatedDate)
    )
  );

  const updatedBooks = remoteBooks.filter((remote) =>
    vaultBooks.some((v) => isEqual(v, remote) && updatedSince(remote, lastSyncDate))
  );

  return _.uniqBy([...newBooks, ...diffAnnotatedDates, ...updatedBooks], (book) => book.id);
};
