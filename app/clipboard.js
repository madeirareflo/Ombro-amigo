export async function copyText(text, clipboard=globalThis.navigator?.clipboard) {
  const value=String(text || '');
  if(!value.trim()) throw new Error('empty text');
  if(!clipboard || typeof clipboard.writeText!=='function') {
    throw new Error('clipboard unavailable');
  }
  await clipboard.writeText(value);
  return true;
}
