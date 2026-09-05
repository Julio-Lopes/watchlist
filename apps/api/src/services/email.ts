import { Resend } from 'resend';
import { env } from '../env.js';

const client = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

interface Mail {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sem RESEND_API_KEY o e-mail vai para o log. Em dev isso vale mais que
 * uma caixa de entrada: o link fica no terminal, ao lado do erro.
 */
async function send(mail: Mail, log: { info: (o: unknown, m: string) => void }): Promise<void> {
  if (!client) {
    log.info({ to: mail.to, subject: mail.subject, html: mail.html }, 'email (modo log)');
    return;
  }

  await client.emails.send({ from: env.EMAIL_FROM, ...mail });
}

const layout = (title: string, body: string, cta: string, url: string) => `
  <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px">${title}</h1>
    <p style="font-size:15px;line-height:1.6;color:#444">${body}</p>
    <p><a href="${url}" style="display:inline-block;background:#7c3aed;color:#fff;
       padding:10px 20px;border-radius:6px;text-decoration:none">${cta}</a></p>
    <p style="font-size:12px;color:#888">Se voce nao pediu isso, ignore esta mensagem.</p>
  </div>`;

export const sendVerificationEmail = (
  to: string,
  token: string,
  log: Parameters<typeof send>[1]
) =>
  send(
    {
      to,
      subject: 'Confirme seu e-mail no Watchlist',
      html: layout(
        'Confirme seu e-mail',
        'O link vale por 24 horas.',
        'Confirmar e-mail',
        `${env.WEB_ORIGIN}/auth/verificar?token=${token}`
      )
    },
    log
  );

export const sendPasswordResetEmail = (
  to: string,
  token: string,
  log: Parameters<typeof send>[1]
) =>
  send(
    {
      to,
      subject: 'Redefinir sua senha no Watchlist',
      html: layout(
        'Redefinir senha',
        'O link vale por 1 hora. Ao redefinir, todas as suas sessoes sao encerradas.',
        'Redefinir senha',
        `${env.WEB_ORIGIN}/auth/redefinir?token=${token}`
      )
    },
    log
  );