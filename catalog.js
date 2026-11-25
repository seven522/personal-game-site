import './site-config.js?v=20261125.3';

const primary = window.SITE.game;

export const games = [
  {
    id: 'monster-paradise', title: primary.name, edition: primary.tag, description: primary.description,
    cover: { src: primary.cover, title: primary.name + ' · 开场标题', alt: primary.coverAlt, caption:'卡贴取自当前 Demo 的开场画面。' },
    platforms: { windows: primary.windows, android: primary.android }, pending: '待发布',
    standby: primary.standby, theme: 'forest', themeColor: '#f2ece2', controller: 'classic',
    entry: 'games/player.html?game=monster-paradise&v=20261125.2'
  },
  {
    id: 'iron-impact', title: '铁拳破阵', edition: '街机格斗 · v2.1',
    description: '在霓虹雨巷打出连招，蓄力破盾，迎战钢拳泰坦。',
    cover: {src:'media/demo/iron-arena.webp', title:'铁拳破阵 · 烈焰铁笼', alt:'烈焰铁笼里，拳手向钢拳泰坦发动必杀', caption:'实机截屏 · 第三波首领战'},
    standby: 'media/demo/iron-alley.webp', theme: 'iron', themeColor: '#172435', controller: 'arcade',
    entry: 'games/iron-impact/index.html?station=1',
    platforms: {windows:'', android:''}, pending: '无安装包', platformNote:'网页版可点「在线试玩」直接开玩。'
  }
];

export function applyTheme(game) {
  document.documentElement.dataset.theme = game.theme;
  document.querySelector('meta[name="theme-color"]').content = game.themeColor;
}
