const generic='No pudimos completar la operación. Reintentá en unos instantes.';
// Backend messages are rendered as text, never HTML. Suppress implementation diagnostics.
export function safeAdminError(value:unknown):string {
  if(typeof value!=='string'||!value.trim()||value.length>2000||/SQLITE|D1_ERROR|\b(?:SELECT\s.+\sFROM|INSERT\s+INTO|UPDATE\s.+\sSET|DELETE\s+FROM)\b|\bat\s+\S+\s*\([^)]*:\d+|<\/?(?:html|script|body)|(?:api[_-]?key|authorization|token)\s*[:=]\s*\S+/i.test(value))return generic;
  return value.trim();
}
