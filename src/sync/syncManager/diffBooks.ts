import _ from 'lodash';
import moment from 'moment';

import type { Book } from '~/models';
import { areBooksSame } from '~/utils';

const isSameDate = (date1: Date | undefined, date2: Date | undefined): boolean => {
  if (!date1 && !date2) {
    return true;
  }
  if (!date1 || !date2) {
    return false;
  }
  return moment(date1).isSame(date2, 'day');
};

const updatedSince = (book: Book, lastSyncDate: Date | undefined): boolean => {
  if (!lastSyncDate) {
    return true;
  }
  if (book.lastAnnotatedDate != null) {
    return moment(book.lastAnnotatedDate).isSameOrAfter(lastSyncDate, 'day');
  }
  return false;
};

export const diffBooks = (
  remoteBooks: Book[],
  vaultBooks: Book[],
  lastSyncDate: Date | undefined
): Book[] => {
  const newBooks = remoteBooks.filter((remote) => {
    const match = vaultBooks.find((v) => areBooksSame(v, remote));
    if (!match) {
      // Only sync new books if they have been updated since the last sync
      // This prevents old samples or deleted books from reappearing
      return updatedSince(remote, lastSyncDate);
    }
    return false;
  });

  const diffAnnotatedDates = remoteBooks.filter((remote) => {
    const match = vaultBooks.find((v) => areBooksSame(v, remote));
    if (match) {
      const sameDate = isSameDate(remote.lastAnnotatedDate, match.lastAnnotatedDate);
      if (!sameDate) {
        return true;
      }
    }
    return false;
  });

  const updatedBooks = remoteBooks.filter((remote) => {
    const match = vaultBooks.find((v) => areBooksSame(v, remote));
    if (match) {
      const updated = updatedSince(remote, lastSyncDate);
      if (updated) {
        return true;
      }
    }
    return false;
  });

  return _.uniqBy([...newBooks, ...diffAnnotatedDates, ...updatedBooks], (book) => book.id);
};
