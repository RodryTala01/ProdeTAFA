import { readFileSync, readdirSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PasswordField } from '../src/ui';
import { LoginScreen } from '../src/AppV2';

const tokens = readFileSync('src/design-tokens.css', 'utf8');
function color(name: string) {
  const value = tokens.match(new RegExp(`--${name}:\\s*(#[a-f0-9]{6})`, 'i'))?.[1];
  if (!value) throw Error(`Missing token: ${name}`);
  return value;
}
function luminance(hex: string) {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(color(a)), luminance(color(b))].sort((x,y) => y-x);
  return (values[0]+.05)/(values[1]+.05);
}

describe('identity system accessibility contracts', () => {
  it.each(['text','text-muted','text-subtle','accent','success','warning','danger','info'])('%s is legible on raised surfaces', token => {
    expect(contrast(token,'surface-raised')).toBeGreaterThanOrEqual(4.5);
  });
  it('primary button text meets AA contrast', () => {
    expect(contrast('accent','accent-ink')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('accent-hover','accent-ink')).toBeGreaterThanOrEqual(4.5);
  });
  it('password starts concealed and its labelled toggle cannot submit the form', () => {
    const html=renderToStaticMarkup(createElement(PasswordField, { autoComplete:'current-password', required:true }));
    expect(html).toContain('type="password"');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="Mostrar contraseña"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toMatch(/<label for="[^"]+">Contraseña<\/label>/);
  });
  it('login preserves autofill and has a single submit action', () => {
    const html=renderToStaticMarkup(createElement(LoginScreen,{onLogin:()=>{}}));
    expect(html).toContain('autoComplete="username"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain('type="tel"');
    expect(html.match(/>Ingresar<\/button>/g)).toHaveLength(1);
    expect(html).not.toMatch(/Temporada 32|olvidé|Entrar al Prode/);
  });
  it('screen styles use centralized colors and no decorative effects', () => {
    const files=readdirSync('src').filter(name=>name.endsWith('.css') && name!=='design-tokens.css');
    for(const file of files){
      const css=readFileSync(`src/${file}`,'utf8');
      expect(css, file).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|gradient\(|backdrop-filter\s*:\s*blur/i);
    }
  });
});
