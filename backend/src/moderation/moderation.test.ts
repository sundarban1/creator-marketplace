import { describe, it, expect } from 'vitest';
import { moderateUsername, moderateDisplayName, ModerationCategory } from './index';

function expectRejected(input: string) {
  const result = moderateUsername(input);
  expect(result.allowed, `expected "${input}" to be REJECTED`).toBe(false);
  // §5/§28 — the matched term is available for logging but must never be
  // something a caller accidentally forwards to the client as the reason.
  expect(result.matchedTerm).toBeTruthy();
}

function expectAllowed(input: string) {
  const result = moderateUsername(input);
  expect(result.allowed, `expected "${input}" to be ALLOWED (matched: ${result.matchedTerm})`).toBe(true);
}

describe('English profanity', () => {
  it.each(['fuck', 'FUCK', 'FuCk', 'f.u.c.k', 'f-u-c-k', 'f_u_c_k'])('rejects %s', (input) => {
    expectRejected(input);
  });
});

describe('Romanized Nepali', () => {
  it.each(['muji', 'MUJI', 'm.u.j.i', 'm-u-j-i', 'm0ji', 'chutiya', 'randi', 'harami'])('rejects %s', (input) => {
    expectRejected(input);
  });
});

describe('Nepali Devanagari', () => {
  it.each(['मुर्ख', 'मूर्ख', 'हरामी', 'चुतिया', 'रण्डी'])('rejects %s', (input) => {
    expectRejected(input);
  });
});

describe('Romanized Hindi / Indian profanity', () => {
  it.each([
    'madarchod',
    'madarch0d',
    'm.a.d.a.r.c.h.o.d',
    'm-a-d-a-r-c-h-o-d',
    'bhenchod',
    'benchod',
    'chutiya',
    'gandu',
    'harami',
    'kamina',
  ])('rejects %s', (input) => {
    expectRejected(input);
  });
});

describe('Reserved / impersonation', () => {
  it.each(['admin', 'administrator', 'kolabadmin', 'kolabofficial', 'officialkolab', 'k.o.l.a.b.o.f.f.i.c.i.a.l', 'kolab_support'])(
    'rejects %s',
    (input) => {
      expectRejected(input);
    },
  );

  it('flags reserved names with RESERVED or IMPERSONATION category', () => {
    const admin = moderateUsername('admin');
    expect(admin.category).toBe(ModerationCategory.RESERVED);
    const impersonation = moderateUsername('kolabofficial');
    expect(impersonation.category).toBe(ModerationCategory.IMPERSONATION);
  });

  it('allows kolab combined with an ordinary, non-authority word', () => {
    for (const name of ['kolabcreator', 'kolabfan', 'kolabpartner', 'kolab']) {
      expectAllowed(name);
    }
  });
});

describe('Short-term boundary matching (§20)', () => {
  it('rejects the standalone short term', () => {
    expectRejected('ass');
  });

  it('rejects it with a digit/underscore boundary', () => {
    expectRejected('ass123');
    expectRejected('ass_hole');
  });

  it('does not reject it embedded in a longer legitimate word', () => {
    expectAllowed('Assistant');
    expectAllowed('Assam');
    expectAllowed('Classic');
  });
});

describe('Legitimate names', () => {
  it.each([
    'Sundar',
    'Sagar',
    'Prakash',
    'Anisha',
    'Kiran',
    'Nabin',
    'Aashish',
    'Rohan',
    'Priya',
    'Amit',
    'CreativeSagar',
    'NepalCreator',
    'KolabCreator',
  ])('allows %s', (input) => {
    expectAllowed(input);
  });

  // Names that legitimately contain a short offensive substring — the exact
  // false-positive traps called out in §20/§23/§37.
  it.each(['Assistant', 'Assam', 'Classic', 'Gandhi', 'Gandaki', 'Sussex', 'Essex', 'Salahuddin', 'Randy'])(
    'allows %s (contains a short substring, not a whole word)',
    (input) => {
      expectAllowed(input);
    },
  );
});

describe('Obfuscation matrix (madarchod)', () => {
  it.each([
    'madarchod',
    'MADARCHOD',
    'mAdArChOd',
    'm.a.d.a.r.c.h.o.d',
    'm-a-d-a-r-c-h-o-d',
    'm_a_d_a_r_c_h_o_d',
    'm4d4rchod',
  ])('rejects %s', (input) => {
    expectRejected(input);
  });
});

describe('Security / bypass attempts (muji)', () => {
  it.each(['m.u.j.i', 'm-u-j-i', 'm_u_j_i', 'm u j i', 'm0ji', 'm00ji', 'muuuji', 'M.U.J.I'])('rejects %s', (input) => {
    expectRejected(input);
  });
});

describe('Repeated-character evasion', () => {
  it.each(['muuuji', 'fuuuck', 'rannndiii', 'chutiiiya'])('rejects %s', (input) => {
    expectRejected(input);
  });

  it('does not collapse ordinary double letters into a false match', () => {
    // "book"/"committee"-style doubles must survive collapse (threshold is
    // 3+ repeats, not 2+) — sanity-checked via a name, not a dictionary term.
    expectAllowed('Sagarr');
  });
});

describe('Suffixed / boundary-delimited evasion', () => {
  it('still catches a dictionary term with a trailing digit suffix', () => {
    expectRejected('chutiya123');
  });

  it('still catches a dictionary term with an underscore suffix', () => {
    expectRejected('randi_official');
  });
});

describe('Deliberately excluded 2-letter abbreviations', () => {
  // "mc"/"bc" are excluded from the dictionaries (see romanized-hindi.ts) —
  // confirms they don't accidentally reject common initials/handles.
  it.each(['mc', 'bc', 'mcdonald', 'bc1998', 'historybc'])('allows %s', (input) => {
    expectAllowed(input);
  });
});

describe('Display name moderation', () => {
  it('rejects profanity the same way as username', () => {
    expect(moderateDisplayName('chutiya').allowed).toBe(false);
  });

  it('rejects profanity embedded in a multi-word display name', () => {
    expect(moderateDisplayName('Sundar Chutiya').allowed).toBe(false);
  });

  it('allows an ordinary multi-word display name', () => {
    expect(moderateDisplayName('Sundar KC').allowed).toBe(true);
    expect(moderateDisplayName('Nepal Creator Studio').allowed).toBe(true);
  });
});

describe('Result shape', () => {
  it('never mutates the original text, only reports a normalized comparison string', () => {
    const result = moderateUsername('m.u.j.i');
    expect(result.allowed).toBe(false);
    expect(result.normalizedText).toBe('muji');
  });

  it('returns allowed:true with no category/severity for clean input', () => {
    const result = moderateUsername('Sundar');
    expect(result).toMatchObject({ allowed: true });
    expect(result.category).toBeUndefined();
    expect(result.matchedTerm).toBeUndefined();
  });

  it('treats empty/whitespace-only input as allowed (format validation handles required-ness)', () => {
    expect(moderateUsername('').allowed).toBe(true);
    expect(moderateUsername('   ').allowed).toBe(true);
  });
});
