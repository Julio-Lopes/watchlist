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

export default async function ConfigPage() {
  const [settings, avatars, sessions] = await Promise.all([
    serverFetch('/me/settings', settingsSchema),
    serverFetch('/avatars', z.array(presetAvatarSchema)),
    serverFetch('/me/sessions', z.array(sessionInfoSchema))
  ]);

  if (!settings) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-8 text-center">
        <p className="text-body">Não foi possível carregar suas configurações</p>
        <p className="mt-1 text-small text-fg-muted">Recarregue a página e tente de novo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-h2">Configurações</h1>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_140px]">
        <div className="space-y-3">
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