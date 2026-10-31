/** Require the backend completion marker; a dropped stream is never a successful result. */
export async function consumeToolStream(
  response: Response,
  onEvent: (event: Record<string, unknown>) => void,
) {
  if (!response.ok) {
    const d = await response.json().catch(() => ({}));
    throw Error(d.error ?? d.code ?? `HTTP ${response.status}`);
  }
  if (!response.body) throw Error("EMPTY_STREAM");
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let buffer = "",
    complete = false,
    text = "";
  const process = (frame: string) => {
    for (const line of frame.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (raw === "[DONE]") {
        complete = true;
        continue;
      }
      if (!raw) continue;
      const event = JSON.parse(raw) as Record<string, unknown>;
      if (event.error) throw Error(String(event.error));
      if (typeof event.text === "string") text += event.text;
      onEvent(event);
    }
  };
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer = (buffer + decoder.decode(chunk.value, { stream: true })).replace(
        /\r\n/g,
        "\n",
      );
      let index;
      while ((index = buffer.indexOf("\n\n")) >= 0) {
        process(buffer.slice(0, index));
        buffer = buffer.slice(index + 2);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) process(buffer);
    if (!complete) throw Error("STREAM_INTERRUPTED");
    if (!text.trim()) throw Error("EMPTY_RESULT");
    return text;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
