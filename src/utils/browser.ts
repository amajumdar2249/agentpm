import { exec } from 'child_process';
import os from 'os';

export class BrowserUtils {
  /**
   * Opens the specified URL in the user's default web browser.
   * Supports Windows, macOS, and Linux.
   * @param url The target URL to open
   */
  public static open(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const platform = os.platform();
      let command: string;

      switch (platform) {
        case 'win32':
          // Escaping ampersands is critical in Windows cmd shell
          command = `start "" "${url.replace(/&/g, '^&')}"`;
          break;
        case 'darwin':
          command = `open "${url}"`;
          break;
        case 'linux':
          command = `xdg-open "${url}"`;
          break;
        default:
          return reject(new Error(`Platform '${platform}' is not supported for automatic browser launch.`));
      }

      exec(command, (error) => {
        if (error) {
          reject(new Error(`Failed to open browser: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }
}
