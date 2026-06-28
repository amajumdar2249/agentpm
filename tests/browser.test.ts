import { BrowserUtils } from '../src/utils/browser';
import child_process from 'child_process';
import os from 'os';

jest.mock('child_process');
jest.mock('os');

describe('BrowserUtils Platform Opening', () => {
  const mockedExecFile = child_process.execFile as unknown as jest.Mock;
  const mockedPlatform = os.platform as jest.Mock;

  beforeEach(() => {
    mockedExecFile.mockReset();
    mockedPlatform.mockReset();
  });

  it('should run correct start command on Windows (win32)', async () => {
    mockedPlatform.mockReturnValue('win32');
    mockedExecFile.mockImplementation((file, args, cb) => cb(null));

    await BrowserUtils.open('https://github.com/test?a=1&b=2');

    expect(mockedExecFile).toHaveBeenCalledWith(
      'cmd',
      ['/c', 'start', '', 'https://github.com/test?a=1&b=2'],
      expect.any(Function)
    );
  });

  it('should run correct open command on macOS (darwin)', async () => {
    mockedPlatform.mockReturnValue('darwin');
    mockedExecFile.mockImplementation((file, args, cb) => cb(null));

    await BrowserUtils.open('https://github.com');

    expect(mockedExecFile).toHaveBeenCalledWith(
      'open',
      ['https://github.com'],
      expect.any(Function)
    );
  });

  it('should run correct xdg-open command on Linux (linux)', async () => {
    mockedPlatform.mockReturnValue('linux');
    mockedExecFile.mockImplementation((file, args, cb) => cb(null));

    await BrowserUtils.open('https://github.com');

    expect(mockedExecFile).toHaveBeenCalledWith(
      'xdg-open',
      ['https://github.com'],
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
