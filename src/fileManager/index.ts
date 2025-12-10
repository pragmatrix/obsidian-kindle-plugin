import { MetadataCache, normalizePath, TAbstractFile, TFile, TFolder, Vault } from 'obsidian';

import type { Book, KindleFile, KindleFrontmatter } from '~/models';
import { areBooksSame,mergeFrontmatter } from '~/utils';

import { bookFilePath, bookToFrontMatter, frontMatterToBook } from './mappers';

const SyncingStateKey = 'kindle-sync';

export default class FileManager {
  constructor(private vault: Vault, private metadataCache: MetadataCache) {}

  public async readFile(file: KindleFile): Promise<string> {
    return await this.vault.cachedRead(file.file);
  }

  public getKindleFile(book: Book): KindleFile | undefined {
    // Optimization: Try to find the file at the expected path first
    // This avoids scanning the entire vault if the file is where we expect it to be
    try {
      const expectedPath = normalizePath(bookFilePath(book));
      const fileAtExpectedPath = this.vault.getAbstractFileByPath(expectedPath);

      if (fileAtExpectedPath instanceof TFile) {
        const kindleFile = this.mapToKindleFile(fileAtExpectedPath);
        if (kindleFile && areBooksSame(kindleFile.book, book)) {
          return { ...kindleFile, book };
        }
      }
    } catch (e) {
      // Ignore errors in optimization path
      console.warn('Error in getKindleFile optimization:', e);
    }

    // Fallback: Scan all files (slow)
    const allSyncedFiles = this.getKindleFiles();

    const kindleFile = allSyncedFiles.find((file) => areBooksSame(file.book, book));

    return kindleFile == null ? undefined : { ...kindleFile, book };
  }

  public mapToKindleFile(fileOrFolder: TAbstractFile): KindleFile | undefined {
    if (fileOrFolder instanceof TFolder) {
      return undefined;
    }

    const file = fileOrFolder as TFile;

    const fileCache = this.metadataCache.getFileCache(file);

    // File cache can be undefined if this file was just created and not yet cached by Obsidian
    const frontmatter = fileCache?.frontmatter;
    let kindleFrontmatter = frontmatter?.[SyncingStateKey] as KindleFrontmatter;

    if (kindleFrontmatter == null) {
      // Fallback: If no kindle-sync key, try to construct it from root frontmatter
      // This supports files created by older versions or other tools
      if (frontmatter && (frontmatter.asin || frontmatter.bookId)) {
        kindleFrontmatter = {
          bookId: frontmatter.bookId as string,
          title: frontmatter.title as string,
          author: frontmatter.author as string,
          asin: frontmatter.asin as string,
          lastAnnotatedDate: frontmatter.lastAnnotatedDate as string,
          bookImageUrl: frontmatter.bookImageUrl as string,
          highlightsCount: frontmatter.highlightsCount as number,
        };
      } else {
        return undefined;
      }
    }

    // Ensure ASIN is read from the root frontmatter if not present in the nested object
    // Some older versions or manual edits might have placed ASIN at the root
    if (!kindleFrontmatter.asin && frontmatter.asin) {
      // console.log(`[Sync Debug] Found ASIN in root frontmatter for "${file.path}": ${frontmatter.asin}`);
      kindleFrontmatter.asin = frontmatter.asin as string;
    }

    const book = frontMatterToBook(kindleFrontmatter);

    return { file, frontmatter: kindleFrontmatter, book };
  }

  public getKindleFiles(): KindleFile[] {
    return this.vault
      .getMarkdownFiles()
      .map((file) => this.mapToKindleFile(file))
      .filter((file) => file != null);
  }

  public async createFile(
    book: Book,
    content: string,
    highlightsCount: number
  ): Promise<void> {
    const filePath = this.generateUniqueFilePath(book);
    const frontmatterContent = this.generateBookContent(book, content, highlightsCount);

    try {
      await this.vault.create(filePath, frontmatterContent);
    } catch (error) {
      console.error(`Error writing new file (path="${filePath})"`);
      throw error;
    }
  }

  public async updateFile(
    kindleFile: KindleFile,
    remoteBook: Book,
    content: string,
    highlightsCount: number
  ): Promise<void> {
    const frontmatterContent = this.generateBookContent(remoteBook, content, highlightsCount);

    try {
      await this.vault.modify(kindleFile.file, frontmatterContent);
    } catch (error) {
      console.error(`Error modifying e file (path="${kindleFile.file.path})"`);
      throw error;
    }
  }

  /**
   * Generate book content by combining both book (a) book markdown and
   * (b) rendered book highlights
   */
  private generateBookContent(book: Book, content: string, highlightsCount: number): string {
    return mergeFrontmatter(content, {
      [SyncingStateKey]: bookToFrontMatter(book, highlightsCount),
    });
  }

  private generateUniqueFilePath(book: Book): string {
    const filePath = bookFilePath(book);

    const isDuplicate = this.vault
      .getMarkdownFiles()
      .some((v) => v.path === normalizePath(filePath));

    if (isDuplicate) {
      const currentTime = new Date().getTime().toString();
      return filePath.replace('.md', `-${currentTime}.md`);
    }

    return filePath;
  }
}
