import { Parameters } from '@arminmajerie/dockview-core';

export interface PanelParameters<T extends {} = Parameters> {
    params: T;
}
