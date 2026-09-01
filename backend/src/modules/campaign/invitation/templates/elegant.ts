import type { InvitationData } from '../invitation.types';
import { INVITATION_WIDTH, INVITATION_HEIGHT } from '../invitation.types';

// A satori element tree (no JSX — plain nodes, so this file needs no tsconfig
// change). satori requires an explicit `display: 'flex'` on every node with
// more than one child, so every container below sets it.

type Style = Record<string, string | number>;
interface Node {
  type: string;
  props: { style?: Style; children?: Node | Node[] | string; [k: string]: unknown };
}

const el = (type: string, style: Style, children?: Node | Node[] | string): Node => ({
  type,
  props: { style, children },
});
const text = (style: Style, value: string): Node => ({ type: 'div', props: { style, children: value } });

// ── palette ──────────────────────────────────────────────────────────────────
// Warm cream ground (reads as soft yellow), so the type and the florals lean
// on cooler / punchier colours to sit against it.
const CREAM = '#FFFDF6';
const CREAM_EDGE = '#FBEEDC';
const INK_SOFT = '#6E6472';

const PLUM = '#6A2E5C'; // headline + host name
const CORAL = '#E1604A'; // kicker + divider diamond
const MARIGOLD = '#CE8A1E'; // "hosted by"
const ROSE = '#D3477E'; // florals + monogram wash
const BRINJAL = '#4A1E3C'; // greeting name + location + description text
const TEAL = '#2E8B8B'; // florals only (leaves stay green/teal)
const LEAF = '#4E9E6A'; // stems + leaves
const AQUA_LEAF = '#3E9E9E'; // second leaf tone
const CORNFLOWER = '#5B7FC4'; // buds

const RULE = 'rgba(106,46,92,0.28)'; // hairline rules / frame, tinted plum

const SERIF = 'Playfair Display';
const SANS = 'Poppins';

// ── ornament layer ──────────────────────────────────────────────────────────
// satori can't draw SVG paths itself, but it rasterises an <img> whose src is
// an SVG data URI (resvg handles it). This layer is: a floral spray mirrored
// into all four corners, a garland swag linking the two top corners, and a
// ribbon banner tucked under it. Kept in the top band + corners so the centre
// stays clear for the text. Every bloom / leaf / bud is a coloured variant so
// the corners read as a real bouquet, not a monochrome stamp.
function bloomDef(id: string, petal: string, core: string): string {
  return `<g id="${id}" stroke="${petal}" stroke-width="2" stroke-linejoin="round">
      <g fill="${petal}" fill-opacity="0.55">
        <use href="#petal"/>
        <use href="#petal" transform="rotate(60)"/>
        <use href="#petal" transform="rotate(120)"/>
        <use href="#petal" transform="rotate(180)"/>
        <use href="#petal" transform="rotate(240)"/>
        <use href="#petal" transform="rotate(300)"/>
      </g>
      <circle r="9" fill="${core}" stroke="none"/>
    </g>`;
}
function leafDef(id: string, color: string): string {
  return `<g id="${id}">
      <path d="M0 0 C-14 -18 -12 -48 0 -66 C12 -48 14 -18 0 0 Z" fill="${color}" fill-opacity="0.42" stroke="${color}" stroke-width="1.8"/>
      <path d="M0 -6 L0 -58" stroke="${color}" stroke-width="1.4" opacity="0.8"/>
    </g>`;
}
function budDef(id: string, color: string): string {
  return `<g id="${id}">
      <path d="M0 0 C-8 -8 -8 -26 0 -34 C8 -26 8 -8 0 0 Z" fill="${color}" fill-opacity="0.5" stroke="${color}" stroke-width="1.6"/>
    </g>`;
}

function backgroundArtDataUri(w: number, h: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <g id="petal"><path d="M0 0 C12 -7 18 -25 13 -44 C10 -55 -10 -55 -13 -44 C-18 -25 -12 -7 0 0 Z"/></g>
    ${bloomDef('bloomCoral', CORAL, MARIGOLD)}
    ${bloomDef('bloomRose', ROSE, MARIGOLD)}
    ${bloomDef('bloomMarigold', MARIGOLD, CORAL)}
    ${bloomDef('bloomPlum', PLUM, ROSE)}
    ${bloomDef('bloomTeal', TEAL, MARIGOLD)}
    ${leafDef('leafGreen', LEAF)}
    ${leafDef('leafAqua', AQUA_LEAF)}
    ${budDef('budRose', ROSE)}
    ${budDef('budBlue', CORNFLOWER)}
    <!-- one spray, rooted at the corner, fanning inwards -->
    <g id="spray">
      <g stroke="${LEAF}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.8">
        <path d="M10 4 C70 -18 140 -34 214 -34"/>
        <path d="M10 4 C34 -66 88 -112 140 -142"/>
        <path d="M10 4 C-6 -46 -2 -104 20 -160"/>
      </g>
      <use href="#leafGreen" transform="translate(78 -26) rotate(62) scale(0.85)"/>
      <use href="#leafAqua" transform="translate(150 -34) rotate(80) scale(0.75)"/>
      <use href="#leafGreen" transform="translate(58 -84) rotate(26) scale(0.9)"/>
      <use href="#leafAqua" transform="translate(24 -140) rotate(-8) scale(0.8)"/>
      <use href="#budRose" transform="translate(214 -34) rotate(88)"/>
      <use href="#budBlue" transform="translate(22 -160) rotate(2)"/>
      <use href="#bloomCoral" transform="translate(140 -142) scale(1.05)"/>
      <use href="#bloomMarigold" transform="translate(200 -58) scale(0.72)"/>
      <use href="#bloomRose" transform="translate(30 -184) scale(0.66)"/>
      <use href="#bloomPlum" transform="translate(26 4) scale(0.92)"/>
    </g>
    <g id="ribbon" stroke="${CORAL}" stroke-width="2.2" stroke-linejoin="round">
      <path d="M-186 18 L-244 2 L-224 27 L-244 52 L-186 36 Z" fill="${CORAL}" fill-opacity="0.16"/>
      <path d="M186 18 L244 2 L224 27 L244 52 L186 36 Z" fill="${CORAL}" fill-opacity="0.16"/>
      <path d="M-186 0 L186 0 L186 54 L-186 54 Z" fill="${MARIGOLD}" fill-opacity="0.12"/>
    </g>
  </defs>

  <g opacity="0.95">
    <!-- corner sprays -->
    <g transform="translate(0 ${h}) scale(0.82 0.82)"><use href="#spray"/></g>
    <g transform="translate(${w} ${h}) scale(-0.82 0.82)"><use href="#spray"/></g>
    <g transform="translate(0 0) scale(0.9 -0.9)"><use href="#spray"/></g>
    <g transform="translate(${w} 0) scale(-0.9 -0.9)"><use href="#spray"/></g>

    <!-- garland swag linking the top corners -->
    <path d="M${w * 0.16} 40 C ${w * 0.34} 150 ${w * 0.66} 150 ${w * 0.84} 40"
          fill="none" stroke="${LEAF}" stroke-width="2.4" stroke-linecap="round" opacity="0.75"/>
    <use href="#leafGreen" transform="translate(${w * 0.30} 104) rotate(120) scale(0.8)"/>
    <use href="#leafAqua" transform="translate(${w * 0.70} 104) rotate(-120) scale(0.8)"/>
    <use href="#budRose" transform="translate(${w * 0.38} 98) rotate(-26) scale(0.8)"/>
    <use href="#budBlue" transform="translate(${w * 0.62} 98) rotate(26) scale(0.8)"/>
    <use href="#bloomRose" transform="translate(${w * 0.5} 122) scale(0.92)"/>
    <use href="#bloomMarigold" transform="translate(${w * 0.42} 128) scale(0.6)"/>
    <use href="#bloomTeal" transform="translate(${w * 0.58} 128) scale(0.6)"/>

    <!-- ribbon banner tucked under the garland -->
    <g transform="translate(${w * 0.5} 22)"><use href="#ribbon"/></g>
  </g>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// First Latin letter / digit of the event title (or business name) — set very
// large and ~5%-opacity behind the content as a monogram watermark. Restricted
// to Latin/digits: a large Devanagari glyph's shirorekha reads as a grey box.
function monogramChar(data: InvitationData): string {
  const m = `${data.eventTitle} ${data.businessName}`.match(/[A-Za-z0-9]/);
  return (m?.[0] ?? '').toUpperCase();
}

// Headline size steps down as the title gets longer so it never needs more
// than ~3 lines and never overflows.
function titleSize(title: string): number {
  const n = title.length;
  if (n <= 20) return 82;
  if (n <= 34) return 66;
  if (n <= 52) return 52;
  if (n <= 76) return 42;
  return 36;
}

function clampDescription(d: string): string {
  const s = d.trim().replace(/\s+/g, ' ');
  if (s.length <= 190) return s;
  return `${s.slice(0, 187).trimEnd()}…`;
}

// A short centered rule with a diamond — the section divider.
function ornament(): Node {
  return el(
    'div',
    { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 30, marginBottom: 30 },
    [
      el('div', { width: 90, height: 1, backgroundColor: RULE }),
      el('div', {
        width: 8, height: 8, margin: '0 14px', backgroundColor: CORAL, transform: 'rotate(45deg)',
      }),
      el('div', { width: 90, height: 1, backgroundColor: RULE }),
    ],
  );
}

// "── KICKER ──" — small tracked caps flanked by thin rules.
function kicker(label: string): Node {
  return el(
    'div',
    { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    [
      el('div', { width: 64, height: 1, backgroundColor: RULE }),
      text(
        {
          fontFamily: SANS, fontSize: 22, fontWeight: 500, letterSpacing: 8,
          color: CORAL, margin: '0 18px', textTransform: 'uppercase',
        },
        label,
      ),
      el('div', { width: 64, height: 1, backgroundColor: RULE }),
    ],
  );
}

function detailRow(value: string, opts: { strong?: boolean; accent?: boolean } = {}): Node {
  return text(
    {
      fontFamily: SANS,
      fontSize: opts.strong ? 30 : 25,
      fontWeight: opts.strong ? 500 : 400,
      color: opts.strong ? PLUM : opts.accent ? BRINJAL : INK_SOFT,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 1.5,
    },
    value,
  );
}

export function elegantTemplate(data: InvitationData): Node {
  const children: Node[] = [];

  // Kicker
  children.push(kicker("You're Invited"));

  // Personalised greeting
  if (data.creatorName) {
    children.push(
      text(
        { fontFamily: SERIF, fontStyle: 'italic', fontSize: 30, color: BRINJAL, marginTop: 34, textAlign: 'center' },
        `Dear ${data.creatorName},`,
      ),
    );
  }

  // Event title
  children.push(
    text(
      {
        fontFamily: SERIF,
        fontWeight: 700,
        fontSize: titleSize(data.eventTitle),
        color: PLUM,
        textAlign: 'center',
        lineHeight: 1.12,
        marginTop: data.creatorName ? 20 : 40,
        maxWidth: 820,
      },
      data.eventTitle,
    ),
  );

  children.push(ornament());

  // Date / time / location
  children.push(detailRow(data.dateLabel, { strong: true }));
  if (data.timeLabel) children.push(detailRow(data.timeLabel));
  if (data.isOnline) children.push(detailRow('Online Event', { accent: true }));
  else if (data.locationLabel) children.push(detailRow(data.locationLabel, { accent: true }));

  // Description
  if (data.description) {
    children.push(
      text(
        {
          fontFamily: SERIF,
          fontStyle: 'italic',
          fontSize: 26,
          color: BRINJAL,
          textAlign: 'center',
          lineHeight: 1.6,
          marginTop: 40,
          maxWidth: 760,
        },
        clampDescription(data.description),
      ),
    );
  }

  // Host block — pushed toward the bottom by the flex spacer.
  const hostRowChildren: Node[] = [];
  if (data.businessLogoUrl) {
    hostRowChildren.push({
      type: 'img',
      props: {
        src: data.businessLogoUrl,
        width: 66,
        height: 66,
        style: { borderRadius: 33, marginRight: 18, objectFit: 'cover' },
      },
    });
  }
  hostRowChildren.push(
    text(
      { fontFamily: SERIF, fontWeight: 600, fontSize: 34, color: PLUM, textAlign: 'center' },
      data.businessName,
    ),
  );

  const host = el(
    'div',
    { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 30 },
    [
      text(
        { fontFamily: SANS, fontSize: 15, fontWeight: 500, letterSpacing: 6, color: MARIGOLD, textTransform: 'uppercase', marginBottom: 16 },
        'Hosted by',
      ),
      el('div', { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, hostRowChildren),
    ],
  );

  // ── assemble ───────────────────────────────────────────────────────────────
  // The main block grows to fill the space between the top edge and the host
  // footer and centres itself in it, so short and long invitations both stay
  // visually balanced rather than pinned to the top.
  const inner = el(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexGrow: 1,
      width: '100%',
      border: `1px solid ${RULE}`,
      borderRadius: 6,
      padding: '72px 76px 64px 76px',
    },
    [
      el(
        'div',
        { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', flexGrow: 1 },
        children,
      ),
      el(
        'div',
        { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' },
        [
          el('div', { width: 140, height: 1, backgroundColor: RULE, marginBottom: 34 }),
          host,
          text(
            { fontFamily: SANS, fontSize: 15, fontWeight: 400, letterSpacing: 4, color: 'rgba(110,100,114,0.7)', marginTop: 34, textTransform: 'uppercase' },
            'Powered by Kolab',
          ),
        ],
      ),
    ],
  );

  const FRAME = 44;
  const artW = INVITATION_WIDTH - FRAME * 2;
  const artH = INVITATION_HEIGHT - FRAME * 2;
  const mono = monogramChar(data);

  return el(
    'div',
    {
      position: 'relative',
      display: 'flex',
      width: INVITATION_WIDTH,
      height: INVITATION_HEIGHT,
      padding: FRAME,
      backgroundColor: CREAM,
      backgroundImage: `radial-gradient(circle at 50% 38%, ${CREAM} 0%, ${CREAM_EDGE} 100%)`,
    },
    [
      // Corner sprays + top garland + ribbon banner (behind the content).
      {
        type: 'img',
        props: {
          src: backgroundArtDataUri(artW, artH),
          width: artW,
          height: artH,
          style: { position: 'absolute', top: FRAME, left: FRAME },
        },
      },
      // Oversized monogram watermark — typography as texture.
      mono
        ? el(
            'div',
            {
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            },
            [
              text(
                { fontFamily: SERIF, fontWeight: 700, fontSize: 660, lineHeight: 1, color: ROSE, opacity: 0.05 },
                mono,
              ),
            ],
          )
        : el('div', { display: 'none' }),
      inner,
    ],
  );
}
