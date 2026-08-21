import axios from 'axios';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AppError } from '../../middlewares/errorHandler';

export interface AIMessageInput {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProviderResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export class AIProvider {
  /**
   * Cleans AI generated text (e.g. removes reasoning <think>...</think> tags if generated)
   */
  public static cleanAIResponse(text: string): string {
    if (!text) return '';
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  }

  /**
   * Generates a dynamic AI completion with automatic multi-provider fallback.
   * Supports Groq, OpenAI, and Google Gemini.
   */
  public static async generateCompletion(
    messages: AIMessageInput[],
    options: {
      temperature?: number;
      maxTokens?: number;
      systemInstruction?: string;
    } = {}
  ): Promise<AIProviderResponse> {
    // In automated test runs, dynamically simulate model to prevent rate limits / token drain
    if (process.env.NODE_ENV === 'test') {
      const userMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
      const lower = userMsg.toLowerCase();

      let content = 'I am your dynamic Khalil AI tutor.';
      if (lower.includes('hello')) {
        content = "Hello! I'm your Khalil Academy learning assistant. What would you like to explore today?";
      } else if (lower.includes('pod')) {
        content = 'In Kubernetes, a Pod is the smallest deployable unit that encapsulates one or more containers sharing network and storage.';
      } else if (lower.includes('analogy')) {
        content = 'Think of a Pod like a shipping container that holds tightly coupled processes sharing the same address.';
      } else if (lower.includes('summarize')) {
        content = 'Summary of Kubernetes Pods:\n- Encapsulates containers\n- Shares localhost networking and volumes\n- Ephemeral lifecycle managed by controllers.';
      } else if (lower.includes('quiz')) {
        content = 'Which Kubernetes resource is the atomic building block that hosts containers?\nA) Service\nB) Pod\nC) ConfigMap\nD) Ingress';
      } else if (lower.includes('evaluation') || lower.includes('attempted') || lower.includes('answer')) {
        content = 'Correct! A Pod encapsulates containers and shares network/storage resources.';
      } else if (lower.includes('error') || lower.includes('yaml')) {
        content = 'Root cause: The apiVersion should match the resource type. For Pods, use apiVersion: v1 with valid container specs.';
      } else if (lower.includes('study plan') || lower.includes('goal')) {
        content = 'Your study plan:\n- Week 1: Linux & Docker Fundamentals\n- Week 2: Kubernetes Pods & Architecture\n- Week 3: High Availability Deployments';
      } else if (lower.includes('recommendation') || lower.includes('next')) {
        content = 'Recommendations:\n1. Review Pod Networking\n2. Practice kubectl commands\n3. Take the Module 1 Quiz';
      }

      return {
        content,
        provider: 'test_dynamic_engine',
        model: 'gpt-4o-mini',
        usage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
      };
    }

    const openaiKey = env.OPENAI_API_KEY || (env.AI_API_KEY.startsWith('sk-') ? env.AI_API_KEY : '');
    const groqKey = env.GROQ_API_KEY || (env.AI_API_KEY.startsWith('gsk_') ? env.AI_API_KEY : '');
    const geminiKey = env.GEMINI_API_KEY || (env.AI_API_KEY.startsWith('AIza') || env.AI_API_KEY.startsWith('AQ.') ? env.AI_API_KEY : '');

    const errors: string[] = [];

    // 1. Try Groq (Ultra-fast and active)
    if (groqKey) {
      const groqModels = [
        'qwen/qwen3.6-27b',
        'openai/gpt-oss-20b',
        'openai/gpt-oss-120b',
        'groq/compound-mini',
        'groq/compound',
        'allam-2-7b',
      ];
      for (const model of groqModels) {
        try {
          const response = await this.callOpenAICompatible(
            groqKey,
            'https://api.groq.com/openai/v1',
            model,
            messages,
            options
          );
          if (response) return response;
        } catch (err: any) {
          const msg = err.response?.data?.error?.message || err.message;
          errors.push(`Groq (${model}): ${msg}`);
        }
      }
    }

    // 2. Try OpenAI (gpt-4o-mini)
    if (openaiKey) {
      try {
        const response = await this.callOpenAICompatible(
          openaiKey,
          'https://api.openai.com/v1',
          'gpt-4o-mini',
          messages,
          options
        );
        if (response) return response;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        logger.warn(`OpenAI call failed (${msg}), attempting fallback...`);
        errors.push(`OpenAI: ${msg}`);
      }
    }

    // 3. Try Google Gemini
    if (geminiKey) {
      const geminiModels = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro', 'gemini-1.5-pro'];
      for (const model of geminiModels) {
        try {
          const response = await this.callGemini(geminiKey, model, messages, options);
          if (response) return response;
        } catch (err: any) {
          const msg = err.response?.data?.error?.message || err.message;
          errors.push(`Gemini (${model}): ${msg}`);
        }
      }
    }

    // If custom AI_BASE_URL is provided with AI_API_KEY
    if (env.AI_BASE_URL && env.AI_API_KEY) {
      try {
        const response = await this.callOpenAICompatible(
          env.AI_API_KEY,
          env.AI_BASE_URL,
          env.AI_MODEL || 'gpt-4o-mini',
          messages,
          options
        );
        if (response) return response;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message;
        errors.push(`Custom Provider: ${msg}`);
      }
    }

    // If no provider succeeded or no keys were configured
    if (errors.length > 0) {
      throw new AppError(`AI Service Error: ${errors.join(' | ')}`, 502);
    }

    throw new AppError(
      'Ask Khalil AI is not configured yet with an API key. Please add OPENAI_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY in backend/.env to enable live AI responses.',
      503
    );
  }

  /**
   * Call Google Gemini API
   */
  private static async callGemini(
    apiKey: string,
    model: string,
    messages: AIMessageInput[],
    options: { temperature?: number; maxTokens?: number; systemInstruction?: string }
  ): Promise<AIProviderResponse | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const systemMsg = messages.find((m) => m.role === 'system')?.content || options.systemInstruction || '';
    const nonSystemMsgs = messages.filter((m) => m.role !== 'system');

    const contents = nonSystemMsgs.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const payload: any = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
      },
    };

    if (systemMsg) {
      payload.systemInstruction = {
        parts: [{ text: systemMsg }],
      };
    }

    const res = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    const candidate = res.data?.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text;

    if (rawText) {
      const text = this.cleanAIResponse(rawText);
      return {
        content: text,
        provider: 'gemini',
        model,
        usage: {
          promptTokens: res.data?.usageMetadata?.promptTokenCount,
          completionTokens: res.data?.usageMetadata?.candidatesTokenCount,
          totalTokens: res.data?.usageMetadata?.totalTokenCount,
        },
      };
    }
    return null;
  }

  /**
   * Call OpenAI-compatible API (OpenAI, Groq, OpenRouter, Ollama, etc.)
   */
  private static async callOpenAICompatible(
    apiKey: string,
    baseUrl: string,
    model: string,
    messages: AIMessageInput[],
    options: { temperature?: number; maxTokens?: number; systemInstruction?: string }
  ): Promise<AIProviderResponse | null> {
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const formattedMessages = [...messages];
    if (options.systemInstruction && !formattedMessages.some((m) => m.role === 'system')) {
      formattedMessages.unshift({ role: 'system', content: options.systemInstruction });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await axios.post(
      url,
      {
        model,
        messages: formattedMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
      },
      {
        headers,
        timeout: 30000,
      }
    );

    const rawText = res.data?.choices?.[0]?.message?.content;
    if (rawText) {
      const text = this.cleanAIResponse(rawText);
      return {
        content: text,
        provider: baseUrl.includes('groq') ? 'groq' : 'openai',
        model,
        usage: {
          promptTokens: res.data?.usage?.prompt_tokens,
          completionTokens: res.data?.usage?.completion_tokens,
          totalTokens: res.data?.usage?.total_tokens,
        },
      };
    }
    return null;
  }
}
