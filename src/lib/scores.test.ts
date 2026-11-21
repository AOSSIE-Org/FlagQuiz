import { describe, expect, it } from 'vitest';
import { bestGoldOverall, emptyScore, emptyScores, scoreCorrect, scoreMistake } from './scores';

describe('scores', () => {
  it('counts gold and silver stars for rounds without mistakes', () => {
    const s = emptyScore();
    scoreCorrect(s, true);
    scoreCorrect(s, true);
    scoreCorrect(s, false); // solved after a mistake: only counted as correct
    expect(s).toEqual({ correct: 3, gold: 2, bestGold: 2, silver: 2, bestSilver: 2 });
  });

  it('resets gold stars but only takes one silver star per mistake, never below zero', () => {
    const s = emptyScore();
    for (let i = 0; i < 5; i++) scoreCorrect(s, true);
    scoreMistake(s);
    scoreMistake(s);
    expect(s).toMatchObject({ gold: 0, bestGold: 5, silver: 3, bestSilver: 5 });
    for (let i = 0; i < 5; i++) scoreMistake(s);
    expect(s.silver).toBe(0);
    scoreCorrect(s, true);
    expect(s).toMatchObject({ gold: 1, silver: 1, bestGold: 5, bestSilver: 5 });
  });

  it('finds the best gold run in any game', () => {
    const scores = emptyScores();
    scores.capital.bestGold = 7;
    scores.flag.bestGold = 3;
    expect(bestGoldOverall(scores)).toBe(7);
  });
});
