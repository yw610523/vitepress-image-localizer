import axios from 'axios';
import fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import pc from 'picocolors';
import type { DownloadResult } from './types.js';
import nodeFs from 'fs';

export class ImageDownloader {
  private imageDir: string;

  constructor(imageDir: string) {
    this.imageDir = imageDir;
  }

  /**
   * 下载单张图片
   */
  async download(url: string, context?: { filePath?: string; line?: number }): Promise<DownloadResult> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'vitepress-image-localizer/1.0.0'
        }
      });

      // 从 URL 提取扩展名
      const urlObj = new URL(url);
      const originalExt = path.extname(urlObj.pathname) || '.jpg';
      const ext = originalExt.toLowerCase();

      // 生成唯一文件名
      const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 12);
      const filename = `${hash}${ext}`;
      const localPath = path.join(this.imageDir, filename);

      // 确保目录存在
      await fs.ensureDir(this.imageDir);

      // 如果文件已存在，跳过下载
      if (await fs.pathExists(localPath)) {
        console.log(`${pc.yellow('SKIP')} ${pc.gray('already exists:')} ${filename}`);
        return { url, localPath: `/images/${filename}`, success: true, filename };
      }

      // 写入文件
      await fs.writeFile(localPath, response.data);
      console.log(`${pc.green('DOWN')} ${pc.gray('saved:')} ${filename}`);

      return { url, localPath: `/images/${filename}`, success: true, filename };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const contextInfo = context?.filePath
        ? `${context.filePath}${context.line ? `:${context.line}` : ''} → ${url}`
        : url;
      console.log(`${pc.red('FAIL')} ${pc.gray(contextInfo)}`);
      console.log(`${pc.red('    ')} ${pc.gray('error:')} ${errorMessage}`);
      return { url, localPath: '', success: false, error: errorMessage };
    }
  }

  /**
   * 批量下载
   */
  async downloadAll(
    images: Array<{ url: string; filePath?: string; line?: number }>,
    concurrency: number = 3
  ): Promise<DownloadResult[]> {
    const results: DownloadResult[] = [];
    const queue = [...images];

    const processNext = async (): Promise<void> => {
      if (queue.length === 0) return;
      const img = queue.shift()!;
      const result = await this.download(img.url, { filePath: img.filePath, line: img.line });
      results.push(result);
      // 继续处理下一个
      await processNext();
    };

    // 启动并发任务
    const workers = [];
    for (let i = 0; i < Math.min(concurrency, images.length); i++) {
      workers.push(processNext());
    }

    await Promise.all(workers);
    return results;
  }
}