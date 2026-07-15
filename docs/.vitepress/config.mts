import { defineConfig } from 'vitepress';

// Bilingual (English + 简体中文) docs site, deployed to GitHub Pages.
export default defineConfig({
  title: 'Clousight',
  description: 'Zero-backend multi-cloud status monitor browser extension.',
  base: '/clousight-monitor-extension/',
  cleanUrls: true,
  lastUpdated: true,
  // Keep repo-only docs out of the site; README files render on GitHub, not here.
  srcExclude: ['STORE_LISTING.md', '**/README.md'],
  // Cross-links to repo files (../CONTRIBUTING.md, etc.) aren't site pages.
  ignoreDeadLinks: true,

  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/clousight/clousight-monitor-extension' }
    ]
  },

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/installation' },
          { text: 'Architecture', link: '/architecture' }
        ],
        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'Installation', link: '/installation' },
              { text: 'Usage', link: '/usage' },
              { text: 'Best Practices', link: '/best-practices' },
              { text: 'FAQ', link: '/faq' }
            ]
          },
          {
            text: 'Reference',
            items: [{ text: 'Architecture', link: '/architecture' }]
          }
        ]
      }
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/installation' },
          { text: '架构原理', link: '/zh/architecture' }
        ],
        sidebar: [
          {
            text: '指南',
            items: [
              { text: '安装', link: '/zh/installation' },
              { text: '使用', link: '/zh/usage' },
              { text: '最佳实践', link: '/zh/best-practices' },
              { text: '常见问题', link: '/zh/faq' }
            ]
          },
          {
            text: '参考',
            items: [{ text: '架构原理', link: '/zh/architecture' }]
          }
        ]
      }
    }
  }
});
