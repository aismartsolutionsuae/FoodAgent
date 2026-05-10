// ContentType выровнен со спекой !Слои агентов.md
// 'telegram_post' и 'instagram_post' добавлены — Buffer поддерживает их через прямые API
export type ContentType =
  | 'tweet'
  | 'linkedin_post'
  | 'instagram_post'
  | 'telegram_post'
  | 'reddit_reply'
  | 'seo_page'
  | 'ad_creative'
  | 'email_drip'
  | 'email_welcome'
  | 'email_reengagement'
  | 'tiktok_script'

export interface GenerateContentParams {
  promptName: string
  variables?: Record<string, string>
  projectId: string
  language?: 'ru' | 'en' | 'ar'
}

export interface ContentRequest {
  contentType: ContentType
  projectId: string
  promptName: string
  variables: Record<string, string>
  numVariations?: number          // по умолчанию 1; для ad_creative — 3–5
  expiresHours?: number           // по умолчанию 24
  postingMetadata?: {
    targetPlatform: string
    scheduledAt?: string
    bufferProfileId?: string
  }
}

export interface ContentDraft {
  id: string
  contentType: ContentType
  generated: string
  variations?: string[]
  metadata: Record<string, unknown>
  approvalId: string
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'published'
}

// ── Payload для каждого типа контента (хранятся в approval_queue.payload) ─────

export interface SocialPostPayload {
  text: string
  platform: ContentType
  bufferProfileId?: string
  generatedBy: string
}

export interface EmailPayload {
  subject: string
  html: string
  audience: 'all' | 'trial' | 'paid'
  projectId: string
  generatedBy: string
}

export interface AdCreativePayload {
  variations: string[]
  platform: 'meta_ads' | 'google_ads'
  campaignId?: string
  generatedBy: string
}

export interface SeoPagePayload {
  keyword: string
  content: string
  slug: string
  generatedBy: string
}

export type ApprovalPayload =
  | SocialPostPayload
  | EmailPayload
  | AdCreativePayload
  | SeoPagePayload
