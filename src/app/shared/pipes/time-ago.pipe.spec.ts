import { describe, expect, it } from 'vitest';
import { TimeAgoPipe } from './time-ago.pipe';

describe('TimeAgoPipe', () => {
  const pipe = new TimeAgoPipe();
  const now = new Date('2026-11-17T12:00:00.000Z');

  it('returns empty string for null, undefined, or empty string', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('returns empty string for invalid date strings', () => {
    expect(pipe.transform('invalid-date')).toBe('');
  });

  it('returns "Just now" for dates less than 60 seconds ago or in the future', () => {
    const thirtySecsAgo = new Date(now.getTime() - 30 * 1000);
    expect(pipe.transform(thirtySecsAgo, now)).toBe('Just now');

    const future = new Date(now.getTime() + 10 * 1000);
    expect(pipe.transform(future, now)).toBe('Just now');
  });

  it('returns minutes ago for dates under 1 hour ago', () => {
    const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);
    expect(pipe.transform(fiveMinsAgo, now)).toBe('5m ago');

    const fiftyNineMinsAgo = new Date(now.getTime() - 59 * 60 * 1000);
    expect(pipe.transform(fiftyNineMinsAgo, now)).toBe('59m ago');
  });

  it('returns hours ago for dates under 24 hours ago', () => {
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    expect(pipe.transform(twoHoursAgo, now)).toBe('2h ago');

    const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000);
    expect(pipe.transform(twentyThreeHoursAgo, now)).toBe('23h ago');
  });

  it('returns "Yesterday" for dates 1 day (24-48 hours) ago', () => {
    const yesterday = new Date(now.getTime() - 26 * 60 * 60 * 1000);
    expect(pipe.transform(yesterday, now)).toBe('Yesterday');
  });

  it('returns days ago for dates between 2 and 6 days ago', () => {
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(threeDaysAgo, now)).toBe('3d ago');

    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(sixDaysAgo, now)).toBe('6d ago');
  });

  it('formats dates older than 7 days as readable date', () => {
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(tenDaysAgo, now)).toBe('Nov 7');

    const previousYear = new Date('2025-05-15T12:00:00.000Z');
    expect(pipe.transform(previousYear, now)).toContain('2025');
  });
});
