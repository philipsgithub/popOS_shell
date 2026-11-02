import * as log from './log.js';

import Gio from 'gi://Gio';
import { spawn } from 'resource:///org/gnome/shell/misc/util.js';

export var MOTIF_HINTS: string = '_MOTIF_WM_HINTS';
export var HIDE_FLAGS: string[] = ['0x2', '0x0', '0x0', '0x0', '0x0'];
export var SHOW_FLAGS: string[] = ['0x2', '0x0', '0x1', '0x0', '0x0'];

const FRAME_EXTENTS: string = '_GTK_FRAME_EXTENTS';

/** What an X11 window's properties say about whether we may toggle its decorations. */
export interface DecorationInfo {
    /** The client draws its own frame (GTK CSD sets `_GTK_FRAME_EXTENTS`). */
    client_decorated: boolean;

    /** No Motif hints, or hints that only say "all" / "none", i.e. values we set ourselves. */
    may_decorate: boolean;
}

export function get_xid(meta: Meta.Window): string | null {
    const desc = meta.get_description();
    const match = desc && desc.match(/0x[0-9a-f]+/);
    return match && match[0];
}

export function set_hint(xid: string, hint: string, value: string[]) {
    spawn(['xprop', '-id', xid, '-f', hint, '32c', '-set', hint, value.join(', ')]);
}

/**
 * Reads the decoration-related properties of an X11 window without blocking
 * the compositor. `callback` is not called if `xprop` fails (for example when
 * the window is already gone).
 */
export function read_decoration_info(xid: string, callback: (info: DecorationInfo) => void) {
    let proc: any;
    try {
        proc = Gio.Subprocess.new(
            ['xprop', '-id', xid, FRAME_EXTENTS, MOTIF_HINTS],
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE,
        );
    } catch (why) {
        log.warn(`failed to spawn xprop: ${why}`);
        return;
    }

    proc.communicate_utf8_async(null, null, (p: any, res: any) => {
        let stdout: string;
        try {
            [, stdout] = p.communicate_utf8_finish(res);
        } catch (why) {
            log.warn(`failed to read xprop output: ${why}`);
            return;
        }

        if (!p.get_successful() || !stdout) return;

        callback(parse_decoration_info(stdout));
    });
}

function parse_decoration_info(output: string): DecorationInfo {
    let client_decorated = false;
    let motif: string[] | null = null;

    for (const line of output.split('\n')) {
        // A missing property prints `NAME:  not found.`; a present one `NAME(TYPE) = values`.
        const pos = line.indexOf('=');
        if (pos === -1) continue;

        if (line.startsWith(FRAME_EXTENTS)) {
            client_decorated = true;
        } else if (line.startsWith(MOTIF_HINTS)) {
            motif = line
                .slice(pos + 1)
                .trim()
                .split(', ')
                .map((v) => (v.startsWith('0x') ? v : '0x' + v));
        }
    }

    const may_decorate = motif ? motif[2] === '0x0' || motif[2] === '0x1' : true;

    return { client_decorated, may_decorate };
}
