import type { Plugin } from 'vitepress';

/**
 * VitePress 插件：自动将 Markdown 中的远程图片本地化
 */
export function imageLocalizerPlugin(): Plugin {
  return {
    name: 'vitepress-image-localizer',
    // 目前主要是 CLI 工具，插件部分可以扩展
  };
}

export { runScan, runDownload, runClean } from './commands.js';
export { Scanner } from './scanner.js';
export { ImageDownloader } from './download.js';
export { Replacer } from './replacer.js';
export type { ImageInfo, DownloadResult, ScanResult, LocalizerOptions } from './types.js';