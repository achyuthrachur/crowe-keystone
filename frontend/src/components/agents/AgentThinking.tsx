'use client';

import { motion } from 'framer-motion';
import { agentDotVariants } from '@/lib/motion';

export function AgentThinking() {
  return (
    <div
      data-testid="agent-thinking"
      style={{ display: 'flex', alignItems: 'center', gap: 3 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          variants={agentDotVariants}
          animate="animate"
          transition={{ delay: i * 0.15 }}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'var(--amber-core)',
          }}
        />
      ))}
    </div>
  );
}
