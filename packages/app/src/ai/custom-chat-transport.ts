import { buildReadingPrompt } from "@/constants/prompt";
import type { ChatContext } from "@/hooks/use-chat-state";
import { useAppSettingsStore } from "@/store/app-settings-store";
import { useLlamaStore } from "@/store/llama-store";
import { logTimingError, logTimingInfo } from "@/utils/timing-log";
import type { UIMessage } from "@ai-sdk/react";
import {
  type ChatRequestOptions,
  type ChatTransport,
  type LanguageModel,
  type PrepareSendMessagesRequest,
  type UIMessageChunk,
  convertToModelMessages,
  stepCountIs,
  streamText,
} from "ai";
import {
  createRagContextTool,
  createRagSearchTool,
  createRagTocTool,
  getBooksTool,
  getReadingStatsTool,
  getSkillsTool,
  mindmapTool,
  notesTool,
  createWebSearchTool,
  exportToObsidianTool,
  saveMemoryTool,
  bookSearchTool,
} from "./tools";
import { processQuoteMessages, selectValidMessages } from "./utils";

const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

function extractPlainTextFromMessage(message?: UIMessage): string {
  if (!message?.parts) return "";

  return message.parts
    .map((part: any) => {
      if ((part.type === "text" || part.type === "quote") && typeof part.text === "string") {
        return part.text;
      }
      return "";
    })
    .join("\n")
    .trim();
}

function shouldExposeBookSearch(userText: string): boolean {
  const text = userText.replace(/\s+/g, "");
  if (!text) return false;

  const explicitExternalPatterns = [
    /外部书(源|库)/i,
    /联网(找|搜|查)/i,
    /openlibrary/i,
    /isbn/i,
    /出版社/,
    /出版年/,
    /封面/,
    /页数/,
    /这本书.*(信息|资料|元信息)/,
    /(搜|查)(一下)?《[^》]+》/,
    /《[^》]+》.*(存在|有没有|是谁写的|哪年出版)/,
  ];

  if (explicitExternalPatterns.some((pattern) => pattern.test(text))) {
    return true;
  }

  const memoryOrPreferencePatterns = [
    /根据.*(记忆|阅读记忆|书单|偏好|读过|看过|在读)/,
    /推荐.*(适合我|给我|我会喜欢|下一本|新书)/,
    /我.*(读过|看过|在读|喜欢).*(书|作者)/,
  ];

  if (memoryOrPreferencePatterns.some((pattern) => pattern.test(text))) {
    return false;
  }

  return false;
}

export class CustomChatTransport implements ChatTransport<UIMessage> {
  private model: LanguageModel;
  private prepareSendMessagesRequest?: PrepareSendMessagesRequest<UIMessage>;

  constructor(
    model: LanguageModel,
    options?: {
      prepareSendMessagesRequest?: PrepareSendMessagesRequest<UIMessage>;
    },
  ) {
    this.model = model;
    this.prepareSendMessagesRequest = options?.prepareSendMessagesRequest;
  }

  updateModel(model: LanguageModel) {
    this.model = model;
  }

  async sendMessages(
    options: {
      chatId: string;
      messages: UIMessage[];
      abortSignal: AbortSignal | undefined;
    } & {
      trigger: "submit-message" | "regenerate-message";
      messageId: string | undefined;
    } & ChatRequestOptions,
  ): Promise<ReadableStream<UIMessageChunk>> {
    const requestStartAt = nowMs();
    const requestId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let requestBody = options.body;

    if (this.prepareSendMessagesRequest) {
      const prepared = await this.prepareSendMessagesRequest({
        id: options.chatId,
        messages: options.messages,
        requestMetadata: options.metadata,
        body: options.body as Record<string, any> | undefined,
        credentials: undefined,
        headers: options.headers,
        api: "",
        trigger: options.trigger,
        messageId: options.messageId,
      });

      requestBody = prepared.body;
    }

    const chatContext = { ...(((requestBody as any)?.chatContext as ChatContext | undefined) ?? {}) };
    const activeBookId = chatContext?.activeBookId;

    const lastUserMessage = options.messages.filter((message) => message.role === "user").pop();
    const lastUserText = extractPlainTextFromMessage(lastUserMessage);
    if (lastUserMessage?.parts) {
      const quoteTexts = lastUserMessage.parts
        .filter((part: any) => part.type === "quote")
        .map((part: any) => part.text)
        .filter((text: unknown): text is string => typeof text === "string" && text.trim().length > 0);

      if (quoteTexts.length > 0) {
        chatContext.activeSelectionText = quoteTexts.join("\n---\n");
      }
    }

    const processedMessages = processQuoteMessages(options.messages);
    const selectedMessages = selectValidMessages(processedMessages, 8);

    const hasVectorCapability = useLlamaStore.getState().hasVectorCapability();
    const tavilyApiKey = useAppSettingsStore.getState().settings.tavilyApiKey?.trim();

    const tools: any = {
      notes: notesTool,
      getBooks: getBooksTool,
      getReadingStats: getReadingStatsTool,
      getSkills: getSkillsTool,
      mindmap: mindmapTool,
      exportToObsidian: exportToObsidianTool,
      saveMemory: saveMemoryTool,
    };

    if (shouldExposeBookSearch(lastUserText)) {
      tools.bookSearch = bookSearchTool;
    }

    if (tavilyApiKey) {
      tools.webSearch = createWebSearchTool(tavilyApiKey);
    }

    if (hasVectorCapability && activeBookId) {
      tools.ragSearch = createRagSearchTool(activeBookId);
      tools.ragToc = createRagTocTool(activeBookId);
      tools.ragContext = createRagContextTool(activeBookId);
    }

    logTimingInfo("[ChatTiming] request_prepared", {
      requestId,
      trigger: options.trigger,
      totalMessages: options.messages.length,
      selectedMessages: selectedMessages.length,
      toolCount: Object.keys(tools).length,
      hasActiveBook: Boolean(activeBookId),
    });

    const convertedMessages = convertToModelMessages(selectedMessages, {
      tools,
      ignoreIncompleteToolCalls: true,
    });

    const promptStartAt = nowMs();
    const systemPrompt = await buildReadingPrompt(chatContext, options.messages.length, {
      requestId,
    });
    const promptMs = nowMs() - promptStartAt;

    logTimingInfo("[ChatTiming] prompt_ready", {
      requestId,
      promptMs: Math.round(promptMs),
      systemPromptChars: systemPrompt.length,
      elapsedMs: Math.round(nowMs() - requestStartAt),
    });

    const streamCreateStartAt = nowMs();
    const result = streamText({
      model: this.model,
      messages: convertedMessages,
      abortSignal: options.abortSignal,
      toolChoice: "auto",
      stopWhen: stepCountIs(20),
      tools,
      system: systemPrompt,
    });

    logTimingInfo("[ChatTiming] stream_created", {
      requestId,
      streamCreateMs: Math.round(nowMs() - streamCreateStartAt),
      elapsedMs: Math.round(nowMs() - requestStartAt),
    });

    const uiStream = result.toUIMessageStream({
      onError: (error) => {
        console.log("error", error);
        if (error == null) {
          return "Unknown error";
        }
        if (typeof error === "string") {
          return error;
        }
        if (error instanceof Error) {
          return error.message;
        }
        return JSON.stringify(error);
      },
      messageMetadata: ({ part }) => {
        if (part.type === "finish") {
          return {
            totalUsage: part.totalUsage,
          };
        }
      },
    });

    let firstChunkLogged = false;

    return new ReadableStream<UIMessageChunk>({
      async start(controller) {
        const reader = uiStream.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              logTimingInfo("[ChatTiming] stream_completed", {
                requestId,
                firstChunkSeen: firstChunkLogged,
                elapsedMs: Math.round(nowMs() - requestStartAt),
              });
              controller.close();
              break;
            }

            if (!firstChunkLogged) {
              firstChunkLogged = true;
              logTimingInfo("[ChatTiming] first_chunk", {
                requestId,
                elapsedMs: Math.round(nowMs() - requestStartAt),
              });
            }

            controller.enqueue(value);
          }
        } catch (error) {
          logTimingError("[ChatTiming] stream_failed", {
            requestId,
            elapsedMs: Math.round(nowMs() - requestStartAt),
            error,
          });
          controller.error(error);
        }
      },
      async cancel(reason) {
        await uiStream.cancel(reason);
      },
    });
  }

  async reconnectToStream(
    _options: {
      chatId: string;
    } & ChatRequestOptions,
  ): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}
