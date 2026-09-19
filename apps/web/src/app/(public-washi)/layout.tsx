import { SiteFooter } from '@/components/site-footer';

/**
 * Páginas públicas já migradas ao tema washi/sumi. Fica separado de (public)
 * porque o fundo escuro daquele grupo ainda vale para as páginas não migradas.
 */
export default function PublicWashiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-washi font-jp text-sumi">
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
