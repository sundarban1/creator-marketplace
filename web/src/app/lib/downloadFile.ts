/**
 * Save a remote file under its own name. `<a download>` is ignored for
 * cross-origin URLs (Cloudinary / R2), so fetch it as a blob first; when the
 * host doesn't allow CORS, fall back to opening it in a new tab.
 */
export async function downloadFile(url: string, name: string): Promise<void> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(String(res.status));
    const blobUrl = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
