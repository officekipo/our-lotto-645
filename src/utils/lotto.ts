export function generateNumbers(required: number[], excluded: number[], count: number) {
  const base = Array.from({ length: 45 }, (_, i) => i + 1).filter((n) => !excluded.includes(n));
  const safeRequired = required.filter((n) => !excluded.includes(n)).slice(0, 6);
  const results: number[][] = [];

  for (let set = 0; set < count; set++) {
    const pool = base.filter((n) => !safeRequired.includes(n));
    const picked = [...safeRequired];
    while (picked.length < 6 && pool.length) {
      const index = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(index, 1)[0]);
    }
    results.push(picked.sort((a, b) => a - b));
  }
  return results;
}

export function matchRank(ticket: number[], winning: number[], bonus: number) {
  const matches = ticket.filter((n) => winning.includes(n)).length;
  const bonusMatch = ticket.includes(bonus);
  if (matches === 6) return 1;
  if (matches === 5 && bonusMatch) return 2;
  if (matches === 5) return 3;
  if (matches === 4) return 4;
  if (matches === 3) return 5;
  return 0;
}

export function taxEstimate(amount: number) {
  if (amount <= 200_000_000) return { tax: amount * 0.22, net: amount * 0.78 };
  const tax = 200_000_000 * 0.22 + (amount - 200_000_000) * 0.33;
  return { tax, net: amount - tax };
}

export function money(value: number) {
  return Math.round(value).toLocaleString('ko-KR');
}
