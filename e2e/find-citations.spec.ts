import { test, expect } from '@playwright/test';
import { resolveFindCitations, sourceQuote } from '../lib/find-citations';
import { composeFindAnswer } from '../lib/find-answer';
import type { Block } from '../lib/types';

const blocks: Block[] = [
  { id: 'n3', type: 'paragraph', text: 'Sleep is a state of reduced mental and physical activity.' },
  { id: 'n5', type: 'paragraph', text: "During sleep, most of the body's systems are in an anabolic state, helping to restore the immune, nervous, skeletal, and muscular systems;[3] Sleep is a highly conserved behavior across animal evolution,[6] likely going back hundreds of millions of years,[7] and originating as a means for the brain to cleanse itself of waste products.[8]" },
  { id: 'n87', type: 'heading', text: 'Memory processing' },
  { id: 'n88', type: 'paragraph', text: 'It has been widely accepted that sleep must support the formation of long-term memory, and generally increasing previous learning and experiences recalls.' },
];

test('Sleep citations recover punctuation, inline references, and a wrong block ID', () => {
  const citations = resolveFindCitations([
    { marker: '3', id: 'n3', quote: blocks[0].text },
    { marker: '5', id: 'n5', quote: "During sleep, most of the body's systems are in an anabolic state, helping to restore the immune, nervous, skeletal, and muscular systems." },
    { marker: '5', id: 'n5', quote: 'Sleep is a highly conserved behavior across animal evolution, likely going back hundreds of millions of years, and originating as a means for the brain to cleanse itself of waste products.' },
    { marker: '87', id: 'n87', quote: 'It has been widely accepted that sleep must support the formation of long-term memory.' },
  ], blocks);
  expect(citations).toHaveLength(4);
  expect(citations.map(c => c.id)).toEqual(['n3', 'n5', 'n5', 'n88']);
  for (const citation of citations) {
    expect(blocks.find(b => b.id === citation.id)!.text).toContain(citation.quote);
  }
  expect(citations[2].quote).toContain('[6]');
});

test('unverified claims stay visible and are labeled instead of silently deleted', () => {
  const answer = composeFindAnswer([
    { text: 'Supported claim.', markers: ['1'] },
    { text: 'Unverified claim.', markers: ['missing'] },
    { text: 'Partially sourced claim.', markers: ['1', 'missing'] },
  ], '', new Set(['1']));
  expect(answer).toBe('Supported claim. [1] Unverified claim. (Source not verified.) Partially sourced claim. [1] (Additional source not verified.)');
});

test('repair rejects different facts and ambiguous reassignment', () => {
  expect(sourceQuote('Sleep lasts 7 hours every night.', 'Sleep lasts 9 hours every night.')).toBeNull();
  expect(resolveFindCitations([{ marker: '1', id: 'wrong', quote: blocks[0].text }], [
    blocks[0], { ...blocks[0], id: 'duplicate' },
  ])).toEqual([]);
  expect(resolveFindCitations([{ marker: '1', id: 'n3', quote: 'An invented claim about sleep.' }], blocks)).toEqual([]);
});
