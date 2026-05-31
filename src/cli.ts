#!/usr/bin/env node

import { Command } from 'commander';
import pc from 'picocolors';
import { runScan, runDownload, runClean, runNormalize } from './commands.js';

const program = new Command();

program
  .name('vitepress-image-localizer')
  .description('Auto-download remote images and replace with local paths in VitePress')
  .version('1.0.0');

program
  .command('scan')
  .description('Scan all remote images in the project')
  .option('-p, --path <path>', 'Scan specific directory or file')
  .action(async (opts) => {
    try {
      await runScan({ dryRun: true, scanPath: opts.path });
    } catch (error) {
      console.error(pc.red('Error:'), error);
      process.exit(1);
    }
  });

program
  .command('download')
  .description('Download remote images and update markdown references')
  .option('-d, --dry-run', 'Preview mode without actual changes', false)
  .option('-p, --path <path>', 'Scan specific directory or file')
  .option('--prefix <prefix>', 'Image path prefix (default: images)', 'images')
  .option('--absolute', 'Use absolute paths like /images/xxx.jpg', false)
  .option('--relative', 'Use relative paths like ../images/xxx.jpg', false)
  .action(async (opts) => {
    try {
      await runDownload({ dryRun: opts.dryRun, scanPath: opts.path, imagePrefix: opts.prefix, useAbsolute: opts.absolute, useRelative: opts.relative });
    } catch (error) {
      console.error(pc.red('Error:'), error);
      process.exit(1);
    }
  });

program
  .command('clean')
  .description('Find and remove orphaned images not referenced by any markdown')
  .option('--prefix <prefix>', 'Image path prefix (default: images)', 'images')
  .action(async (opts) => {
    try {
      await runClean({ imagePrefix: opts.prefix });
    } catch (error) {
      console.error(pc.red('Error:'), error);
      process.exit(1);
    }
  });

program
  .command('normalize')
  .description('Normalize local image paths (default: src-relative like images/xxx.jpg)')
  .option('-d, --dry-run', 'Preview mode without actual changes', false)
  .option('-p, --path <path>', 'Normalize specific directory or file')
  .option('--prefix <prefix>', 'Image path prefix (default: images)', 'images')
  .option('--absolute', 'Use absolute paths like /images/xxx.jpg', false)
  .option('--relative', 'Use relative paths like ../images/xxx.jpg', false)
  .action(async (opts) => {
    try {
      await runNormalize({ dryRun: opts.dryRun, scanPath: opts.path, imagePrefix: opts.prefix, useAbsolute: opts.absolute, useRelative: opts.relative });
    } catch (error) {
      console.error(pc.red('Error:'), error);
      process.exit(1);
    }
  });

program.parse();