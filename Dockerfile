# SwapTitan MCP server (stdio) — self-contained, no dependencies.
# Runs the local MCP server; tool calls hit the free public SwapTitan API.
FROM node:20-slim
WORKDIR /app
COPY mcp-server.js ./
CMD ["node","mcp-server.js"]
