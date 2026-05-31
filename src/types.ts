export interface ImageInfo {
  /** 原始远程 URL */
  url: string;
  /** 当前 Markdown 文件路径 */
  filePath: string;
  /** 图片 alt 文本 */
  alt?: string;
  /** 行号 */
  line: number;
}

export interface DownloadResult {
  url: string;
  localPath: string;
  success: boolean;
  error?: string;
  filename?: string;
}

export interface ScanResult {
  images: ImageInfo[];
  totalFiles: number;
  totalImages: number;
}

export interface LocalizerOptions {
  /** VitePress srcDir，默认为 'src' */
  srcDir?: string;
  /** 图片本地存储的子目录，默认为 'public/images' */
  imageDir?: string;
  /** 图片路径前缀，默认为 'images' */
  imagePrefix?: string;
  /** 是否跳过已本地化的图片 */
  skipLocal?: boolean;
  /** 最大并发下载数 */
  concurrency?: number;
  /** 指定扫描的路径（目录或文件） */
  scanPath?: string;
  /** 是否使用相对路径，默认 true */
  useRelative?: boolean;
}