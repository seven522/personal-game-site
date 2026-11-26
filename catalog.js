import './site-config.js?v=20261125.4';

const primary = window.SITE.game;

export const games = [
  {
    id: 'monster-paradise', title: primary.name, edition: primary.tag, description: primary.description,
    cover: { src: primary.cover, title: primary.name + ' · 开场标题', alt: primary.coverAlt, caption:'卡贴取自当前 Demo 的开场画面。' },
    platforms: { windows: primary.windows, android: primary.android }, pending: '待发布',
    standby: primary.standby, theme: 'forest', themeColor: '#f2ece2', controller: 'classic',
    entry: 'games/player.html?game=monster-paradise&v=1c6b179'
  },
  {
    id: 'iron-impact', title: '铁拳破阵', edition: '街机格斗 · v2.4',
    description: '在霓虹雨巷打出连招，或直接挑战五大首领中的炎冰双煞。',
    cover: {src:'media/demo/iron-arena.webp?v=423eacf', title:'铁拳破阵 · 炎冰双煞', alt:'拳手在同一场战斗中面对烈焰罗刹和寒霜鬼姬', caption:'v2.4 实机截屏 · 炎冰双煞首领战'},
    standby: 'media/demo/iron-alley.webp?v=423eacf', theme: 'iron', themeColor: '#172435', controller: 'arcade',
    entry: 'games/iron-impact/index.html?station=1&v=423eacf',
    platforms: {windows:'', android:''}, pending: '无安装包', platformNote:'网页版可点「在线试玩」直接开玩。'
  }
];

export function applyTheme(game) {
  document.documentElement.dataset.theme = game.theme;
  document.querySelector('meta[name="theme-color"]').content = game.themeColor;
}
