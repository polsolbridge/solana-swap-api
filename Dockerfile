# SwapTitan MCP — Glama introspection container.
# The real server is hosted (no-auth) at https://swaptitan.net/mcp.
# This image runs a stdio<->HTTP bridge so Glama can start it and
# introspect (tools/list) without any credentials.
FROM node:20-slim
WORKDIR /app
RUN npm install -g mcp-remote@latest
ENV MCP_REMOTE_URL="https://swaptitan.net/mcp"
ENTRYPOINT ["npx","-y","mcp-remote","https://swaptitan.net/mcp"]
