import axios from 'axios';

export interface NormalizedApiError {
  message: string;
  status?: number;
  code?: string;
}

export function normalizeApiError(error: unknown, fallback = 'Something went wrong'): NormalizedApiError {
  if (axios.isAxiosError(error)) {
    const responseMessage = error.response?.data?.message;
    return {
      message: Array.isArray(responseMessage) ? responseMessage.join('\n') : responseMessage || error.message || fallback,
      status: error.response?.status,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return { message: error.message || fallback };
  }

  return { message: fallback };
}
