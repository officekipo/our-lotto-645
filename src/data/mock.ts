export const latestDraw = {
  round: 1189,
  date: '2026.09.05',
  numbers: [3, 11, 17, 25, 34, 42],
  bonus: 9,
  firstPrize: 2781456720,
  winners: 10,
};

export const frequency = [
  ['27', 186], ['34', 184], ['12', 181], ['7', 179], ['40', 178], ['17', 177],
  ['3', 176], ['14', 175], ['25', 174], ['33', 173],
].map(([number, count]) => ({ number: Number(number), count: Number(count) }));

export const recentStats = {
  oddAverage: 2.9,
  sumAverage: 154.2,
  consecutiveRate: 36.8,
  fortyRate: 71.4,
};
