/**
 * 简单的日志封装，支持 verbose 控制详细输出。
 */
import { cyan, gray, red, yellow } from "colorette";
import type { Translator } from "../i18n";

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export function createLogger(verbose: boolean, translator: Translator): Logger {
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
        console.debug(
          gray(`[${translator("logger.debugLabel")}] ${message}`)
        );
      }
    },
  };
}
