#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  downloadImage,
  generateDiagramLink,
  generateImageLink,
} from "./swimlanes.js";
import { promptToSwimlanesText } from "./llm.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const server = new Server(
  { name: "mcp-swimlanes", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

function textContent(text: string) {
  return { content: [{ type: "text", text }] as const };
}

function imageContent(pngBytes: Uint8Array) {
  const base64 = Buffer.from(pngBytes).toString("base64");
  return {
    content: [{ type: "image", mimeType: "image/png", data: base64 }] as const,
  };
}

type JsonSchema = {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  enum?: string[];
  description?: string;
  default?: any;
};

const textSchema: JsonSchema = {
  type: "object",
  properties: {
    text: { type: "string", description: "Swimlanes.io diagram text" },
  },
  required: ["text"],
};

const promptSchema: JsonSchema = {
  type: "object",
  properties: {
    prompt: {
      type: "string",
      description: "Natural-language description of the swimlane diagram",
    },
    provider: {
      type: "string",
      enum: ["anthropic", "openai"],
      description: "LLM provider override (optional)",
    },
    model: { type: "string", description: "Model name override (optional)" },
  },
  required: ["prompt"],
};

const imageOptionsSchema: JsonSchema = {
  type: "object",
  properties: {
    text: { type: "string", description: "Swimlanes.io diagram text" },
    high_resolution: {
      type: "boolean",
      description: "Double image size for high-DPI output",
      default: false,
    },
  },
  required: ["text"],
};

const tools = [
  {
    name: "swimlanes.generate_link",
    description:
      "Generate an editable Swimlanes diagram link from diagram text",
    inputSchema: textSchema,
  },
  {
    name: "swimlanes.generate_image_link",
    description: "Generate a PNG image link from diagram text",
    inputSchema: imageOptionsSchema,
  },
  {
    name: "swimlanes.generate_image",
    description: "Return the PNG image (base64) for given diagram text",
    inputSchema: imageOptionsSchema,
  },
  {
    name: "swimlanes.text_from_prompt",
    description:
      "Convert a natural-language prompt into Swimlanes.io syntax using an LLM (requires API key)",
    inputSchema: promptSchema,
  },
  {
    name: "swimlanes.image_from_prompt",
    description:
      "Generate a PNG image (base64) directly from a natural-language prompt",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        high_resolution: { type: "boolean", default: false },
        provider: { type: "string", enum: ["anthropic", "openai"] },
        model: { type: "string" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "swimlanes.link_from_prompt",
    description:
      "Generate a view/edit link directly from a natural-language prompt",
    inputSchema: promptSchema,
  },
] as const;

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools as any,
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const name = req.params.name;
  const args = (req.params.arguments ?? {}) as any;
  switch (name) {
    case "swimlanes.generate_link": {
      const link = await generateDiagramLink(String(args.text));
      return textContent(link);
    }
    case "swimlanes.generate_image_link": {
      const link = await generateImageLink({
        text: String(args.text),
        high_resolution: Boolean(args.high_resolution),
      });
      return textContent(link);
    }
    case "swimlanes.generate_image": {
      const bytes = await downloadImage({
        text: String(args.text),
        high_resolution: Boolean(args.high_resolution),
      });
      return imageContent(bytes);
    }
    case "swimlanes.text_from_prompt": {
      const syntaxPath = resolve(process.cwd(), "syntax.md");
      const overview = await readFile(syntaxPath, "utf8");
      const text = await promptToSwimlanesText(String(args.prompt), overview, {
        provider: args.provider,
        model: args.model,
      });
      return textContent(text);
    }
    case "swimlanes.image_from_prompt": {
      const syntaxPath = resolve(process.cwd(), "syntax.md");
      const overview = await readFile(syntaxPath, "utf8");
      const text = await promptToSwimlanesText(String(args.prompt), overview, {
        provider: args.provider,
        model: args.model,
      });
      const bytes = await downloadImage({
        text,
        high_resolution: Boolean(args.high_resolution),
      });
      return imageContent(bytes);
    }
    case "swimlanes.link_from_prompt": {
      const syntaxPath = resolve(process.cwd(), "syntax.md");
      const overview = await readFile(syntaxPath, "utf8");
      const text = await promptToSwimlanesText(String(args.prompt), overview, {
        provider: args.provider,
        model: args.model,
      });
      const link = await generateDiagramLink(text);
      return textContent(link);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
