#!/usr/bin/env node
/**
 * SwapTitan MCP server (stdio).
 *
 * A self-contained Model Context Protocol server over stdin/stdout
 * (newline-delimited JSON-RPC). The MCP protocol layer (initialize,
 * tools/list, ping) runs fully locally; tool execution calls the free,
 * public SwapTitan API (https://swaptitan.net) — no API key, no KYC,
 * non-custodial: swaps return unsigned transactions for YOUR wallet.
 *
 * Usage:  node mcp-server.js
 * Requires Node.js >= 18 (built-in fetch). No dependencies.
 */
'use strict';

const API = process.env.SWAPTITAN_API || 'https://swaptitan.net';
const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const TOOLS = [
  {
    "name": "get_prices",
    "annotations": {
      "title": "Get Crypto Prices",
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": true
    },
    "description": "Get real-time USD prices for BTC, SOL, ETH and XMR",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": []
    }
  },
  {
    "name": "get_assets",
    "annotations": {
      "title": "List Supported Assets",
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": true
    },
    "description": "List all 1288+ supported swap assets with ticker, network and name",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": []
    }
  },
  {
    "name": "swap_quote",
    "annotations": {
      "title": "Get Swap Quote",
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": true
    },
    "description": "Get estimated output and minimum deposit for a crypto swap pair",
    "inputSchema": {
      "type": "object",
      "properties": {
        "from": {
          "type": "string",
          "description": "Source asset ticker, e.g. btc, usdtsol"
        },
        "to": {
          "type": "string",
          "description": "Destination asset ticker"
        },
        "amount": {
          "type": "number",
          "description": "Input amount in source asset"
        }
      },
      "required": [
        "from",
        "to",
        "amount"
      ]
    }
  },
  {
    "name": "sol_swap_quote",
    "annotations": {
      "title": "Solana Swap Quote (Jupiter)",
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": true
    },
    "description": "Solana DEX quote via Jupiter aggregator. Any SPL token vs SOL/USDC. Free API.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "from": {
          "type": "string",
          "description": "sol, usdc or base58 mint"
        },
        "to": {
          "type": "string",
          "description": "sol, usdc or base58 mint"
        },
        "amount": {
          "type": "number",
          "description": "Human amount (sol/usdc only)"
        },
        "amountRaw": {
          "type": "string",
          "description": "Base units (any mint)"
        }
      },
      "required": [
        "from",
        "to"
      ]
    }
  },
  {
    "name": "sol_swap",
    "annotations": {
      "title": "Build Solana Swap Tx",
      "readOnlyHint": false,
      "destructiveHint": false,
      "openWorldHint": true
    },
    "description": "Build a NON-CUSTODIAL Solana DEX swap via Jupiter: returns an UNSIGNED base64 transaction — sign with YOUR OWN wallet and send to any Solana RPC. Server never touches funds. 0.3% on-chain routing fee.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "from": {
          "type": "string",
          "description": "sol, usdc or base58 mint"
        },
        "to": {
          "type": "string",
          "description": "sol, usdc or base58 mint"
        },
        "amount": {
          "type": "number",
          "description": "Human amount (sol/usdc only)"
        },
        "amountRaw": {
          "type": "string",
          "description": "Base units (any mint)"
        },
        "userPublicKey": {
          "type": "string",
          "description": "Your Solana wallet address (signs the tx)"
        },
        "slippageBps": {
          "type": "number",
          "description": "1-1000, default 50"
        }
      },
      "required": [
        "from",
        "to",
        "userPublicKey"
      ]
    }
  },
  {
    "name": "smart_route",
    "annotations": {
      "title": "Smart Crypto Router",
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": true
    },
    "description": "Universal crypto router: compares ALL available rails (cross-chain exchange bridge, direct H2H liquidity, Solana DEX) in one call and returns the best route with ready-to-execute parameters. Use for hard or exotic pairs.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "from": {
          "type": "string",
          "description": "Source ticker, e.g. btc, sol, usdc"
        },
        "to": {
          "type": "string",
          "description": "Destination ticker, e.g. xmr, eth"
        },
        "amount": {
          "type": "number",
          "description": "Amount in source asset"
        }
      },
      "required": [
        "from",
        "to",
        "amount"
      ]
    }
  },
  {
    "name": "sol_priority_fee",
    "annotations": {
      "title": "Solana Priority-Fee Oracle",
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": true
    },
    "description": "Live Solana priority-fee oracle: current microLamports/CU percentiles and recommended low/medium/high/turbo tiers. Call before sending any Solana transaction.",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": []
    }
  },
  {
    "name": "hl_markets",
    "annotations": {
      "title": "Hyperliquid Markets",
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": true
    },
    "description": "Hyperliquid perpetuals: list all 231 markets with live prices, max leverage and size decimals.",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": []
    }
  },
  {
    "name": "hl_build_order",
    "annotations": {
      "title": "Build Hyperliquid Order",
      "readOnlyHint": false,
      "destructiveHint": false,
      "openWorldHint": true
    },
    "description": "Build a ready Hyperliquid perpetual order action with SwapTitan builder code injected (minimal 0.001% fee). Non-custodial: returns the action + nonce to sign with your own wallet (EIP-712) and POST to https://api.hyperliquid.xyz/exchange. Call hl_approve first (once).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "coin": {
          "type": "string",
          "description": "Market, e.g. BTC, ETH, SOL"
        },
        "isBuy": {
          "type": "boolean",
          "description": "true=long/buy, false=short/sell"
        },
        "sz": {
          "type": "string",
          "description": "Order size in coin units"
        },
        "limitPx": {
          "type": "string",
          "description": "Limit price"
        },
        "reduceOnly": {
          "type": "boolean",
          "description": "Optional"
        },
        "tif": {
          "type": "string",
          "enum": [
            "Gtc",
            "Ioc",
            "Alo"
          ],
          "description": "Time-in-force, default Gtc"
        }
      },
      "required": [
        "coin",
        "isBuy",
        "sz",
        "limitPx"
      ]
    }
  },
  {
    "name": "hl_approve",
    "annotations": {
      "title": "Approve Hyperliquid Builder",
      "readOnlyHint": false,
      "destructiveHint": false,
      "openWorldHint": true
    },
    "description": "Get the one-time approveBuilderFee action to sign with your MAIN wallet, authorizing SwapTitan as Hyperliquid builder at a minimal 0.001% max fee. Revocable anytime.",
    "inputSchema": {
      "type": "object",
      "properties": {},
      "required": []
    }
  },
  {
    "name": "evm_swap",
    "annotations": {
      "title": "Build EVM Swap Tx",
      "readOnlyHint": false,
      "destructiveHint": false,
      "openWorldHint": true
    },
    "description": "Build a NON-CUSTODIAL EVM DEX swap via KyberSwap aggregator on eth/base/bsc/arbitrum/polygon/optimism/avax: returns UNSIGNED calldata {to,data,value} — sign with YOUR OWN wallet. Server never touches funds. 0.3% routing fee. ERC20 input needs prior approval.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "chain": {
          "type": "string",
          "enum": [
            "eth",
            "base",
            "bsc",
            "arbitrum",
            "polygon",
            "optimism",
            "avax"
          ],
          "description": "EVM chain"
        },
        "tokenIn": {
          "type": "string",
          "description": "0x-address or native"
        },
        "tokenOut": {
          "type": "string",
          "description": "0x-address or native"
        },
        "amount": {
          "type": "number",
          "description": "Human amount (native only)"
        },
        "amountRaw": {
          "type": "string",
          "description": "Base units (any token)"
        },
        "account": {
          "type": "string",
          "description": "Your 0x wallet address"
        },
        "slippageBps": {
          "type": "number",
          "description": "10-2000, default 100"
        }
      },
      "required": [
        "chain",
        "tokenIn",
        "tokenOut",
        "account"
      ]
    }
  },
  {
    "name": "swap_create",
    "annotations": {
      "title": "Create Cross-Chain Swap",
      "readOnlyHint": false,
      "destructiveHint": false,
      "openWorldHint": true
    },
    "description": "Create a non-custodial cross-chain swap order. 3 providers: changenow (1288+ assets, returns payinAddress), simpleswap (400+ assets, returns payinAddress), heleket (XMR-optimised 5-6 conf, returns redirectUrl to payment page). Omit provider for auto-select.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "from": {
          "type": "string",
          "description": "Source asset ticker (e.g. sol, btc, eth, usdt)"
        },
        "to": {
          "type": "string",
          "description": "Destination asset ticker (e.g. xmr, btc, sol)"
        },
        "amount": {
          "type": "number",
          "description": "Amount to send"
        },
        "address": {
          "type": "string",
          "description": "Destination address to receive swapped funds"
        },
        "refundAddress": {
          "type": "string",
          "description": "Optional refund address for failed swaps"
        },
        "provider": {
          "type": "string",
          "enum": [
            "changenow",
            "simpleswap",
            "heleket"
          ],
          "description": "changenow=1288+ assets; simpleswap=400+ assets; heleket=XMR-optimised payment page"
        },
        "fromNet": {
          "type": "string",
          "description": "Source network override (e.g. arbitrum, base, tron)"
        },
        "toNet": {
          "type": "string",
          "description": "Destination network override"
        }
      },
      "required": [
        "from",
        "to",
        "amount",
        "address"
      ]
    }
  },
  {
    "name": "swap_status",
    "annotations": {
      "title": "Check Swap Status",
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": true
    },
    "description": "Check status of a swap order. Poll every 20-30s. Lifecycle: waiting->confirming->exchanging->done. For heleket provider, status is checked via Heleket API.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "description": "Order ID from swap_create"
        },
        "provider": {
          "type": "string",
          "enum": [
            "changenow",
            "simpleswap",
            "heleket"
          ],
          "description": "Provider from swap_create response"
        }
      },
      "required": [
        "id"
      ]
    }
  },
  {
    "name": "create_wallet",
    "annotations": {
      "title": "Create Wallet",
      "readOnlyHint": false,
      "destructiveHint": false,
      "openWorldHint": false
    },
    "description": "Generate a new non-custodial crypto wallet. Returns address and private key. Chain: sol (Solana), eth/base/bsc (EVM).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "chain": {
          "type": "string",
          "enum": [
            "sol",
            "eth",
            "base",
            "bsc"
          ],
          "description": "Blockchain for the wallet",
          "default": "sol"
        }
      },
      "required": []
    }
  },
  {
    "name": "check_portfolio",
    "annotations": {
      "title": "Check Wallet Portfolio",
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": true
    },
    "description": "Look up the native-coin balance of any wallet address on Solana, Ethereum, Base or BNB Smart Chain. Returns the native balance (SOL, ETH or BNB), its current USD value and the queried chain as JSON, e.g. {\"chain\":\"sol\",\"balance\":1.2345,\"usd\":92.51}. Read-only: needs no signature, never moves funds. Useful before building a swap to verify the wallet can cover amount plus network fees.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "address": {
          "type": "string",
          "description": "Wallet address to check. Base58 for Solana (e.g. 7uZqehZaRiANgaFkSDvB625TPF78EG6HkAuxanE8ZTjZ); 0x-prefixed hex for EVM chains (e.g. 0xA20E1D8B9aD0fb580a4c36483b1A841D2bE91E68)."
        },
        "chain": {
          "type": "string",
          "enum": [
            "sol",
            "eth",
            "base",
            "bsc"
          ],
          "description": "Blockchain to query: sol = Solana (default), eth = Ethereum mainnet, base = Base, bsc = BNB Smart Chain.",
          "default": "sol"
        }
      },
      "required": [
        "address"
      ]
    }
  },
  {
    "name": "rug_check",
    "annotations": {
      "title": "Rug-Check Token",
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": true
    },
    "description": "Check if a token contract is a rug pull / scam. Returns risk score and warning flags.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "token": {
          "type": "string",
          "description": "Token contract address"
        },
        "chain": {
          "type": "string",
          "enum": [
            "sol",
            "eth",
            "base",
            "bsc"
          ],
          "description": "Chain of the token",
          "default": "sol"
        }
      },
      "required": [
        "token"
      ]
    }
  },
  {
    "name": "set_price_alert",
    "annotations": {
      "title": "Set Price Alert",
      "readOnlyHint": false,
      "destructiveHint": false,
      "openWorldHint": false
    },
    "description": "Set a Telegram price alert for a crypto asset. Triggers when price goes above or below target.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "coin": {
          "type": "string",
          "description": "Asset ticker: btc, sol, eth, xmr"
        },
        "target": {
          "type": "number",
          "description": "Target price in USD"
        },
        "direction": {
          "type": "string",
          "enum": [
            "above",
            "below"
          ],
          "description": "Trigger when price is above or below target"
        },
        "tg_chat": {
          "type": "string",
          "description": "Telegram Chat ID to receive the alert"
        }
      },
      "required": [
        "coin",
        "target",
        "direction",
        "tg_chat"
      ]
    }
  },
  {
    "name": "ai_chat",
    "annotations": {
      "title": "AI Assistant Chat",
      "readOnlyHint": true,
      "destructiveHint": false,
      "openWorldHint": true
    },
    "description": "Chat with SwapTitan AI agent for complex crypto tasks, multi-step swaps, and natural language queries.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "message": {
          "type": "string",
          "description": "Natural language message"
        },
        "wallet": {
          "type": "string",
          "description": "Optional wallet address for context"
        }
      },
      "required": [
        "message"
      ]
    }
  }
];

process.stdin.setEncoding('utf8');
let buf = '';
let pending = 0;
let stdinClosed = false;
function maybeExit() {
  if (stdinClosed && pending === 0) process.exit(0);
}
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (line) {
      pending++;
      Promise.resolve(handleLine(line)).finally(() => { pending--; maybeExit(); });
    }
  }
});
process.stdin.on('end', () => { stdinClosed = true; maybeExit(); });

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

async function handleLine(line) {
  let req;
  try {
    req = JSON.parse(line);
  } catch (e) {
    return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
  }
  const id = req.id;
  const method = req.method;
  const params = req.params;
  const isNotification = id === undefined || id === null;
  try {
    if (method === 'initialize') {
      const reqv = params && params.protocolVersion;
      const pv = PROTOCOLS.includes(reqv) ? reqv : PROTOCOLS[0];
      return send({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: pv,
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: 'SwapTitan MCP',
            title: 'SwapTitan',
            version: '1.0.0',
            websiteUrl: 'https://swaptitan.net'
          }
        }
      });
    }
    if (typeof method === 'string' && method.startsWith('notifications/')) return;
    if (method === 'ping') return send({ jsonrpc: '2.0', id, result: {} });
    if (method === 'tools/list') return send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    if (method === 'resources/list') return send({ jsonrpc: '2.0', id, result: { resources: [] } });
    if (method === 'prompts/list') return send({ jsonrpc: '2.0', id, result: { prompts: [] } });
    if (method === 'tools/call') {
      const name = params && params.name;
      if (!name || !TOOLS.some((t) => t.name === name)) {
        if (isNotification) return;
        return send({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Unknown tool: ' + name } });
      }
      const r = await fetch(API + '/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: id === undefined ? 1 : id, method: 'tools/call', params }),
        signal: AbortSignal.timeout(30000)
      });
      const j = await r.json().catch(() => null);
      if (isNotification) return;
      if (j && j.error) return send({ jsonrpc: '2.0', id, error: j.error });
      if (j && j.result !== undefined) return send({ jsonrpc: '2.0', id, result: j.result });
      return send({ jsonrpc: '2.0', id, error: { code: -32000, message: 'SwapTitan API error (HTTP ' + r.status + ')' } });
    }
    if (isNotification) return;
    return send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found: ' + method } });
  } catch (e) {
    if (!isNotification) {
      send({ jsonrpc: '2.0', id, error: { code: -32000, message: String((e && e.message) || e).slice(0, 200) } });
    }
  }
}
