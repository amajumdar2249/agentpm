import { BrowserUtils } from '../src/utils/browser';
import child_process from 'child_process';
import os from 'os';

jest.mock('child_process');
jest.mock('os');

describe('BrowserUtils Platform Opening', () => {
  const mockedExec = child_process.exec as unknown as jest.Mock;
  const mockedPlatform = os.platform as jest.Mock;

  beforeEach(() => {
    mockedExec.mockReset();
    mockedPlatform.mockReset();
  });

  it('should run correct start command on Windows (win32)', async () => {
    mockedPlatform.mockReturnValue('win32');
    mockedExec.mockImplementation((cmd, cb) => cb(null));

    await BrowserUtils.open('https://github.com/test?a=1&b=2');

    expect(mockedExec).toHaveBeenCalledWith(
      'start "" "https://github.com/test?a=1^&b=2"',
      expect.any(Function)
    );
  });

  it('should run correct open command on macOS (darwin)', async () => {
    mockedPlatform.mockReturnValue('darwin');
    mockedExec.mockImplementation((cmd, cb) => cb(null));

    await BrowserUtils.open('https://github.com');

    expect(mockedExec).toHaveBeenCalledWith(
      'open "https://github.com"',
      expect.any(Function)
    );
  });

  it('should run correct xdg-open command on Linux (linux)', async () => {
    mockedPlatform.mockReturnValue('linux');
    mockedExec.mockImplementation((cmd, cb) => cb(null));

    await BrowserUtils.open('https://github.com');

    expect(mockedExec).toHaveBeenCalledWith(
      'xdg-open "https://github.com"',
      expect.any(Function)
    );
  });

  it('should reject with error if platform is unsupported', async () => {
    mockedPlatform.mockReturnValue('freebsd');
    
    await expect(BrowserUtils.open('https://github.com')).rejects.toThrow(
      "Platform 'freebsd' is not supported"
    );
  });
});
