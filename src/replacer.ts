import fs from 'fs-extra';
import pc from 'picocolors';
import type { ImageInfo, DownloadResult } from './types.js';
import nodeFs from 'fs';

export class Replacer {
  /**
   * 替换 Markdown 文件中的图片 URL
   */
  async replace(
    images: ImageInfo[],
    downloadResults: DownloadResult[],
    dryRun: boolean = false,
    prefix: string = 'images'
  ): Promise<void> {
    // 建立 url -> localPath 的映射
    const urlToLocal = new Map<string, string>();
    for (const result of downloadResults) {
      if (result.success && result.filename) {
        urlToLocal.set(result.url, `/${prefix}/${result.filename}`);
      }
    }

    // 按文件分组
    const fileImages = new Map<string, ImageInfo[]>();
    for (const img of images) {
      if (!fileImages.has(img.filePath)) {
        fileImages.set(img.filePath, []);
      }
      fileImages.get(img.filePath)!.push(img);
    }

    // 处理每个文件
    for (const [filePath, imgs] of fileImages) {
      const content = await fs.readFile(filePath, 'utf-8');
      let newContent = content;

      for (const img of imgs) {
        const localPath = urlToLocal.get(img.url);
        if (!localPath) continue;

        // 替换 ![alt](url) 为 ![alt](/prefix/xxx.jpg)
        const pattern = new RegExp(
          `!\\[([^\\]]*)\\]\\(${this.escapeRegex(img.url)}\\)`,
          'g'
        );
        const replacement = `![$1](${localPath})`;

        if (dryRun) {
          console.log(`${pc.yellow('DRY')} ${pc.gray(filePath)}:${img.line}`);
          console.log(`${pc.gray('    ')} ${img.url} → ${localPath}`);
        } else {
          newContent = newContent.replace(pattern, replacement);
        }
      }

      if (!dryRun) {
        await fs.writeFile(filePath, newContent, 'utf-8');
        console.log(`${pc.green('REPL')} ${pc.gray(filePath)}`);
      }
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}