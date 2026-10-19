# oneg

深色极简个人主页，使用 HTML、CSS、原生 JavaScript，可直接部署至 GitHub Pages，无需构建。

## 本地预览

在项目目录运行：

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 http://127.0.0.1:4173 。也可直接用浏览器打开 `index.html`。

## 页面与交互

- Hero、两张作品卡片、About / Focus、Connect。
- 桌面端：3D 卡片倾斜、径向光斑、磁性鼠标光圈及背景微光。
- `Cmd + K` / `Ctrl + K` 或页面上的快捷键按钮打开命令面板。
- 命令：`about`、`projects`、`contact`、`theme`、`help`；支持方向键、Enter、Esc。
- `theme` 在明暗主题间切换，浏览器允许时保存在 localStorage。
- Orbit 与 Signal 为标注清楚的交互概念：前者连接创意，后者展示当前浏览器的真实环境信息。
- 触摸设备关闭鼠标效果；系统启用“减少动态效果”时关闭装饰动画与倾斜。

## 修改内容

- `index.html`：名称、简介、GitHub 链接和卡片展示内容。尚未提供的邮箱或其他社交主页没有添加。
- `styles.css`：顶部 CSS 变量控制配色，文件末尾为响应式规则。
- `script.js`：命令和作品弹窗内容，以及微交互逻辑。

按需求保留 Tailwind、GSAP、Lucide CDN；主要样式和交互也提供独立实现。CDN 不可用时，系统字体、内联 SVG、CSS / 原生 JS 可维持页面主要功能。

现有 `.github/workflows/static.yml` 在推送到 `main` 后部署 GitHub Pages。
