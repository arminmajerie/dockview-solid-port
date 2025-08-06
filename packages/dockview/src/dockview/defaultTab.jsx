var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { createSignal, onCleanup, onMount } from 'solid-js';
import { CloseButton } from '../svg';
function useTitle(api) {
    const [title, setTitle] = createSignal(api.title);
    let dispose;
    onMount(() => {
        dispose = api.onDidTitleChange((event) => {
            setTitle(event.title);
        });
    });
    onCleanup(() => {
        dispose === null || dispose === void 0 ? void 0 : dispose.dispose();
    });
    return title;
}
export function DockviewDefaultTab(props) {
    const title = useTitle(props.api);
    // Solid doesn't have refs like React; just use a variable
    let isMiddleMouseButton = false;
    // onClose action
    function onClose(event) {
        event.preventDefault();
        if (props.closeActionOverride) {
            props.closeActionOverride();
        }
        else {
            props.api.close();
        }
    }
    function onBtnPointerDown(event) {
        event.preventDefault();
    }
    function _onPointerDown(event) {
        isMiddleMouseButton = event.button === 1;
        if (typeof props.onPointerDown === "function") {
            props.onPointerDown(event);
        }
    }
    function _onPointerUp(event) {
        if (isMiddleMouseButton && event.button === 1 && !props.hideClose) {
            isMiddleMouseButton = false;
            onClose(event);
        }
        if (typeof props.onPointerUp === "function") {
            props.onPointerUp(event);
        }
    }
    function _onPointerLeave(event) {
        isMiddleMouseButton = false;
        if (typeof props.onPointerLeave === "function") {
            props.onPointerLeave(event);
        }
    }
    // Destructure props for rest spreading (Solid uses props.children too)
    const { api: _api, containerApi: _containerApi, params: _params, hideClose, closeActionOverride, onPointerDown, onPointerUp, onPointerLeave, tabLocation } = props, rest = __rest(props, ["api", "containerApi", "params", "hideClose", "closeActionOverride", "onPointerDown", "onPointerUp", "onPointerLeave", "tabLocation"]);
    return (<div data-testid="dockview-dv-default-tab" {...rest} onPointerDown={_onPointerDown} onPointerUp={_onPointerUp} onPointerLeave={_onPointerLeave} class="dv-default-tab">
      <span class="dv-default-tab-content">{title()}</span>
      {!hideClose && tabLocation !== 'headerOverflow' && (<div class="dv-default-tab-action" onPointerDown={onBtnPointerDown} onClick={onClose}>
          <CloseButton />
        </div>)}
    </div>);
}
