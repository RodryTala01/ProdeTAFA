import { initials, participantShieldSource } from './AssetImage';
import { teamAssets } from './competition-assets';
import { downloadPng } from './download-png';
import type { LeagueData } from './LeagueView';
import { argentinaDateTime, utcDate } from './match-time';

const width = 1152;
const left = 64;
const tableWidth = 1024;
const headerY = 183;
const headerHeight = 72;
const rowHeight = 74;

type FixtureTeam = { id: string | null; name: string; logoUrl: string | null };
type FixtureMatch = {
  kickoffAt: string;
  home: FixtureTeam;
  away: FixtureTeam;
  matchType: 'NORMAL' | 'PENALTIES_ONLY';
  provider?: string;
};

function loadLogo(source?: string | null): Promise<HTMLImageElement | null> {
  if (!source) return Promise.resolve(null);
  return new Promise(resolve => {
    const image = new Image();
    const timer = setTimeout(() => resolve(null), 3500);
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      clearTimeout(timer);
      resolve(image.naturalWidth && image.naturalHeight ? image : null);
    };
    image.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    image.src = source;
  });
}

function sportsCanvas(title: string, subtitle: string, height: number, brand: HTMLImageElement | null) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, '#103e78');
  background.addColorStop(1, '#091d3b');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = 'middle';
  label(ctx, title, width / 2, 86, 890, '900 50px');
  label(ctx, subtitle, width / 2, 129, 890, 'bold 23px', '#afcfff');
  shield(ctx, brand, 'TAFA', 61, 84, 132, 82);
  return { canvas, ctx };
}

function label(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, maxWidth: number, font: string, color = '#fff', align: CanvasTextAlign = 'center') {
  ctx.font = `${font} system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  const chars = Array.from(value);
  let display = value;
  while (chars.length && ctx.measureText(display).width > maxWidth) {
    chars.pop();
    display = `${chars.join('')}…`;
  }
  ctx.fillText(display, x, y);
}

function shield(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, name: string, x: number, y: number, size: number, maxWidth = size) {
  if (!logo) {
    label(ctx, initials(name), x, y, maxWidth, 'bold 18px', '#bee0ff');
    return;
  }
  const scale = Math.min(maxWidth / logo.naturalWidth, size / logo.naturalHeight);
  const w = logo.naturalWidth * scale;
  const h = logo.naturalHeight * scale;
  ctx.drawImage(logo, x - w / 2, y - h / 2, w, h);
}

function band(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

const zoneColors: Record<string, { position: string; row: string }> = {
  champion: { position: '#4fbee7', row: '#194f81' },
  champions: { position: '#4fbee7', row: '#194f81' },
  promotion: { position: '#4cba83', row: '#1e494b' },
  playoff: { position: '#ffcf05', row: '#30424a' },
  relegation: { position: '#e63646', row: '#292743' },
};
const neutralZone = { position: '#42464c', row: '#14345c' };

export async function downloadLeaguePng(data: LeagueData) {
  const { standings, season, division, competition } = data;
  const [brand, ...logos] = await Promise.all([
    loadLogo('/brand/tafa.png'),
    ...standings.map(row => loadLogo(participantShieldSource(row.fullName, row.userId, season.seasonNumber || undefined, row.logoUrl, row.shieldUrl))),
  ]);
  const title = division.code === 'A' ? 'Primera División' : division.code === 'B' ? 'Segunda División' : competition.displayName;
  const legend = new Map<string, string>();
  for (const { zone } of standings) {
    if (zone && Object.hasOwn(zoneColors, zone.code)) {
      const color = zoneColors[zone.code].position;
      if (!legend.has(color) || zone.code === 'champions') legend.set(color, zone.label);
    }
  }
  const tableBottom = headerY + headerHeight + standings.length * rowHeight;
  const subtitle = (season.seasonNumber ? `Temporada ${season.seasonNumber}` : season.name) + (data.provisional ? ' · Tabla provisional' : '');
  const { canvas, ctx } = sportsCanvas(title.toLocaleUpperCase('es-AR'), subtitle.toLocaleUpperCase('es-AR'), tableBottom + (legend.size ? 164 : 64), brand);
  const headers = ['#', 'Jugador', 'PTS', 'Plenos', 'Parciales', 'Errados', 'Extras'];
  const widths = [44, 404, 116, 115, 115, 115, 115];
  const headerColors = ['#102641', '#102641', '#122f50', '#123949', '#344b50', '#38364f', '#344b50'];
  let x = left;
  headers.forEach((header, index) => {
    band(ctx, headerColors[index], x, headerY, widths[index], headerHeight);
    label(ctx, header, index === 1 ? x + 78 : x + widths[index] / 2, headerY + headerHeight / 2, widths[index] - 8, 'bold 22px', '#bedbfa', index === 1 ? 'left' : 'center');
    x += widths[index];
  });
  standings.forEach((row, index) => {
    const y = headerY + headerHeight + index * rowHeight;
    const center = y + rowHeight / 2;
    const zone = row.zone && Object.hasOwn(zoneColors, row.zone.code) ? zoneColors[row.zone.code] : neutralZone;
    band(ctx, zone.row, left, y, tableWidth, rowHeight);
    band(ctx, zone.position, left, y, widths[0], rowHeight);
    band(ctx, index % 2 ? '#135991' : '#1266a5', left + widths[0] + widths[1], y, widths[2], rowHeight);
    label(ctx, String(row.position), left + widths[0] / 2, center, widths[0] - 4, 'bold 22px');
    shield(ctx, logos[index], row.fullName, left + widths[0] + 36, center, 66);
    label(ctx, row.fullName, left + widths[0] + 78, center, widths[1] - 92, 'bold 24px', '#fff', 'left');
    x = left + widths[0] + widths[1];
    [row.points, row.fulls, row.partials, row.errors, row.extras].forEach((value, metric) => {
      const w = widths[metric + 2];
      label(ctx, String(value), x + w / 2, center, w - 10, metric === 0 ? '900 38px' : '500 23px');
      x += w;
    });
    band(ctx, '#ffffff28', left, y + rowHeight - 1, tableWidth, 1);
  });
  if (legend.size) {
    const items = Array.from(legend);
    ctx.font = '500 22px system-ui, sans-serif';
    const itemWidths = items.map(([, name]) => ctx.measureText(name).width + 34);
    const gap = 44;
    x = (width - itemWidths.reduce((sum, w) => sum + w, 0) - gap * (items.length - 1)) / 2;
    items.forEach(([color, name], index) => {
      band(ctx, color, x, tableBottom + 59, 20, 20);
      label(ctx, name, x + 34, tableBottom + 69, itemWidths[index], '500 22px', '#fff', 'left');
      x += itemWidths[index] + gap;
    });
  }
  await downloadPng(canvas, `${title} ${season.seasonNumber || season.name}`);
}

export async function downloadFixturePng(name: string, matches: FixtureMatch[]) {
  const sorted = [...matches].sort((a, b) => +utcDate(a.kickoffAt) - +utcDate(b.kickoffAt));
  const logos = new Map<string, Promise<HTMLImageElement | null>>();
  const teamLogo = (team: FixtureTeam) => {
    const source = team.logoUrl || (team.id ? teamAssets[team.id] : undefined);
    if (!source) return Promise.resolve(null);
    if (!logos.has(source)) logos.set(source, loadLogo(source));
    return logos.get(source)!;
  };
  const [brand, shields] = await Promise.all([
    loadLogo('/brand/tafa.png'),
    Promise.all(sorted.map(match => Promise.all([teamLogo(match.home), teamLogo(match.away)]))),
  ]);
  const tableBottom = headerY + headerHeight + sorted.length * rowHeight;
  const { canvas, ctx } = sportsCanvas(name.toLocaleUpperCase('es-AR'), 'HORARIOS DE ARGENTINA', tableBottom + 72, brand);
  band(ctx, '#102641', left, headerY, tableWidth, headerHeight);
  label(ctx, 'DÍA Y HORA', 178, headerY + 36, 205, 'bold 22px', '#bedbfa');
  label(ctx, 'PARTIDO', 688, headerY + 36, 700, 'bold 22px', '#bedbfa');
  sorted.forEach((match, index) => {
    const y = headerY + headerHeight + index * rowHeight;
    const center = y + rowHeight / 2;
    band(ctx, index % 2 ? '#14345c' : '#194a79', left, y, tableWidth, rowHeight);
    const date = utcDate(match.kickoffAt);
    const kickoff = Number.isNaN(+date) ? 'Horario a confirmar' : argentinaDateTime(match.kickoffAt, { weekday: 'short' });
    label(ctx, kickoff, 178, center, 210, 'bold 22px', '#bedbfa');
    shield(ctx, shields[index][0], match.home.name, 328, center, 51);
    label(ctx, match.home.name, 361, center, 280, 'bold 23px', '#fff', 'left');
    label(ctx, 'VS', 688, center - (match.matchType === 'PENALTIES_ONLY' ? 9 : 0), 90, 'bold 19px', '#bedbfa');
    if (match.matchType === 'PENALTIES_ONLY') label(ctx, 'Penales', 688, center + 13, 90, '500 14px', '#bedbfa');
    label(ctx, match.away.name, 1016, center, 280, 'bold 23px', '#fff', 'right');
    shield(ctx, shields[index][1], match.away.name, 1052, center, 51);
    band(ctx, '#ffffff28', left, y + rowHeight - 1, tableWidth, 1);
  });
  if (sorted.some(match => match.provider === 'promiedos')) {
    label(ctx, 'Datos de partidos: Promiedos', left, tableBottom + 34, tableWidth, '500 18px', '#bedbfa', 'left');
  }
  await downloadPng(canvas, name);
}
