## MCP Swimlanes Server

MCP server that turns natural-language prompts into [swimlanes.io](https://swimlanes.io) diagrams and images.

### Install

```bash
pnpm i || npm i
pnpm run build || npm run build
# Optional for local CLI use without absolute paths:
npm link
```

Optional: copy `.env.example` to `.env` and set at least one LLM key if you want prompt-to-syntax conversion handled server-side.

### Run (standalone)

```bash
mcp-swimlanes
```

This server is meant to be launched by an MCP-capable client over stdio.

### Tools

- `swimlanes.text_from_prompt(prompt, provider?, model?)` → returns Swimlanes syntax
- `swimlanes.generate_link(text)` → returns editor/share link
- `swimlanes.generate_image_link(text, high_resolution?)` → returns PNG link
- `swimlanes.generate_image(text, high_resolution?)` → returns base64 PNG as an image content item
- `swimlanes.image_from_prompt(prompt, high_resolution?, provider?, model?)` → base64 PNG
- `swimlanes.link_from_prompt(prompt, provider?, model?)` → editor/share link

### Configuration

Environment variables (use any one provider):

- `ANTHROPIC_API_KEY` and optional `ANTHROPIC_MODEL` (default `claude-3-5-sonnet-latest`)
- `OPENAI_API_KEY` and optional `OPENAI_MODEL` (default `gpt-4o-mini`)

### Example client config

Claude Desktop (macOS) `claude_desktop_config.json` snippet:

```json
{
  "mcpServers": {
    "swimlanes": {
      "command": "mcp-swimlanes",
      "env": {
        "OPENAI_API_KEY": "...",
        "OPENAI_MODEL": "gpt-4o-mini",
        "ANTHROPIC_API_KEY": "...",
        "ANTHROPIC_MODEL": "claude-3-5-sonnet-latest"
      }
    }
  }
}
```

If you prefer not to use the CLI binary, you can still point directly to the built entry:

```json
{
  "mcpServers": {
    "swimlanes": {
      "command": "node",
      "args": ["/Users/user/absolute/path/to/mcp-swimlanes/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "..."
      }
    }
  }
}
```

Cursor supports MCP servers via "Tools". Add a tool with command `mcp-swimlanes` (recommended) or `node` + args `dist/index.js`, and set env vars.

### Notes

- The server reads the local `syntax.md` and provides it to the LLM to ensure valid output.
- For best print quality, set `high_resolution: true`.
