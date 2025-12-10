import faker from 'faker';

import type { Book } from '~/models';

import { diffBooks } from './diffBooks';

const book = (id: string, lastAnnotatedDate?: Date): Book => {
  return {
    id,
    title: faker.lorem.words(3),
    author: faker.name.findName(),
    lastAnnotatedDate,
  };
};

describe('diffBooks', () => {
  it('New remote books are always filtered for sync', () => {
    const remoteBooks = [book('1'), book('2'), book('3')];
    const vaultBooks = [book('1')];

    const actualBooks = diffBooks(remoteBooks, vaultBooks, new Date());
    expect(actualBooks.map((a) => a.id)).toEqual(['2', '3']);
  });

  it('No books to sync if remote and vault are identical', () => {
    const remoteBooks = [book('1'), book('2'), book('3')];
    const vaultBooks = [book('1'), book('2'), book('3')];

    const actualBooks = diffBooks(remoteBooks, vaultBooks, new Date());
    expect(actualBooks).toHaveLength(0);
  });

  it('Books with same last annotated date (ignoring time) are NOT filtered for sync', () => {
    const remoteBooks = [book('1', new Date('October 25, 2021 10:00:00'))];
    const vaultBooks = [book('1', new Date('October 25, 2021 00:00:00'))];

    const actualBooks = diffBooks(remoteBooks, vaultBooks, new Date());
    expect(actualBooks).toHaveLength(0);
  });

  it('Books with different last annotated dates are filtered for sync', () => {
    const remoteBooks = [book('1', new Date('October 19, 2018'))];
    const vaultBooks = [book('1', new Date('August 6, 2018'))];

    const actualBooks = diffBooks(remoteBooks, vaultBooks, new Date());
    expect(actualBooks.map((a) => a.id)).toEqual(['1']);
  });
});
