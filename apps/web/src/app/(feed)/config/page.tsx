import { SettingsAccount } from '@/components/settings-account';
import { SettingsNav } from '@/components/settings-nav';
import { SettingsPreferences } from '@/components/settings-preferences';
import { SettingsProfile } from '@/components/settings-profile';
import { SettingsSessions } from '@/components/settings-sessions';
import { serverFetch } from '@/lib/api-server';
import { presetAvatarSchema, sessionInfoSchema, settingsSchema } from '@watchlist/shared';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Configurações · Watchlist' };

const heading =
  'font-mincho text-[clamp(24px,3vw,34px)] font-normal tracking-[-0.015em] text-sumi';

export default async function ConfigPage() {
  const [settings, avatars, sessions] = await Promise.all([
    serverFetch('/me/settings', settingsSchema),
    serverFetch('/avatars', z.array(presetAvatarSchema)),
    serverFetch('/me/sessions', z.array(sessionInfoSchema))
  ]);

  if (!settings) {
    return (
      <div className="mx-auto max-w-[1080px]">
        <h1 className={heading}>Configurações</h1>
        <div className="mt-[clamp(26px,4vh,40px)]">
          <p className="font-mincho text-[clamp(20px,2.4vw,26px)] text-sumi">
            Não foi possível carregar suas configurações
          </p>
          <p className="mt-3 text-[15px] leading-[1.85] font-light text-sumi-soft">
            Recarregue a página e tente de novo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1080px]">
      <h1 className="border-b border-hairline pb-4 font-mincho text-[clamp(24px,3vw,34px)] font-normal tracking-[-0.015em] text-sumi">
        Configurações
      </h1>

      <div className="mt-[clamp(28px,4vh,40px)] grid gap-[clamp(32px,5vw,64px)] lg:grid-cols-[minmax(0,1fr)_150px]">
        <div className="min-w-0">
          <SettingsProfile settings={settings} avatars={avatars ?? []} />
          <SettingsPreferences settings={settings} />
          <SettingsSessions sessions={sessions ?? []} />
          <SettingsAccount settings={settings} />
        </div>

        <SettingsNav />
      </div>
    </div>
  );
}
