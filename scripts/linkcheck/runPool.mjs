/**
 * Runs an async worker over a list with a fixed number running at once,
 * keeping results in input order.
 *
 * @template T, R
 * @param {T[]} items - The inputs.
 * @param {number} concurrency - How many workers run at the same time.
 * @param {(item: T) => Promise<R>} worker - The async function to run per item.
 * @returns {Promise<R[]>} Results in the same order as the inputs.
 */
export const runPool = async (items, concurrency, worker) => {
  const results = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(lanes);
  return results;
};
