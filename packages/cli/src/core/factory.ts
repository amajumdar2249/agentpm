import fs from 'fs';
import { exec } from 'child_process';

export interface CommandContext {
  io: {
    log: (message?: any, ...optionalParams: any[]) => void;
    error: (message?: any, ...optionalParams: any[]) => void;
    write: (message: string) => void;
  };
  fs: {
    promises: typeof fs.promises;
    existsSync: typeof fs.existsSync;
    readFileSync: typeof fs.readFileSync;
    writeFileSync: typeof fs.writeFileSync;
    statSync: typeof fs.statSync;
  };
  process: {
    cwd: () => string;
    exit: (code?: number) => never;
  };
  exec: typeof exec;
}

export const defaultContext: CommandContext = {
  io: {
    log: console.log,
    error: console.error,
    write: (msg) => process.stdout.write(msg),
  },
  fs: {
    promises: fs.promises,
    existsSync: fs.existsSync,
    readFileSync: fs.readFileSync,
    writeFileSync: fs.writeFileSync,
    statSync: fs.statSync,
  },
  process: {
    cwd: () => process.cwd(),
    exit: (code) => process.exit(code),
  },
  exec: exec
};
