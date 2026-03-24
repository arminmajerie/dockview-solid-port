import { describe, expect, it } from 'vitest';
import {
  hasDockviewTransferType,
  isDockviewTransfer,
  isDockviewTransferText,
} from './dockviewDropGuard';

describe('dockviewDropGuard', () => {
  it('recognizes Dockview transfer mime types during dragover', () => {
    expect(
      hasDockviewTransferType(['application/x-dockview-panel'])
    ).toBe(true);
    expect(
      hasDockviewTransferType(['application/x-dockview-pane'])
    ).toBe(true);
    expect(
      hasDockviewTransferType(['text/plain'])
    ).toBe(false);
  });

  it('recognizes Dockview panel payloads in text/plain drops', () => {
    expect(
      isDockviewTransferText(
        '{"viewId":"1","groupId":"3","panelId":"outputPanel"}'
      )
    ).toBe(true);
    expect(
      isDockviewTransferText(
        '{"viewId":"1","paneId":"pane-1"}'
      )
    ).toBe(true);
    expect(
      isDockviewTransferText('hello world')
    ).toBe(false);
  });

  it('treats dockview text payloads as guarded drops when mime types are missing', () => {
    expect(
      isDockviewTransfer({
        types: ['text/plain'],
        getData: (format) =>
          format === 'text/plain'
            ? '{"viewId":"1","groupId":"4","panelId":"scriptExplorerPanel"}'
            : '',
      })
    ).toBe(true);
    expect(
      isDockviewTransfer({
        types: ['text/plain'],
        getData: () => 'plain text',
      })
    ).toBe(false);
  });
});
