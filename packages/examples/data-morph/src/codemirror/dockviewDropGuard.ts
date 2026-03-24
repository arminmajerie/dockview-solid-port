const DOCKVIEW_PANEL_MIME_TYPE = 'application/x-dockview-panel';
const DOCKVIEW_PANE_MIME_TYPE = 'application/x-dockview-pane';

type TransferLike = {
  readonly types?: readonly string[];
  getData?(format: string): string;
};

function safeGetData(
  transfer: TransferLike | null | undefined,
  format: string
): string {
  if (!transfer?.getData) {
    return '';
  }

  try {
    return transfer.getData(format);
  } catch {
    return '';
  }
}

export function hasDockviewTransferType(
  types: readonly string[] | null | undefined
): boolean {
  if (!types) {
    return false;
  }

  return (
    types.includes(DOCKVIEW_PANEL_MIME_TYPE) ||
    types.includes(DOCKVIEW_PANE_MIME_TYPE)
  );
}

export function isDockviewTransferText(text: string | null | undefined): boolean {
  if (!text) {
    return false;
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;

    if (!parsed || typeof parsed !== 'object') {
      return false;
    }

    const hasViewId = typeof parsed.viewId === 'string';
    const hasGroupTransfer =
      typeof parsed.groupId === 'string' &&
      (typeof parsed.panelId === 'string' || parsed.panelId === null);
    const hasPaneTransfer =
      typeof parsed.paneId === 'string';

    return hasViewId && (hasGroupTransfer || hasPaneTransfer);
  } catch {
    return false;
  }
}

export function isDockviewTransfer(
  transfer: TransferLike | null | undefined
): boolean {
  if (!transfer) {
    return false;
  }

  if (hasDockviewTransferType(transfer.types)) {
    return true;
  }

  return isDockviewTransferText(safeGetData(transfer, 'text/plain'));
}

export function attachDockviewDropGuard(element: HTMLElement): () => void {
  const handleDragOver = (event: DragEvent) => {
    if (hasDockviewTransferType(event.dataTransfer?.types)) {
      event.preventDefault();
    }
  };

  const handleDrop = (event: DragEvent) => {
    if (isDockviewTransfer(event.dataTransfer)) {
      event.preventDefault();
    }
  };

  element.addEventListener('dragover', handleDragOver, true);
  element.addEventListener('drop', handleDrop, true);

  return () => {
    element.removeEventListener('dragover', handleDragOver, true);
    element.removeEventListener('drop', handleDrop, true);
  };
}
