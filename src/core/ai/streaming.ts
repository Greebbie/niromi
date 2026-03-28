/**
 * Generic SSE parser. Reads a ReadableStream and yields parsed SSE events.
 */
export interface SSEEvent {
  event: string
  data: string
}

export async function* parseSSE(stream: ReadableStream<Uint8Array>): AsyncIterable<SSEEvent> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  // Carry partial event state across chunks
  let currentEvent = ''
  let currentData = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          // Concatenate multi-line data fields
          currentData += (currentData ? '\n' : '') + line.slice(6)
        } else if (line === '') {
          if (currentData) {
            yield { event: currentEvent, data: currentData }
            currentEvent = ''
            currentData = ''
          }
        }
      }
    }

    // Handle any remaining data in the buffer after stream ends
    if (buffer.trim()) {
      const lines = buffer.split(/\r?\n/)
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          currentData += (currentData ? '\n' : '') + line.slice(6)
        }
      }
    }
    // Flush any remaining partial event
    if (currentData) {
      yield { event: currentEvent, data: currentData }
    }
  } finally {
    reader.releaseLock()
  }
}
