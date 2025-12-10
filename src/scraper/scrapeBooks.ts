import type { Root } from 'cheerio';
import moment from 'moment';
import { get } from 'svelte/store';

import { currentAmazonRegion } from '~/amazonRegion';
import type { AmazonAccountRegion, Book } from '~/models';
import { settingsStore } from '~/store';
import { hash } from '~/utils';

import { loadRemoteDom } from './loadRemoteDom';

/**
 * Amazon dates in the Kindle notebook looks like "Sunday October 24, 2021"
 * This method will parse this string and return a valid Date object
 */
export const parseToDateString = (kindleDate: string, region: AmazonAccountRegion): Date => {
  if (!kindleDate) {
    return null;
  }

  let date: moment.Moment;

  switch (region) {
    case 'japan': {
      const amazonDateString = kindleDate.substring(0, kindleDate.indexOf(' '));
      date = moment(amazonDateString, 'YYYY MM DD', 'ja');
      break;
    }
    case 'france': {
      date = moment(kindleDate, 'MMMM D, YYYY', 'fr');
      break;
    }
    default: {
      // Try standard format "Sunday October 24, 2021" -> "October 24, 2021"
      const amazonDateString = kindleDate.substr(kindleDate.indexOf(' ') + 1);
      date = moment(amazonDateString, 'MMM DD, YYYY');

      // Fallback: Try parsing the full string if the substring failed or if format changed
      if (!date.isValid()) {
        date = moment(kindleDate, ['MMM DD, YYYY', 'YYYY-MM-DD', 'DD MMM YYYY']);
      }
    }
  }

  if (!date.isValid()) {
    return null;
  }

  return date.toDate();
};

export const parseAuthor = (scrapedAuthor: string): string => {
  return scrapedAuthor.replace(/.*: /, '')?.trim();
};

export const parseBooks = ($: Root): Book[] => {
  const booksEl = $('.kp-notebook-library-each-book').toArray();

  return booksEl.map((bookEl): Book => {
    const title = $('h2.kp-notebook-searchable', bookEl).text()?.trim();

    const scrapedLastAnnotatedDate = $('[id^="kp-notebook-annotated-date"]', bookEl).val();
    const scrapedAuthor = $('p.kp-notebook-searchable', bookEl).text();

    return {
      id: "md5:" + hash(title),
      asin: $(bookEl).attr('id'),
      title,
      author: parseAuthor(scrapedAuthor),
      url: `https://www.amazon.com/dp/${$(bookEl).attr('id')}`,
      imageUrl: $('.kp-notebook-cover-image', bookEl).attr('src'),
      lastAnnotatedDate: parseToDateString(
        scrapedLastAnnotatedDate,
        get(settingsStore).amazonRegion
      ),
    };
  });
};

const scrapeBooks = async (): Promise<Book[]> => {
  const region = currentAmazonRegion();
  const { dom } = await loadRemoteDom(region.notebookUrl, 1000);
  return parseBooks(dom);
};

export default scrapeBooks;
