export async function downloadPng(canvas: HTMLCanvasElement, title: string) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(value => value ? resolve(value) : reject(new Error('No se pudo generar el PNG')), 'image/png');
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const slug = title.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  link.href = url;
  link.download = `prode-tafa-${slug}.png`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
