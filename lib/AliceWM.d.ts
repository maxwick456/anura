/**
 * the purpose of the following code is to give a demo of
 * how to realize the floating dialog using javascript.
 *It was written without any consideration of cross-browser compatibility,
 * and it can be run successfully under the firefox 3.5.7.
 *
 * nope nope this code has NOT been stolen rafflesia did NOT make it :thumbsup:
 */
type SnappedWindow = {
    window: WMWindow;
    direction: "left" | "right" | "ne" | "nw" | "se" | "sw";
};
declare const minimizedSnappedWindows: SnappedWindow[];
declare const snappedWindows: SnappedWindow[];
declare let splitBar: WMSplitBar | null;
declare class WindowInformation {
    title: string;
    height: string;
    width: string;
    minwidth: number;
    minheight: number;
    resizable: boolean;
}
declare class WMWindow extends EventTarget implements Process {
    app?: App | undefined;
    element: HTMLElement;
    content: HTMLElement;
    maximized: boolean;
    oldstyle: string | null;
    dragging: boolean;
    dragForceX: number;
    dragForceY: number;
    originalLeft: number;
    originalTop: number;
    resizable: boolean;
    width: number;
    height: number;
    mouseLeft: number;
    mouseTop: number;
    wininfo: WindowInformation;
    state: {
        title: string;
    };
    onfocus: () => void;
    onresize: (w: number, h: number) => void;
    onclose: () => void;
    onmaximize: () => void;
    onsnap: (snapDirection: "left" | "right" | "top" | "ne" | "nw" | "se" | "sw") => void;
    onunmaximize: () => void;
    snapped: boolean;
    clampWindows: boolean;
    justresized: boolean;
    minimizing: boolean;
    mouseover: boolean;
    get title(): string;
    set title(title: string);
    maximizeImg: HTMLImageElement;
    constructor(wininfo: WindowInformation, app?: App | undefined);
    handleDrag(evt: PointerEvent): void;
    focus(): void;
    close(): void;
    togglemaximize(): void;
    maximize(): void;
    unmaximize(): Promise<void>;
    remaximize(): Promise<void>;
    minimize(): void;
    unminimize(): void;
    snap(snapDirection: "left" | "right" | "top" | "ne" | "nw" | "se" | "sw"): void;
    getSnapDirection(forceX: number, forceY: number): "left" | "right" | "top" | "ne" | "nw" | "se" | "sw" | null;
    getSnapDirectionFromPosition(left: number, width: number): "left" | "right" | "top" | "ne" | "nw" | "se" | "sw" | null;
    snapPreview(side: "left" | "right" | "top" | "ne" | "nw" | "se" | "sw"): DLElement<any>;
    pid: number;
    stdout: ReadableStream<Uint8Array>;
    stdin: WritableStream<Uint8Array>;
    stderr: ReadableStream<Uint8Array>;
    kill: () => void;
    get alive(): boolean;
}
declare class WMSplitBar {
    dragging: boolean;
    mouseLeft: number;
    originalLeft: number;
    leftWindow: WMWindow;
    rightWindow: WMWindow;
    element: JSX.Element;
    cleanup(): void;
    constructor(leftWindow: WMWindow, rightWindow: WMWindow);
    handleDrag(evt: PointerEvent): void;
    splitWindowsAround(x: number): void;
    fadeIn(): void;
    fadeOut(): void;
    remove(): void;
    instantRemove(): void;
}
declare let AliceWM: {
    create: (givenWinInfo: string | WindowInformation, app?: App) => WMWindow;
};
declare function deactivateFrames(): void;
declare function reactivateFrames(): void;
declare function getHighestZindex(): number;
declare function normalizeZindex(): Promise<void>;
/**
 * place the given dom element in the center of the browser window
 * @param {Object} element
 */
declare function center(element: HTMLElement): void;
