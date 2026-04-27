import type { UIMessage } from "ai";

export function getLastUserTextFromMessages(
  messages: UIMessage[]
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") {
      continue;
    }
    if (!m.parts || !Array.isArray(m.parts)) {
      return null;
    }
    const text = m.parts
      .filter(
        (part): part is { type: "text"; text: string } => part.type === "text"
      )
      .map((part) => part.text)
      .join("\n")
      .trim();
    return text || null;
  }
  return null;
}

export function getLastUserMessageId(
  messages: UIMessage[]
): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      return messages[i].id;
    }
  }
  return undefined;
}
