/**
 * Shared TypeScript interfaces for CareerStack extension
 */

// ─── Job Data ───────────────────────────────────────────────────

export interface JobData {
  url: string;
  platform: string;
  company: string;
  companyUrl?: string;
  position: string;
  salary: string;
  description: string;
  descriptionBlocks?: DescriptionBlock[];
  appLink: string;
  email?: string;
  warnings?: string[];
}

// ─── Description Parsing ────────────────────────────────────────

export interface RichTextSegment {
  text: string;
  annotations: TextAnnotations;
}

export interface TextAnnotations {
  bold: boolean;
  italic: boolean;
}

export interface DescriptionBlock {
  type: 'heading_2' | 'bulleted_list_item' | 'paragraph';
  richText: RichTextSegment[];
  content?: string;
}

export interface DescriptionResult {
  text: string;
  blocks: DescriptionBlock[];
}

// ─── AI Analysis ────────────────────────────────────────────────

export interface AIAnalysisData {
  email: string | null;
  score: number;
  summary: string;
}

export interface AIServiceResult {
  success?: boolean;
  data?: AIAnalysisData;
  error?: string;
  raw?: unknown;
}

// ─── Notion ─────────────────────────────────────────────────────

export interface NotionSaveData {
  company: string;
  companyUrl?: string;
  position: string;
  status: string;
  platform: string;
  salary: string;
  link: string;
  appLink: string;
  email?: string;
  score?: string;
  description: string;
  descriptionBlocks?: DescriptionBlock[];
  summary?: string;
}

export interface NotionSaveResult {
  success?: boolean;
  error?: string;
  url?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingUrl?: string;
  error?: string;
}

// ─── Selector Types ─────────────────────────────────────────────

export type SelectorList = readonly string[];

export interface LinkedInDetailSelectors {
  readonly title: SelectorList;
  readonly company: SelectorList;
  readonly companyAria: string;
  readonly salary: SelectorList;
  readonly description: SelectorList;
  readonly apply: SelectorList;
  readonly topCard: SelectorList;
}

export interface LinkedInSingleSelectors {
  readonly title: SelectorList;
  readonly company: SelectorList;
  readonly companyAria: string;
  readonly companyTopSection: SelectorList;
  readonly companyLink: string;
  readonly description: SelectorList;
}

export interface LinkedInSelectors {
  readonly container: SelectorList;
  readonly detail: LinkedInDetailSelectors;
  readonly single: LinkedInSingleSelectors;
  readonly directApply: string;
  readonly ldJson: string;
}

export interface IndeedSelectors {
  readonly title: SelectorList;
  readonly company: SelectorList;
  readonly salary: SelectorList;
  readonly description: SelectorList;
  readonly apply: SelectorList;
}

// ─── Chrome Messages ────────────────────────────────────────────

export interface ScrapeJobMessage {
  action: 'SCRAPE_JOB';
}

export interface AnalyzeJobMessage {
  action: 'ANALYZE_JOB';
  description: string;
}

export interface SaveToNotionMessage {
  action: 'SAVE_TO_NOTION';
  data: NotionSaveData;
}

export interface CheckDuplicateMessage {
  action: 'CHECK_DUPLICATE';
  url: string;
}

export type ExtensionMessage = ScrapeJobMessage | AnalyzeJobMessage | SaveToNotionMessage | CheckDuplicateMessage;

// ─── Settings ───────────────────────────────────────────────────

export interface SyncSettings {
  notionSecret: string;
  databaseId: string;
  aiProvider: 'gemini' | 'openai';
  aiKey: string;
  autoFetch: boolean;
}

export interface LocalSettings {
  masterResume: string;
}
