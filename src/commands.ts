import * as path from 'path';
import fs from 'fs-extra';
import * as nodeFs from 'fs';
import * as readline from 'readline';
import pc from 'picocolors';
import { Scanner } from './scanner.js';
import { ImageDownloader } from './download.js';
import { Replacer } from './replacer.js';
import type { LocalizerOptions } from './types.js';

/** 从 .vitepress/config.mts 读取 srcDir */
async function getSrcDir(): Promise<string> {
  const configPath = path.join(process.cwd(), '.vitepress', 'config.mts');
  if (await fs.pathExists(configPath)) {
    const content = await nodeFs.promises.readFile(configPath, 'utf-8');
    const match = content.match(/srcDir:\s*['"]([^'"]+)['"]/);
    if (match) return match[1];
  }
  return 'src';
}

function getImageDir(srcDir: string, prefix: string = 'images'): string {
  return path.join(process.cwd(), srcDir, 'public', prefix);
}

async function loadConfig(prefix: string = 'images'): Promise<Partial<LocalizerOptions>> {
  const srcDir = await getSrcDir();
  return {
    srcDir,
    imageDir: path.join(process.cwd(), srcDir, 'public', prefix),
    imagePrefix: prefix,
    concurrency: 3
  };
}

export async function runScan(options: Partial<LocalizerOptions> & { dryRun?: boolean } = {}) {
  const config = await loadConfig();
  const scanner = new Scanner(config.srcDir);

  console.log(pc.bold('\n🔍 Scanning for remote images...\n'));
  const result = await scanner.scan({ ...config, scanPath: options.scanPath });

  if (result.images.length === 0) {
    console.log(pc.green('✅ No remote images found'));
    return;
  }

  // 按文件分组显示
  const byFile = new Map<string, typeof result.images>();
  for (const img of result.images) {
    if (!byFile.has(img.filePath)) byFile.set(img.filePath, []);
    byFile.get(img.filePath)!.push(img);
  }

  for (const [file, imgs] of byFile) {
    console.log(pc.underline(file));
    for (const img of imgs) {
      console.log(`  ${pc.cyan(`line ${img.line}`)} ${img.url}`);
    }
    console.log();
  }

  console.log(pc.dim(`Total: ${result.totalImages} images in ${result.totalFiles} files`));
}

export async function runDownload(options: Partial<LocalizerOptions> & { dryRun?: boolean; useRelative?: boolean } = {}) {
  const prefix = options.imagePrefix || 'images';
  const useRelative = options.useRelative !== false; // 默认使用相对路径
  const config = await loadConfig(prefix);
  const imageDir = await getImageDir(config.srcDir!, prefix);

  const scanner = new Scanner(config.srcDir);
  const downloader = new ImageDownloader(imageDir);
  const replacer = new Replacer();

  console.log(pc.bold('\n📥 Downloading images...\n'));
  const result = await scanner.scan({ ...config, scanPath: options.scanPath, imagePrefix: prefix });

  if (result.images.length === 0) {
    console.log(pc.green('✅ No remote images found'));
    return;
  }

  // 区分远程图片和本地图片
  const remoteImages = result.images.filter(img => img.url.startsWith('http'));
  const localImages = result.images.filter(img => !img.url.startsWith('http'));

  // 只下载远程图片（带上下文信息以便错误定位）
  const imagesToDownload = remoteImages.map(img => ({
    url: img.url,
    filePath: img.filePath,
    line: img.line
  }));
  console.log(pc.dim(`Found ${imagesToDownload.length} remote images\n`));

  // 下载远程图片
  const downloadResults = await downloader.downloadAll(imagesToDownload, config.concurrency);

  // 统计
  const success = downloadResults.filter(r => r.success).length;
  const failed = downloadResults.filter(r => !r.success).length;
  console.log(pc.bold(`\n📊 Results: ${pc.green(success)} success, ${pc.red(failed)} failed`));

  // 替换 Markdown（只替换实际下载的图片，不要动本地已有的引用）
  if (!options.dryRun && success > 0) {
    console.log(pc.bold('\n✏️  Updating markdown files...\n'));
    // 只传下载成功的远程图片结果，不包含本地图片
    const downloadedImages = result.images.filter(img => img.url.startsWith('http'));
    await replacer.replace(downloadedImages, downloadResults, options.dryRun, prefix, imageDir, useRelative);
  }
}

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

async function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface();
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function runClean(options: { imagePrefix?: string } = {}) {
  const prefix = options.imagePrefix || 'images';
  const config = await loadConfig(prefix);
  const imageDir = await getImageDir(config.srcDir!, prefix);

  // 扫描所有引用的图片（不限制路径，找出所有被引用的图片）
  const scanner = new Scanner(config.srcDir);
  console.log(pc.bold('\n🧹 Finding orphaned images...\n'));
  const scanResult = await scanner.scan({ ...config, imagePrefix: prefix });

  // 获取引用的图片路径集合（包括远程URL和本地引用）
  const referencedImages = new Set<string>();
  for (const img of scanResult.images) {
    // 远程图片：取文件名
    if (img.url.startsWith('http')) {
      const filename = img.url.split('/').pop();
      if (filename) referencedImages.add(filename);
    }
    // 本地图片：提取路径中的文件名（处理绝对路径和相对路径）
    else {
      // 尝试从路径中提取文件名
      const filename = img.url.split('/').pop();
      if (filename) referencedImages.add(filename);
    }
  }

  // 获取本地所有图片
  if (!(await fs.pathExists(imageDir))) {
    console.log(pc.yellow('⚠️  Image directory does not exist'));
    return;
  }

  const localFiles = await fs.readdir(imageDir);

  // 找出未被引用的图片
  const orphaned = localFiles.filter(file => !referencedImages.has(file));

  if (orphaned.length === 0) {
    console.log(pc.green('✅ No orphaned images found'));
    return;
  }

  console.log(pc.bold(`Found ${orphaned.length} orphaned images:\n`));
  orphaned.forEach((file, i) => {
    console.log(`  ${i + 1}. ${file}`);
  });

  console.log(pc.dim(`\nImage directory: ${imageDir}\n`));

  const answer = await askQuestion(pc.cyan('Select images to delete (comma-separated numbers, "all", or "none"): '));
  const trimmed = answer.trim().toLowerCase();

  if (trimmed === 'none' || trimmed === 'n') {
    console.log(pc.yellow('Aborted'));
    return;
  }

  let toDelete: string[];
  if (trimmed === 'all' || trimmed === 'a') {
    toDelete = orphaned;
  } else {
    toDelete = trimmed.split(',')
      .map(s => s.trim())
      .filter(s => s)
      .map(s => {
        const idx = parseInt(s, 10) - 1;
        return orphaned[idx];
      })
      .filter(Boolean);
  }

  if (toDelete.length === 0) {
    console.log(pc.yellow('No images selected'));
    return;
  }

  console.log(pc.bold(`\n🗑️  Deleting ${toDelete.length} images...\n`));
  for (const file of toDelete) {
    await fs.remove(path.join(imageDir, file));
    console.log(`${pc.red('DEL')} ${pc.gray(file)}`);
  }
  console.log(pc.green(`\n✅ Deleted ${toDelete.length} images`));
}