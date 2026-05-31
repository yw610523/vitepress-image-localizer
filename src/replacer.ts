import fs from 'fs-extra';
import * as path from 'path';
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
    prefix: string = 'images',
    publicDir?: string
  ): Promise<void> {
    // 默认 publicDir 为 process.cwd()/public/prefix
    const imgPublicDir = publicDir || path.join(process.cwd(), 'public', prefix);

    // 建立 url -> filename 的映射
    const urlToFilename = new Map<string, string>();
    for (const result of downloadResults) {
      if (result.success && result.filename) {
        urlToFilename.set(result.url, result.filename);
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
        const filename = urlToFilename.get(img.url);
        if (!filename) continue;

        // 计算相对路径：markdown所在目录 -> publicDir/filename
        const mdDir = path.dirname(filePath);
        const relativePath = path.relative(mdDir, path.join(imgPublicDir, filename)).replace(/\\/g, '/');

        // 替换 ![alt](url) 为 ![alt](../prefix/xxx.jpg) 或 ![alt](/prefix/xxx.jpg)
        // 如果 markdown 在 prefix 目录下，用绝对路径；否则用相对路径
        const pattern = new RegExp(
          `!\\[([^\\]]*)\\]\\(${this.escapeRegex(img.url)}\\)`,
          'g'
        );
        const replacement = `![$1](${relativePath})`;

        if (dryRun) {
          console.log(`${pc.yellow('DRY')} ${pc.gray(filePath)}:${img.line}`);
          console.log(`${pc.gray('    ')} ${img.url} → ${relativePath}`);
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