declare class ExploreApp extends App {
    name: string;
    package: string;
    icon: string;
    hidden: boolean;
    css: string;
    constructor();
    whatsnew: JSX.Element;
    v86: JSX.Element;
    welcome: JSX.Element;
    state: Stateful<{
        screen?: HTMLElement;
    }>;
    page: () => Promise<JSX.Element>;
    open(args?: string[]): Promise<WMWindow | undefined>;
}
