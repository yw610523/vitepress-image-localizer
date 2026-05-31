# vitepress-image-localizer

自动将 VitePress 项目中的远程图片下载到本地，并替换 Markdown 引用为本地路径。

## 安装

```bash
# 使用私有 Nexus 仓库（group 地址，包含公共包代理）
npm install vitepress-image-localizer -D --registry=https://registry.yys2024.cn/repository/npm/

# 或全局安装
npm install vitepress-image-localizer -g --registry=https://registry.yys2024.cn/repository/npm/
```

## 使用方法

### 扫描图片

```bash
# 扫描整个项目
npx vitepress-image-localizer scan

# 扫描指定目录
npx vitepress-image-localizer scan -p src/面试/07.DB

# 扫描指定文件
npx vitepress-image-localizer scan -p src/面试/07.DB/01.Index.md
```

### 下载并替换

```bash
# 下载并替换整个项目的远程图片（默认使用相对路径）
npx vitepress-image-localizer download

# 使用绝对路径（如 /images/xxx.jpg）
npx vitepress-image-localizer download --absolute

# 下载并替换指定目录
npx vitepress-image-localizer download -p src/面试/07.DB

# 预览模式（不实际下载或修改）
npx vitepress-image-localizer download --dry-run

# 使用自定义图片前缀
npx vitepress-image-localizer download --prefix img
```

### 清理孤立图片

```bash
# 清理未被引用的图片（扫描整个项目）
npx vitepress-image-localizer clean

# 指定图片前缀
npx vitepress-image-localizer clean --prefix img
```

清理命令会：
1. 扫描所有 Markdown 文件中的图片引用
2. 列出 `public/{prefix}/` 目录下未被引用的图片
3. 提示选择要删除的图片（支持逗号分隔多选、`all` 全部删除、`none` 取消）

### 规整本地图片路径

```bash
# 将本地图片路径规整为相对路径（默认）
npx vitepress-image-localizer normalize

# 将本地图片路径规整为绝对路径
npx vitepress-image-localizer normalize --absolute

# 将本地图片路径规整为 src 相对路径（如 images/xxx.jpg），适合本地打开 md 查看
npx vitepress-image-localizer normalize --src-relative

# 预览模式
npx vitepress-image-localizer normalize --dry-run

# 规整指定目录
npx vitepress-image-localizer normalize -p src/guide
```

用于统一已有本地图片引用的路径格式，不下载任何图片。

## 命令行选项

| 命令 | 选项 | 说明 |
|------|------|------|
| `scan` | `-p, --path <path>` | 扫描指定目录或文件 |
| `download` | `-p, --path <path>` | 下载指定目录或文件中的图片 |
| `download` | `-d, --dry-run` | 预览模式，不实际修改 |
| `download` | `--prefix <prefix>` | 图片路径前缀，默认 `images` |
| `download` | `--absolute` | 使用绝对路径（默认相对路径） |
| `clean` | `--prefix <prefix>` | 图片路径前缀，默认 `images` |
| `normalize` | `-p, --path <path>` | 规整指定目录或文件中的图片路径 |
| `normalize` | `-d, --dry-run` | 预览模式，不实际修改 |
| `normalize` | `--prefix <prefix>` | 图片路径前缀，默认 `images` |
| `normalize` | `--absolute` | 使用绝对路径（默认相对路径） |
| `normalize` | `--src-relative` | 使用 src 相对路径（如 images/xxx.jpg） |

## 工作原理

1. 扫描 `{srcDir}/**/*.md` 下所有 Markdown 文件
2. 使用正则 `![](url)` 匹配图片链接（支持远程 URL 和本地路径）
3. 区分远程图片（下载）和本地图片（跳过）
4. 下载远程图片到 `{srcDir}/public/{prefix}/`
5. 生成唯一文件名（MD5 hash + 原扩展名）
6. 替换原文件中的 URL 为本地路径（相对路径或绝对路径）
7. `clean` 命令对比 Markdown 引用和本地图片，删除孤立文件

### 路径模式

- **相对路径（默认）**：根据 Markdown 文件位置计算相对路径，如 `../images/xxx.jpg`
- **绝对路径（`--absolute`）**：使用 `/prefix/xxx.jpg` 格式，适合 VitePress 环境

## 配置

- 插件自动从 `.vitepress/config.mts` 读取 `srcDir` 配置
- 图片默认保存到 `{srcDir}/public/images/`
- 可通过 `--prefix` 自定义图片路径前缀（如 `--prefix img` 保存到 `{srcDir}/public/img/`）

## 示例

```bash
# 扫描项目
$ npx vitepress-image-localizer scan
🔍 Scanning for remote images...

SCAN found 12 markdown files
SCAN found 5 remote images

src/面试/01.AI.md
  line 15 https://example.com/image1.jpg

# 下载图片
$ npx vitepress-image-localizer download
📥 Downloading images...

DOWN saved: a1b2c3d4e5f6.jpg
DOWN saved: f6e5d4c3b2a1.jpg
...

📊 Results: 5 success, 0 failed

✏️  Updating markdown files...

REPL src/面试/01.AI.md

# 清理孤立图片
$ npx vitepress-image-localizer clean
🧹 Finding orphaned images...

SCAN found 50 markdown files
SCAN found 171 images
Found 3 orphaned images:

  1. abc123def456.jpg
  2. xyz789abc123.png

Image directory: D:\dev\docs\src\public\images

Select images to delete (comma-separated numbers, "all", or "none"): 1,2
🗑️  Deleting 2 images...

DEL abc123def456.jpg
DEL xyz789abc123.png

✅ Deleted 2 images
```

## License

MIT