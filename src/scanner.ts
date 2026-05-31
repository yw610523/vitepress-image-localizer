import fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import pc from 'picocolors';
import type { ImageInfo, ScanResult, LocalizerOptions } from './types.js';
import nodeFs from 'fs';

/** 判断是否为远程 URL */
function isRemoteUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/** 从 Markdown 内容中提取所有图片 */
function extractImages(content: string, filePath: string): ImageInfo[] {
  const images: ImageInfo[] = [];
  // 匹配 ![alt](url) 和 ![](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    let match;
    while ((match = imageRegex.exec(line)) !== null) {
      const url = match[2].trim();
      const alt = match[1] || undefined;

      // 只处理有效的图片 URL（远程或本地路径）
      // 远程：http:// 或 https://
      // 本地：/xxx/xxx 形式的路径（不包含协议）
      if (isRemoteUrl(url) || (!url.includes('://') && url.startsWith('/'))) {
        images.push({
          url,
          filePath,
          alt,
          line: index + 1
        });
      }
    }
  });

  return images;
}

export class Scanner {
  private srcDir: string;

  constructor(srcDir: string = 'src') {
    this.srcDir = srcDir;
  }

  /**
   * 扫描项目中所有 Markdown 文件中的远程图片
   */
  async scan(options: Partial<LocalizerOptions> = {}): Promise<ScanResult> {
    const srcPath = path.resolve(this.srcDir).replace(/\\/g, '/');
    let files: string[];

    if (options.scanPath) {
      // scanPath 可以是文件或目录
      const scanFullPath = path.resolve(options.scanPath).replace(/\\/g, '/');
      const stat = await nodeFs.promises.stat(scanFullPath);

      if (stat.isFile()) {
        // 是文件，直接使用
        files = [scanFullPath];
      } else if (stat.isDirectory()) {
        // 是目录，扫描该目录下的 md 文件
        files = glob.sync(`${scanFullPath}/**/*.md`, {
          ignore: [`${scanFullPath}/**/_*.md`]
        });
      } else {
        files = [];
      }
    } else {
      files = glob.sync(`${srcPath}/**/*.md`, {
        ignore: [`${srcPath}/**/_*.md`]
      });
    }

    console.log(`${pc.cyan('SCAN')} found ${files.length} markdown files`);

    const allImages: ImageInfo[] = [];

    for (const file of files) {
      const content = await nodeFs.promises.readFile(file, 'utf-8');
      const images = extractImages(content, file);
      allImages.push(...images);
    }

    console.log(`${pc.cyan('SCAN')} found ${pc.bold(allImages.length)} images`);

    return {
      images: allImages,
      totalFiles: files.length,
      totalImages: allImages.length
    };
  }
}