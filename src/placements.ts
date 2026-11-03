/**
 * Where each window was under each monitor setup seen since GNOME Shell
 * started, so that a window returns to its place whenever that setup comes
 * back (docking, undocking, a monitor flapping).
 *
 * Kept in memory at module level only: it outlives a disable/enable of the
 * extension, and is gone with the shell (logout, shutdown).
 */

/** A window's place under one monitor setup. */
export interface Placement {
    /** Connector of the window's monitor, e.g. `HDMI-1` */
    connector: string;

    /** Whether that was the primary monitor */
    primary: boolean;

    /**
     * Workspace index; `null` when the window was on all workspaces (a
     * secondary monitor with workspaces-only-on-primary, or pinned).
     */
    workspace: number | null;

    /** Frame rectangle, relative to the origin of the monitor */
    rect: [number, number, number, number];
}

interface WindowRecord {
    /** Placement per setup key */
    setups: Map<string, Placement>;

    /** The most recently recorded placement, under any setup */
    last: Placement;

    /** The last workspace the window was on (it has none while on all workspaces) */
    last_workspace: number | null;
}

/** Records per window, by `Meta.Window.get_stable_sequence()` */
const records: Map<number, WindowRecord> = new Map();

/**
 * Identifies the set of active monitors. The connector alone does not do
 * that: docks at different desks can put different monitors on `DP-3`.
 */
export function setup_key(): string {
    const ids: Array<string> = [];

    for (const logical of global.backend.get_monitor_manager().get_logical_monitors()) {
        for (const monitor of logical.get_monitors()) {
            const parts = [monitor.get_connector(), monitor.get_vendor(), monitor.get_product(), monitor.get_serial()];
            ids.push(parts.map((part) => (part ?? '').trim()).join(' '));
        }
    }

    return ids.sort().join(' | ');
}

export function get(window: number, setup: string): Placement | null {
    return records.get(window)?.setups.get(setup) ?? null;
}

export function last(window: number): Placement | null {
    return records.get(window)?.last ?? null;
}

export function last_workspace(window: number): number | null {
    return records.get(window)?.last_workspace ?? null;
}

export function record(window: number, setup: string, placement: Placement) {
    const existing = records.get(window);

    if (existing) {
        existing.setups.set(setup, placement);
        existing.last = placement;
        if (placement.workspace !== null) existing.last_workspace = placement.workspace;
    } else {
        records.set(window, {
            setups: new Map([[setup, placement]]),
            last: placement,
            last_workspace: placement.workspace,
        });
    }
}

export function forget(window: number) {
    records.delete(window);
}

/** Drops the records of windows that no longer exist. */
export function retain(windows: Set<number>) {
    for (const window of Array.from(records.keys())) {
        if (!windows.has(window)) records.delete(window);
    }
}
