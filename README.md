# SwapTitan Swap API — free, non-custodial, no API key

[![solana-swap-api MCP server](https://glama.ai/mcp/servers/polsolbridge/solana-swap-api/badges/score.svg)](https://glama.ai/mcp/servers/polsolbridge/solana-swap-api)

Swap on **Solana** and **7 EVM chains** with one free REST API. Every endpoint returns an **unsigned transaction** — you sign with your own wallet. The server never holds funds, never sees keys. No registration, no API key, no KYC.

Base URL: `https://swaptitan.net`

## Solana swap (Jupiter aggregator)

```bash
# Quote
curl "https://swaptitan.net/v1/sol/quote?from=sol&to=usdc&amount=0.1"

# Build unsigned swap transaction for YOUR wallet
curl -X POST https://swaptitan.net/v1/sol/swap \
  -H "Content-Type: application/json" \
  -d '{"from":"sol","to":"usdc","amount":0.1,"userPublicKey":"<YOUR_WALLET>"}'
```

Response contains `swapTransaction` (base64, unsigned) — deserialize, sign, send to any RPC:

```js
import { VersionedTransaction, Connection } from '@solana/web3.js';
const { swapTransaction } = await (await fetch('https://swaptitan.net/v1/sol/swap', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ from: 'sol', to: 'usdc', amount: 0.1, userPublicKey: wallet.publicKey.toString() })
})).json();
const tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'));
tx.sign([wallet]);
await new Connection('https://api.mainnet-beta.solana.com').sendRawTransaction(tx.serialize());
```

- `from` / `to`: `sol`, `usdc`, `usdt` or any base58 mint (memecoins, pump.fun tokens — anything Jupiter routes)
- `amount` (human units for sol/usdc/usdt) or `amountRaw` (base units, any mint)
- `slippageBps`: 1–1000, default 50
- Pricing: **free API** — 0.3% routing fee + small flat network service fee inside the transaction (disclosed in the response as `feeBps` and `serviceFeeLamports`)

## EVM swap — Ethereum, Base, BSC, Arbitrum, Polygon, Optimism, Avalanche (KyberSwap aggregator)

```bash
# Quote
curl "https://swaptitan.net/v1/evm/base/quote?tokenIn=native&tokenOut=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&amount=0.1"

# Build unsigned calldata
curl -X POST https://swaptitan.net/v1/evm/base/swap \
  -H "Content-Type: application/json" \
  -d '{"tokenIn":"native","tokenOut":"0x8335...2913","amount":0.1,"account":"<YOUR_0x_WALLET>"}'
```

Response: `tx: { to, data, value }` — sign and broadcast with your own wallet (ethers/viem/web3.js). ERC-20 input requires prior approval to `tx.to`. Pricing: free API, 0.3% routing fee in calldata.

## Universal cross-chain router

One call compares **all rails** (cross-chain exchange bridge, direct H2H liquidity, Solana DEX) and returns the best route with ready-to-execute parameters — including hard pairs like `eth -> xmr`:

```bash
curl "https://swaptitan.net/v1/route?from=eth&to=xmr&amount=0.5"
```

## Solana priority-fee oracle

Live compute-unit price tiers, refreshed continuously — call before sending any Solana transaction:

```bash
curl "https://swaptitan.net/v1/sol/priority-fee"
# -> { "recommended": { "low": ..., "medium": ..., "high": ..., "turbo": ... }, "computeUnitsHint": {...} }
```

## MCP server (AI agents)

Point any MCP-capable agent at `https://swaptitan.net/mcp` (JSON-RPC 2.0, `tools/list` + `tools/call`). Tools include `sol_swap`, `evm_swap`, `smart_route`, `sol_priority_fee`, `swap_create`, `swap_status`, `get_prices`, `rug_check` and more.

```json
{ "mcpServers": { "swaptitan": { "url": "https://swaptitan.net/mcp" } } }
```

Discovery endpoints: [`/llms.txt`](https://swaptitan.net/llms.txt) · [`/.well-known/agent-skills/index.json`](https://swaptitan.net/.well-known/agent-skills/index.json) · [`/.well-known/mcp/server-card.json`](https://swaptitan.net/.well-known/mcp/server-card.json)

## More

- 1288+ asset cross-chain swaps: `GET /v1/swap/quote?from=btc&to=eth&amount=1`
- Live prices: `GET /v1/prices`
- XMR/Monero no-KYC swaps: `GET /v1/xmr/quote?from=sol&amount=1&to=xmr`
- Docs: https://swaptitan.net/developers

## Rate limits & fair use

Public endpoints are rate-limited per IP (20–60/min depending on endpoint). Fees are always disclosed in the API response. All transactions are non-custodial: nothing executes until **you** sign.
