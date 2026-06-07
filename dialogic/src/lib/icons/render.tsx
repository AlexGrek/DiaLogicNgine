import type { IconDef } from './index';

export function renderIconPaths(def: IconDef) {
    return def.paths.map((p, i) => (
        <path
            key={i}
            d={p.d}
            fill={p.fill ? 'currentColor' : 'none'}
            stroke={p.fill ? 'none' : 'currentColor'}
        />
    ));
}
