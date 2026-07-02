'use strict';
const BASE = 'https://swaptitan.net';

async function api(path, opts) {
  const r = await fetch(BASE + path, opts);
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
  return d;
}
const qs = o => Object.entries(o).filter(([, v]) => v !== undefined && v !== null)
  .map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
const post = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/** Solana DEX quote via Jupiter. from/to: 'sol'|'usdc'|'usdt'|mint address. */
exports.solQuote = (from, to, amount, extra) => api('/v1/sol/quote?' + qs({ from, to, amount, ...extra }));

/** Build an UNSIGNED Solana swap tx (base64) for your own wallet to sign. Non-custodial. */
exports.solSwap = ({ from, to, amount, amountRaw, userPublicKey, slippageBps }) =>
  api('/v1/sol/swap', post({ from, to, amount, amountRaw, userPublicKey, slippageBps }));

/** Live Solana priority-fee tiers (call before every tx). */
exports.solPriorityFee = () => api('/v1/sol/priority-fee');

/** EVM quote. chain: eth|base|bsc|arbitrum|polygon|optimism|avax. tokens: 0x-address or 'native'. */
exports.evmQuote = (chain, tokenIn, tokenOut, amount, extra) =>
  api('/v1/evm/' + chain + '/quote?' + qs({ tokenIn, tokenOut, amount, ...extra }));

/** Build UNSIGNED EVM calldata {to,data,value} for your own wallet. ERC20 input needs prior approval. */
exports.evmSwap = (chain, { tokenIn, tokenOut, amount, amountRaw, account, slippageBps }) =>
  api('/v1/evm/' + chain + '/swap', post({ tokenIn, tokenOut, amount, amountRaw, account, slippageBps }));

/** Universal router: best route across ALL rails (cross-chain bridge, H2H, Solana DEX). */
exports.route = (from, to, amount) => api('/v1/route?' + qs({ from, to, amount }));

/** Cross-chain swap quote (1288+ assets, e.g. btc->xmr). */
exports.swapQuote = (from, to, amount) => api('/v1/swap/quote?' + qs({ from, to, amount }));

/** Live prices. */
exports.prices = () => api('/v1/prices');

exports.BASE = BASE;
