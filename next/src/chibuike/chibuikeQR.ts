// Chibuike QR — thin wrapper over the MIT qrcode-generator lib (zero deps),
// exposed as a boolean module grid so painting stays vector-crisp at any zoom.
import qrcode from 'qrcode-generator';

export function chibuikeQRModules(data: string, ec: 'L' | 'M' | 'Q' | 'H' = 'M'): boolean[][] | null {
  if (!data) return null;
  try {
    const qr = qrcode(0, ec);
    qr.addData(data);
    qr.make();
    const n = qr.getModuleCount();
    const grid: boolean[][] = [];
    for (let r = 0; r < n; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < n; c++) row.push(qr.isDark(r, c));
      grid.push(row);
    }
    return grid;
  } catch {
    return null; // data too long for the EC level — UI shows a friendly error
  }
}
