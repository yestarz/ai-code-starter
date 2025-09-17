/**
 * 简单的日志封装，支持 verbose 控制详细输出。
 */
import { bold, cyan, gray, red, yellow } from "colorette";

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export function createLogger(verbose: boolean): Logger {
  return {
    info(message: string) {
      console.log(cyan(message));
    },
    warn(message: string) {
      console.warn(yellow(message));
    },
    error(message: string) {
      console.error(red(message));
    },
    debug(message: string) {
      if (verbose) {
        console.debug(gray(`[调试] ${message}`));
      }
    },
  };
}
