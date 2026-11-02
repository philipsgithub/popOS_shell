declare const log: (arg: string) => void, imports: any, _: (arg: string) => string;

/** Provided by GJS; not part of the ES lib this project compiles against. */
declare class TextDecoder {
    constructor(label?: string);
    decode(input?: Uint8Array | ArrayBuffer): string;
}

declare module 'gi://*' {
    let data: any;
    export default data;
}

declare module 'gi://Gtk?version=3.0' {
    let Gtk: any;
    export default Gtk;
}
