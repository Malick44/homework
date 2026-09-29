import { RATINGS } from '../lib/util';

function starPts(cx: number, cy: number, R: number, r: number) {
  const p: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 ? r : R;
    p.push((cx + d * Math.cos(a)).toFixed(2) + ',' + (cy + d * Math.sin(a)).toFixed(2));
  }
  return p.join(' ');
}
const STAR = starPts(20, 21, 10.5, 4.6);

function Face({ rating }: { rating: number }) {
  if (rating === 2) return (<>
    <circle cx="15.2" cy="16.8" r="2.1" fill="#fff" /><circle cx="24.8" cy="16.8" r="2.1" fill="#fff" />
    <path d="M13.4 22.4Q20 29.6 26.6 22.4" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
  </>);
  if (rating === 1) return (<>
    <path d="M20 29.5V20" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M20 22c-4.8 0-7.8-3-7.8-7.4 4.6 0 7.8 2.9 7.8 7.4z" fill="#fff" />
    <path d="M20 19.6c0-4.6 3.1-7.8 8-7.8 0 4.7-3.2 7.8-8 7.8z" fill="#fff" />
  </>);
  return <polygon points={STAR} fill="#fff" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />;
}

interface Props { color: string; rating: number; size?: number; rot?: number; hidden?: boolean; label?: string; isNew?: boolean }

export function Sticker({ color, rating, size = 40, rot = 0, hidden, label, isNew }: Props) {
  const a11y = hidden ? { 'aria-hidden': true as const } : { role: 'img', 'aria-label': label || RATINGS[rating] || 'Sticker' };
  return (
    <svg className={'sticker' + (isNew ? ' is-new' : '')} width={size} height={size} viewBox="0 0 40 40"
      style={{ ['--rot' as string]: `${rot}deg` }} focusable="false" {...a11y}>
      <circle className="edge" cx="20" cy="20" r="19.6" />
      <circle cx="20" cy="20" r="16.6" fill={color} />
      <Face rating={rating || 3} />
    </svg>
  );
}
