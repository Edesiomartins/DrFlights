type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcSuccess = {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

/**
 * Minimal MCP-over-HTTP client (JSON-RPC + SSE).
 * Used only as a free flight data transport — not as a product dependency on Claude/MCP tooling.
 */
export async function callMcpTool(
  endpoint: string,
  toolName: string,
  args: Record<string, unknown>,
  signal: AbortSignal,
): Promise<unknown> {
  const body: JsonRpcRequest = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: { name: toolName, arguments: args },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MCP HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  const raw = await response.text();
  const payload = parseSseOrJson(raw);

  if (payload.error) {
    throw new Error(`MCP error ${payload.error.code}: ${payload.error.message}`);
  }

  const result = payload.result as
    | { content?: Array<{ type?: string; text?: string }>; isError?: boolean; structuredContent?: unknown }
    | undefined;

  if (!result) return null;

  if (result.isError) {
    const msg =
      result.content?.map((c) => c.text).filter(Boolean).join(" ") ||
      "Erro no tool MCP";
    throw new Error(msg);
  }

  if (result.structuredContent != null) return result.structuredContent;

  const texts = (result.content ?? [])
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text!);

  if (texts.length === 0) return result;

  const joined = texts.join("\n");
  try {
    return JSON.parse(joined) as unknown;
  } catch {
    // Some tools return markdown; try to extract a JSON block.
    const match = joined.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as unknown;
      } catch {
        /* fall through */
      }
    }
    return { rawText: joined };
  }
}

function parseSseOrJson(raw: string): JsonRpcSuccess {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed) as JsonRpcSuccess;
  }

  const dataLines = trimmed
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, ""));

  if (dataLines.length === 0) {
    throw new Error("Resposta MCP vazia ou inválida.");
  }

  // Prefer the last JSON-RPC message (some servers stream multiple events).
  for (let i = dataLines.length - 1; i >= 0; i--) {
    const line = dataLines[i];
    if (!line) continue;
    try {
      return JSON.parse(line) as JsonRpcSuccess;
    } catch {
      /* continue */
    }
  }

  throw new Error("Não foi possível interpretar a resposta MCP.");
}
