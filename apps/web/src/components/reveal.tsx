'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Reveal — o único gesto de animação do tema "Japanese Modern".
 *
 * Movimento lento e curto: 700ms, easing de saída suave, 20px de
 * deslocamento. Entra uma vez só (`once: true`) — a página não "performa" a
 * cada scroll.
 */
export function Reveal({
  children,
  delay = 0,
  y = 20,
  className
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
