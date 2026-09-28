type ErrorClassification = {
  status: number
  code: string
  message: string
}

export function classifyError(err: any): ErrorClassification {
  const msg: string = err?.message ?? ''

  // Postgres/Supabase connection issues (paused project, network drop, timeout)
  if (
    err?.code === 'ECONNREFUSED' ||
    err?.code === 'ETIMEDOUT' ||
    err?.code === 'ENOTFOUND' ||
    /connection.*terminated|timeout|could not connect/i.test(msg)
  ) {
    return {
      status: 503,
      code: 'database_unavailable',
      message: 'The database is temporarily unavailable. It may be waking up from a paused state, try again in a few seconds.',
    }
  }

  // Postgres auth/config errors (wrong password, DB doesn't exist) — not a transient issue
  if (err?.code === '28P01' || err?.code === '3D000') {
    return {
      status: 500,
      code: 'database_config_error',
      message: 'There is a configuration issue on our end. We are looking into it.',
    }
  }

  // Groq SDK errors carry a `status` and `error.error.code`
  if (typeof err?.status === 'number') {
    const groqCode = err?.error?.error?.code

    if (err.status === 404 && groqCode === 'model_not_found') {
      return {
        status: 503,
        code: 'model_unavailable',
        message: 'The AI model is temporarily unavailable. We are working on a fix.',
      }
    }
    if (err.status === 401) {
      return {
        status: 500,
        code: 'ai_auth_error',
        message: 'There is a configuration issue with the AI service on our end.',
      }
    }
    if (err.status === 429) {
      return {
        status: 429,
        code: 'rate_limited',
        message: 'Too many requests right now. Please wait a moment and try again.',
      }
    }
    if (err.status >= 500) {
      return {
        status: 503,
        code: 'ai_service_down',
        message: 'The AI service is temporarily unavailable. Please try again shortly.',
      }
    }
  }

  // HuggingFace embedding/rerank failures throw plain Errors with the status embedded in the message
  if (/HuggingFace (embedding|rerank) failed/i.test(msg)) {
    return {
      status: 503,
      code: 'embedding_service_down',
      message: 'The search service is temporarily unavailable. Please try again shortly.',
    }
  }

  // Fallback — unknown error shape
  return {
    status: 500,
    code: 'unknown_error',
    message: 'Something went wrong. Please try again.',
  }
}