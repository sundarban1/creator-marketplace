import { describe, it, expect } from 'vitest';
import { renderActionEmail } from './collaborationReminder';

describe('renderActionEmail', () => {
  it('escapes every user-supplied field', () => {
    const html = renderActionEmail({
      subject: 's',
      heading: '<b>Hi</b>',
      paragraphs: ['Tom & "Jerry" <script>'],
      details: [{ label: 'Campaign', value: '<img src=x>' }],
      cta: { label: 'Go', url: 'https://x.dev/?a=1&b="2"' },
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x>');
    expect(html).not.toContain('<b>Hi</b>');
    expect(html).toContain('&lt;b&gt;Hi&lt;/b&gt;');
    expect(html).toContain('href="https://x.dev/?a=1&amp;b=&quot;2&quot;"');
  });

  it('omits the details card and CTA when not given', () => {
    const html = renderActionEmail({ subject: 's', heading: 'h', paragraphs: ['p'] });
    expect(html).not.toContain('#C7D2FE');
    expect(html).not.toContain('<a href');
  });
});
