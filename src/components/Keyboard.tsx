/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Delete } from 'lucide-react';

const ROWS = [
  'QWERTYUIOP'.split(''),
  'ASDFGHJKL'.split(''),
  'ZXCVBNM'.split(''),
];

interface KeyboardProps {
  onKey: (key: string) => void;
  onDelete: () => void;
}

export default function Keyboard({ onKey, onDelete }: KeyboardProps) {
  return (
    <div className="w-full bg-kb-bg p-2 md:p-3 pt-3 md:pt-4 flex flex-col gap-1.5 md:gap-2 h-[200px] md:h-[220px] box-border border-t border-muted/30 shrink-0">
      {ROWS.map((row, i) => (
        <div key={i} className="flex justify-center gap-1 md:gap-1.5 h-full">
          {row.map((key) => (
            <motion.button
              key={key}
              whileTap={{ y: 2 }}
              onClick={() => onKey(key)}
              className="flex-1 max-w-[42px] md:max-w-[48px] h-full flex flex-col items-center justify-center bg-surface rounded-md shadow-[0_2px_0_#94a3b8] text-base md:text-lg font-bold text-primary active:shadow-none transition-all"
            >
              <span className="leading-none">{key}</span>
            </motion.button>
          ))}
          {i === 2 && (
            <motion.button
              whileTap={{ y: 2 }}
              onClick={onDelete}
              className="px-4 md:px-6 h-full flex items-center justify-center bg-muted text-surface rounded-md shadow-[0_2px_0_#64748b] font-bold text-[10px] md:text-xs uppercase active:shadow-none transition-all"
            >
              Del
            </motion.button>
          )}
        </div>
      ))}
    </div>
  );
}
