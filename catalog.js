import './site-config.js?v=20261124.5';

const primary = window.SITE.game;

export const games = [
  {
    id: 'monster-paradise', title: primary.name, edition: primary.tag, description: primary.description,
    cover: { src: primary.cover, title: primary.name + ' · 开场标题', alt: primary.coverAlt, caption:'卡贴取自当前 Demo 的开场画面。' },
    platforms: { windows: primary.windows, android: primary.android }, pending: '待发布',
    standby: primary.standby
  }
];
