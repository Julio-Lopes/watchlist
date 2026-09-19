import { wrappedSchema } from '@watchlist/shared';
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

/** Edge porque o ImageResponse roda em WebAssembly: no runtime Node ele
 *  precisaria de binarios nativos que a Vercel nao entrega no plano gratuito. */
export const runtime = 'edge';

const PAPER = '#F7F5F2';
const SUMI = '#1A1A1A';
const FAINT = '#6b6763';
const TORII = '#B33A3A';
const HAIRLINE = '#e2ded8';
const COVER_BG = '#eae6e0';

const SERIF = 'Mincho';

/** O gerador de imagem só lê PNG e JPEG. O CDN do MyAnimeList serve a mesma
 *  capa nos dois formatos, então trocamos a extensão em vez de perder a capa. */
const readable = (url: string | null): string | null =>
  url && url.includes('cdn.myanimelist.net') ? url.replace(/\.webp$/, '.jpg') : url;

const formatDays = (minutes: number): string => {
  const hours = Math.round(minutes / 60);
  const days = Math.floor(hours / 24);
  return days > 0 ? `${days} dias` : `${hours} horas`;
};

/**
 * Shippori Mincho, a mesma serifada do site, só com os glifos usados nesta
 * imagem (o Google Fonts devolve um arquivo pequeno com `text=`). Se o download
 * falhar, a imagem sai na fonte padrão em vez de quebrar.
 */
async function loadSerif(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400&text=${encodeURIComponent(text)}`
      )
    ).text();

    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;

    const font = await fetch(url);
    return font.ok ? await font.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');
  const year = request.nextUrl.searchParams.get('year');

  if (!username || !year) return new Response('parâmetros ausentes', { status: 400 });

  const response = await fetch(`${process.env.API_ORIGIN}/wrapped/${username}/${year}`, {
    headers: { accept: 'application/json' }
  });

  if (!response.ok) return new Response('não encontrado', { status: 404 });

  const parsed = wrappedSchema.safeParse(await response.json());
  if (!parsed.success) return new Response('dados inválidos', { status: 502 });

  const data = parsed.data;
  const name = data.owner.displayName ?? data.owner.username;
  const hero = data.mostWatched;

  /** A obra em destaque sai das capas ao lado: repetir a mesma imagem duas
   *  vezes na mesma peca seria desperdicio de espaco. Cada capa e uma busca
   *  externa na geracao: tres e o limite antes de o tempo de resposta pesar. */
  const strip = data.highlights.filter((item) => item.externalId !== hero?.externalId).slice(0, 3);

  const streak = String(data.longestStreak);
  const average =
    data.averageRating !== null ? (data.averageRating / 10).toFixed(1).replace('.', ',') : '—';
  const episodes = data.totalEpisodes.toLocaleString('pt-BR');
  const kicker = `RETROSPECTO ${data.year}${data.partial ? ' ATÉ AGORA' : ''}`;

  const serifText = [
    'Watchlist',
    episodes,
    streak,
    average,
    data.topGenre ?? '',
    hero?.title ?? '',
    '0123456789,.—·',
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZáàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ'
  ].join('');

  const serif = await loadSerif(serifText);
  const fonts = serif
    ? [{ name: SERIF, data: serif, weight: 400 as const, style: 'normal' as const }]
    : undefined;
  const display = serif ? SERIF : 'sans-serif';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1350px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          background: PAPER,
          color: SUMI,
          padding: '72px',
          fontFamily: 'sans-serif'
        }}
      >
        {/* ensō: o traço que não fecha, cortado no canto */}
        <svg
          width="620"
          height="620"
          viewBox="0 0 200 200"
          style={{ position: 'absolute', top: '150px', right: '-340px' }}
        >
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke={TORII}
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="480 72"
            transform="rotate(140 100 100)"
            opacity="0.32"
          />
        </svg>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: display, fontSize: '38px', letterSpacing: '0.02em' }}>
            Watchlist
          </span>
          <span style={{ fontSize: '22px', letterSpacing: '0.34em', color: TORII }}>{kicker}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '64px' }}>
          <span
            style={{
              fontFamily: display,
              fontSize: '210px',
              lineHeight: 1,
              letterSpacing: '-0.03em'
            }}
          >
            {episodes}
          </span>
          <span style={{ fontSize: '32px', color: FAINT, marginTop: '22px', letterSpacing: '0.04em' }}>
            episódios · {formatDays(data.totalMinutes)} assistindo
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: '48px',
            paddingTop: '44px',
            borderTop: `1px solid ${HAIRLINE}`
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '286px',
              height: '429px',
              background: COVER_BG
            }}
          >
            {hero?.coverImage && (
              <img
                src={readable(hero.coverImage) ?? ''}
                alt=""
                width={286}
                height={429}
                style={{ objectFit: 'cover' }}
              />
            )}
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', flex: 1, marginLeft: '44px' }}
          >
            {hero && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '20px', letterSpacing: '0.2em', color: FAINT }}>
                  ONDE O TEMPO FOI
                </span>
                <span
                  style={{
                    fontFamily: display,
                    fontSize: '46px',
                    lineHeight: 1.2,
                    marginTop: '16px'
                  }}
                >
                  {hero.title}
                </span>
                <span style={{ fontFamily: display, fontSize: '30px', color: TORII, marginTop: '12px' }}>
                  {hero.episodes} episódios
                </span>
              </div>
            )}

            {strip.length > 0 && (
              <div style={{ display: 'flex', marginTop: 'auto' }}>
                {strip.map((item, index) => (
                  <div
                    key={item.externalId}
                    style={{
                      display: 'flex',
                      width: '178px',
                      height: '267px',
                      background: COVER_BG,
                      marginLeft: index === 0 ? '0px' : '20px'
                    }}
                  >
                    {item.coverImage && (
                      <img
                        src={readable(item.coverImage) ?? ''}
                        alt=""
                        width={178}
                        height={267}
                        style={{ objectFit: 'cover' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', marginTop: 'auto', paddingTop: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: display, fontSize: '68px', lineHeight: 1, color: TORII }}>
              {streak}
            </span>
            <span style={{ fontSize: '24px', color: FAINT, marginTop: '14px' }}>dias seguidos</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '88px' }}>
            <span style={{ fontFamily: display, fontSize: '68px', lineHeight: 1 }}>{average}</span>
            <span style={{ fontSize: '24px', color: FAINT, marginTop: '14px' }}>nota média</span>
          </div>

          {data.topGenre && (
            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '88px' }}>
              <span style={{ fontFamily: display, fontSize: '68px', lineHeight: 1 }}>
                {data.topGenre}
              </span>
              <span style={{ fontSize: '24px', color: FAINT, marginTop: '14px' }}>seu gênero</span>
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '48px',
            paddingTop: '28px',
            borderTop: `1px solid ${HAIRLINE}`,
            fontSize: '22px',
            letterSpacing: '0.04em',
            color: FAINT
          }}
        >
          <span>{name}</span>
          <span>
            watchlist.jcrldev.com/wrapped/{data.owner.username}/{data.year}
          </span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts,
      headers: {
        /** Uma hora no navegador, um dia na CDN: o retrospecto muda pouco e
         *  gerar a imagem custa mais que servir. */
        'cache-control': 'public, max-age=3600, s-maxage=86400'
      }
    }
  );
}
