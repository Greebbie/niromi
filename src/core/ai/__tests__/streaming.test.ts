import { parseSSE } from '../streaming'
import type { SSEEvent } from '../streaming'

function createStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

async function collectEvents(stream: ReadableStream<Uint8Array>): Promise<SSEEvent[]> {
  const events: SSEEvent[] = []
  for await (const event of parseSSE(stream)) {
    events.push(event)
  }
  return events
}

describe('parseSSE', () => {
  it('parses a single complete event', async () => {
    const events = await collectEvents(createStream(['data: hello\n\n']))
    expect(events).toEqual([{ event: '', data: 'hello' }])
  })

  it('parses event with event field', async () => {
    const events = await collectEvents(createStream(['event: message\ndata: hello\n\n']))
    expect(events).toEqual([{ event: 'message', data: 'hello' }])
  })

  it('concatenates multi-line data fields', async () => {
    const events = await collectEvents(createStream(['data: line1\ndata: line2\n\n']))
    expect(events).toEqual([{ event: '', data: 'line1\nline2' }])
  })

  it('parses multiple events in one chunk', async () => {
    const events = await collectEvents(
      createStream(['data: first\n\ndata: second\n\n'])
    )
    expect(events).toHaveLength(2)
    expect(events[0].data).toBe('first')
    expect(events[1].data).toBe('second')
  })

  it('handles data split across two chunks', async () => {
    const events = await collectEvents(
      createStream(['data: hel', 'lo\n\n'])
    )
    expect(events).toEqual([{ event: '', data: 'hello' }])
  })

  it('yields nothing for empty stream', async () => {
    const events = await collectEvents(createStream([]))
    expect(events).toEqual([])
  })

  it('flushes trailing data without final newline', async () => {
    const events = await collectEvents(createStream(['data: trailing']))
    expect(events).toEqual([{ event: '', data: 'trailing' }])
  })

  it('carries event field across chunks', async () => {
    const events = await collectEvents(
      createStream(['event: message\n', 'data: hello\n\n'])
    )
    expect(events).toEqual([{ event: 'message', data: 'hello' }])
  })

  it('yields data: [DONE] as a normal event', async () => {
    const events = await collectEvents(createStream(['data: [DONE]\n\n']))
    expect(events).toEqual([{ event: '', data: '[DONE]' }])
  })
})
