import { wrappedSchema } from '@watchlist/shared';
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

/** Edge porque o ImageResponse roda em WebAssembly: no runtime Node ele
 *  precisaria de binarios nativos que a Vercel nao entrega no plano gratuito. */
export const runtime = 'edge';

const formatDays = (minutes: number): string => {
  const hours = Math.round(minutes / 60);
  const days = Math.floor(hours / 24);
  return days > 0 ? `${days} dias` : `${hours} horas`;
};

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

  /** A obra em destaque sai das capas de baixo: repetir a mesma imagem duas
   *  vezes na mesma peca seria desperdicio de espaco. */
  const strip = data.highlights
    .filter((item) => item.externalId !== hero?.externalId)
    .slice(0, 4);

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1350px',
          display: 'flex',
          flexDirection: 'column',
          background: '#0f0f0f',
          color: '#fafafa',
          fontFamily: 'sans-serif'
        }}
      >
        <div style={{ display: 'flex', height: '634px' }}>
          <div
            style={{
              display: 'flex',
              width: '476px',
              background: 'linear-gradient(0deg, #241a3d, #3b2a5e)'
            }}
          >
            {hero?.coverImage && (
              <img
                src={hero.coverImage}
                alt=""
                width={476}
                height={634}
                style={{ objectFit: 'cover' }}
              />
            )}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              padding: '56px 56px 0'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '38px', color: '#a78bfa' }}>Watchlist</span>
              <span style={{ fontSize: '30px', color: '#71717a' }}>
                {data.year}
                {data.partial ? ' até agora' : ''}
              </span>
            </div>

            {hero && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginTop: 'auto',
                  paddingBottom: '48px'
                }}
              >
                <span
                  style={{ fontSize: '24px', color: '#71717a', textTransform: 'uppercase' }}
                >
                  Onde o tempo foi
                </span>
                <span style={{ fontSize: '46px', lineHeight: 1.15, marginTop: '12px' }}>
                  {hero.title}
                </span>
                <span style={{ fontSize: '30px', color: '#7c3aed', marginTop: '10px' }}>
                  {hero.episodes} episódios
                </span>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '56px',
            background: 'linear-gradient(180deg, #141414, #0f0f0f)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '118px', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {data.totalEpisodes.toLocaleString('pt-BR')}
            </span>
            <span style={{ fontSize: '34px', color: '#a1a1aa', marginTop: '12px' }}>
              episódios · {formatDays(data.totalMinutes)} assistindo
            </span>
          </div>

          {/** Cada capa e uma busca externa na geracao da imagem: quatro e o
           *   limite antes de o tempo de resposta pesar. */}
          {strip.length > 0 && (
            <div style={{ display: 'flex', gap: '20px', marginTop: '44px' }}>
              {strip.map((item) => (
                <div
                  key={item.externalId}
                  style={{
                    display: 'flex',
                    width: '226px',
                    height: '339px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#1a1a1a'
                  }}
                >
                  {item.coverImage && (
                    <img
                      src={item.coverImage}
                      alt=""
                      width={226}
                      height={339}
                      style={{ objectFit: 'cover' }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '72px', marginTop: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '54px', color: '#7c3aed' }}>{data.longestStreak}</span>
              <span style={{ fontSize: '26px', color: '#71717a' }}>dias seguidos</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '54px' }}>
                {data.averageRating !== null
                  ? (data.averageRating / 10).toFixed(1).replace('.', ',')
                  : '—'}
              </span>
              <span style={{ fontSize: '26px', color: '#71717a' }}>nota média</span>
            </div>

            {data.topGenre && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '54px' }}>{data.topGenre}</span>
                <span style={{ fontSize: '26px', color: '#71717a' }}>seu gênero</span>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '44px',
              paddingTop: '28px',
              borderTop: '1px solid #2a2a2a',
              fontSize: '24px',
              color: '#52525b'
            }}
          >
            <span>{name}</span>
            <span>
              watchlist.jcrldev.com/wrapped/{data.owner.username}/{data.year}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      headers: {
        /** Uma hora no navegador, um dia na CDN: o retrospecto muda pouco e
         *  gerar a imagem custa mais que servir. */
        'cache-control': 'public, max-age=3600, s-maxage=86400'
      }
    }
  );
}