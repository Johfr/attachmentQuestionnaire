type OpenAiTextResponsePayload = {
  apiKey: string
  model: string
  instructions: string
  input: string
  reasoningEffort?: string
  maxOutputTokens?: number
  promptCacheKey?: string
  promptCacheRetention?: 'in_memory' | '24h' | string
}

type OpenAiResponseShape = {
  id?: string
  output_text?: string
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
}

const extractOutputText = (response: OpenAiResponseShape) => {
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim()
  }

  const text = response.output
    ?.flatMap(item => item.content ?? [])
    .filter(item => item.type === 'output_text' || item.type === 'text')
    .map(item => item.text ?? '')
    .join('\n')
    .trim()

  return text || ''
}

export const createOpenAiTextResponse = async ({
  apiKey,
  model,
  instructions,
  input,
  reasoningEffort = 'low',
  maxOutputTokens = 1800,
  promptCacheKey,
  promptCacheRetention,
}: OpenAiTextResponsePayload) => {
  const body: Record<string, unknown> = {
    model,
    instructions,
    input,
    reasoning: { effort: reasoningEffort },
    max_output_tokens: maxOutputTokens,
  }

  if (promptCacheKey) {
    body.prompt_cache_key = promptCacheKey
  }

  if (promptCacheRetention) {
    body.prompt_cache_retention = { type: promptCacheRetention }
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`OpenAI request failed (${response.status}): ${errorBody}`)
  }

  const payload = await response.json() as OpenAiResponseShape
  const outputText = extractOutputText(payload)

  if (!outputText) {
    throw new Error('OpenAI returned an empty response.')
  }

  return {
    requestId: payload.id ?? null,
    outputText,
  }
}
