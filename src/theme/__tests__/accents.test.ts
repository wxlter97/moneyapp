import {
  ACCENTS,
  buildCustomAccent,
  getAccent,
  hueOf,
  hueToPreviewHex,
  normalizeHex,
  resolveAccent,
} from '@/theme/accents';

describe('normalizeHex', () => {
  it('normaliza a "#RRGGBB" mayúsculas, con o sin "#" inicial', () => {
    expect(normalizeHex('#516b45')).toBe('#516B45');
    expect(normalizeHex('516B45')).toBe('#516B45');
  });

  it('rechaza cualquier cosa que no sean 6 dígitos hex', () => {
    expect(normalizeHex('#fff')).toBeNull();
    expect(normalizeHex('no-es-un-color')).toBeNull();
    expect(normalizeHex('')).toBeNull();
  });
});

describe('buildCustomAccent', () => {
  it('trae shades claro/oscuro válidos con contraste', () => {
    const accent = buildCustomAccent('#FF0000');
    expect(accent.id).toBe('custom');
    expect(accent.light.primary).toMatch(/^#[0-9A-F]{6}$/);
    expect(accent.dark.primary).toMatch(/^#[0-9A-F]{6}$/);
    // El acento oscuro se lee sobre fondo casi-negro: debe ser más claro que
    // el que se lee sobre blanco (misma convención que la paleta fija).
    expect(accent.dark.primary).not.toBe(accent.light.primary);
  });

  it('un hex inválido no revienta -- cae al color de partida', () => {
    expect(() => buildCustomAccent('no-es-hex')).not.toThrow();
  });

  it('foreground blanco sobre un primary oscuro, casi-negro sobre uno claro', () => {
    const dark = buildCustomAccent('#000033'); // azul muy oscuro
    expect(dark.light.primaryFg).toBe('#FFFFFF');
    const light = buildCustomAccent('#FFFF66'); // amarillo muy claro
    expect(light.dark.primaryFg).toBe('#16171A');
  });
});

describe('resolveAccent', () => {
  it('para un id fijo, es igual que getAccent', () => {
    expect(resolveAccent('moss')).toBe(getAccent('moss'));
  });

  it('para "custom", usa el hex dado en vez de caer al primer acento fijo', () => {
    const resolved = resolveAccent('custom', '#3355FF');
    expect(resolved.id).toBe('custom');
    expect(resolved).not.toBe(ACCENTS[0]);
  });

  it('"custom" sin hex cae al hex por defecto, no explota', () => {
    expect(() => resolveAccent('custom')).not.toThrow();
  });
});

describe('hueOf / hueToPreviewHex', () => {
  it('hueOf de un hex inválido es 0, no NaN', () => {
    expect(hueOf('no-es-hex')).toBe(0);
  });

  it('hueToPreviewHex siempre da un hex válido para cualquier matiz', () => {
    for (const hue of [0, 90, 180, 270, 360, 720, -30]) {
      expect(hueToPreviewHex(hue)).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
