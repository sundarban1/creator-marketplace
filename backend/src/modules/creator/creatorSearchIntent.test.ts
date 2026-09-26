import { describe, expect, it } from 'vitest';
import { parseCreatorSearchIntent } from './creatorSearchIntent';
import { isLexiconTerm } from '../../utils/searchTerms';

const parse = (q: string, places: string[] = []) => parseCreatorSearchIntent(q, places, isLexiconTerm);

describe('parseCreatorSearchIntent', () => {
  it('extracts count, topic and place from a hero-style request', () => {
    expect(parse('I need 3 creators to promote my cafe in Kathmandu')).toEqual({
      query: 'I need 3 creators to promote my cafe in Kathmandu',
      topic: 'cafe',
      location: 'Kathmandu',
      platforms: [],
      creatorCount: 3,
      minFollowers: null,
      maxFollowers: null,
      sortByFollowers: false,
    });
  });

  it('reads platforms, including two-word spellings', () => {
    const r = parse('I need TikTok creators in Pokhara');
    expect(r.platforms).toEqual(['tiktok']);
    expect(r.location).toBe('Pokhara');
    expect(r.topic).toBeNull();
    expect(parse('tik tok and insta food creators').platforms.sort()).toEqual(['instagram', 'tiktok']);
  });

  it('treats Nepal as nationwide, not a filter or a topic', () => {
    const r = parse('Find beauty creators in Nepal');
    expect(r.location).toBeNull();
    expect(r.topic).toBe('beauty');
  });

  it('keeps the product and drops the business noun', () => {
    const r = parse('I need lifestyle creators for my new clothing brand');
    expect(r.topic).toBe('lifestyle clothing');
    expect(r.location).toBeNull();
  });

  it('uses places creators actually list, longest match first', () => {
    expect(parse('Find 5 creators around Itahari').location).toBe('Itahari');
    expect(parse('creators in koshi haraicha', ['Koshi Haraicha', 'Koshi']).location).toBe('Koshi Haraicha');
  });

  it('reads an unlisted place after a preposition, but never a topic word', () => {
    expect(parse('creators around Tokha').location).toBe('Tokha');
    const r = parse('creators in fashion');
    expect(r.location).toBeNull();
    expect(r.topic).toBe('fashion');
  });

  it('understands the Nepali popular searches', () => {
    const food = parse('काठमाडौंका फूड क्रिएटर');
    expect(food.location).toBe('Kathmandu');
    expect(food.topic).toBe('food');
    const tiktok = parse('पोखराका टिकटक क्रिएटर');
    expect(tiktok.location).toBe('Pokhara');
    expect(tiktok.platforms).toEqual(['tiktok']);
    expect(parse('मलाई ३ जना क्रिएटर चाहियो').creatorCount).toBe(3);
  });

  it('bounds the count, and never reads a follower number as one', () => {
    expect(parse('two food creators').creatorCount).toBe(2);
    const r = parse('creators with 5000 followers');
    expect(r.creatorCount).toBeNull();
    expect(r.minFollowers).toBe(5000);
    const both = parse('I need 5 food creators with 20k+ followers');
    expect([both.creatorCount, both.minFollowers, both.topic]).toEqual([5, 20000, 'food']);
  });

  it('reads follower thresholds in every common form', () => {
    const cases: [string, number | null, number | null][] = [
      ['TikTok creators with 10k+ followers', 10_000, null],
      ['instagram creators with more than 50k followers', 50_000, null],
      ['food creators over 1 lakh followers', 100_000, null],
      ['YouTubers with at least 1,000 subscribers', 1_000, null],
      ['creators under 5k followers', null, 5_000],
      ['creators between 10k and 50k followers', 10_000, 50_000],
      ['beauty creators 10k-50k followers', 10_000, 50_000],
      ['1.5m followers tiktok', 1_500_000, null],
      ['micro influencers in Kathmandu', 10_000, 100_000],
      ['creators with 1.5L followers', 150_000, null],
      ['creators with 1 crore followers', 10_000_000, null],
    ];
    for (const [q, min, max] of cases) {
      const r = parse(q);
      expect([q, r.minFollowers, r.maxFollowers]).toEqual([q, min, max]);
      expect(r.topic ?? '').not.toMatch(/follower|subscriber|influencer/);
    }
  });

  it('ties the follower filter to the named platform and reads ranking words', () => {
    const r = parse('creators who has more tiktok followers');
    expect(r.platforms).toEqual(['tiktok']);
    expect(r.sortByFollowers).toBe(true);
    expect(r.topic).toBeNull();
    const top = parse('top TikTok creators in Pokhara');
    expect([top.sortByFollowers, top.location, top.platforms]).toEqual([true, 'Pokhara', ['tiktok']]);
    expect(parse('creators with most instagram followers').sortByFollowers).toBe(true);
    expect(parse('food creators in Kathmandu').sortByFollowers).toBe(false);
  });

  it('returns an empty intent for empty or punctuation-only input', () => {
    expect(parse('   ')).toEqual({
      query: '', topic: null, location: null, platforms: [], creatorCount: null,
      minFollowers: null, maxFollowers: null, sortByFollowers: false,
    });
    expect(parse('?!').topic).toBeNull();
  });
});
