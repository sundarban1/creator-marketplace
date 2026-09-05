import { sendEmail, wrapLayout } from './core';

export async function sendResourceAlertEmail(opts: {
  to: string;
  label: string;
  usedLabel: string;
  limitLabel: string;
  percent: number;
}): Promise<void> {
  const html = wrapLayout(`
    <h2 style="color:#DC2626;font-size:20px;font-weight:700;margin:0 0 6px;">⚠️ Resource Threshold Alert</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">${opts.label} has crossed its alert threshold on kolab-api (production).</p>

    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;border:1px solid #fecaca;border-radius:10px;overflow:hidden;">
      <tr style="background:#fef2f2;">
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;width:120px;">Resource</td>
        <td style="padding:10px 16px;font-size:14px;color:#111827;">${opts.label}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;border-top:1px solid #fecaca;">Current</td>
        <td style="padding:10px 16px;font-size:14px;color:#DC2626;font-weight:600;border-top:1px solid #fecaca;">${opts.usedLabel} (${opts.percent.toFixed(1)}%)</td>
      </tr>
      <tr style="background:#fef2f2;">
        <td style="padding:10px 16px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;border-top:1px solid #fecaca;">Configured limit</td>
        <td style="padding:10px 16px;font-size:14px;color:#111827;border-top:1px solid #fecaca;">${opts.limitLabel}</td>
      </tr>
    </table>

    <p style="color:#9ca3af;font-size:12px;margin:0;">You'll get another alert for this resource once it drops back under threshold and re-crosses it, or after the cooldown window — whichever comes first.</p>
  `);

  await sendEmail(opts.to, `[Kolab Alert] ${opts.label} at ${opts.percent.toFixed(0)}%`, html);
}
