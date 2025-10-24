import { SolidPart, SolidPortalStore } from '../solid';
import { JSX } from 'solid-js';
import {
  DockviewEmitter,
  DockviewEvent, GroupPanelPartInitParameters,
  IContentRenderer,
  IDockviewPanelProps,
  PanelUpdateEvent,
} from '@arminmajerie/dockview-core';

export class SolidPanelContentPart implements IContentRenderer {
  private readonly _element: HTMLElement;
  private part?: SolidPart<IDockviewPanelProps>;

  private readonly _onDidFocus = new DockviewEmitter<void>();
  readonly onDidFocus: DockviewEvent<void> = this._onDidFocus.event;

  private readonly _onDidBlur = new DockviewEmitter<void>();
  readonly onDidBlur: DockviewEvent<void> = this._onDidBlur.event;

  get element(): HTMLElement {
    return this._element;
  }

  constructor(
    public readonly id: string,
    private readonly component: (props: IDockviewPanelProps) => JSX.Element,
    private readonly solidPortalStore: SolidPortalStore
  ) {
    this._element = document.createElement('div');
    this._element.className = 'dv-solid-part';
    this._element.style.height = '100%';
    this._element.style.width = '100%';
  }

  focus(): void {
    // TODO: implement focus logic if needed
  }

  public init(parameters: GroupPanelPartInitParameters): void {
    this.part = new SolidPart(
      this.element,
      this.solidPortalStore,
      this.component,
      {
        params: parameters.params,
        api: parameters.api,
        containerApi: parameters.containerApi,
      }
    );
  }

  public update(event: PanelUpdateEvent) {
    this.part?.update({ params: event.params });
  }

  public layout(_width: number, _height: number): void {
    // noop
  }

  public dispose(): void {
    this._onDidFocus.dispose();
    this._onDidBlur.dispose();
    this.part?.dispose();
  }
}
