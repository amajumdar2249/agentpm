import { execFile } from 'child_process'; // execFile = no shell = no injection
import os from 'os';

export class BrowserUtils {
  /**
   * Safely opens a URL in the default browser.
   * Uses execFile (not exec) to prevent shell injection attacks.
   */
  public static open(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Validate URL scheme - only http/https allowed
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return reject(new Error(`URL scheme '${parsed.protocol}' is not allowed`));
        }
      } catch {
        return reject(new Error(`Invalid URL: ${url}`));
      }

      const platform = os.platform();
      let command: string;
      let args: string[];

      // execFile takes command + args SEPARATELY - no shell interpolation possible
      switch (platform) {
        case 'win32':
          command = 'cmd';
          args = ['/c', 'start', '', url]; // Separate args = no injection
          break;
        case 'darwin':
          command = 'open';
          args = [url]; // URL passed as argument, not interpolated in string
          break;
        case 'linux':
          command = 'xdg-open';
          args = [url];
          break;
        default:
          return reject(new Error(`Platform '${platform}' is not supported.`));
      }

      execFile(command, args, (error) => {
        if (error) {
          reject(new Error(`Failed to open browser: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }
}
