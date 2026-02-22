import { describe, it, expect } from 'vitest';
import { NotionService } from '../src/services/NotionService';
import type { DescriptionBlock } from '../src/types';

describe('NotionService', () => {
    describe('chunkTextToBlocks', () => {
        it('should chunk large text into multiple paragraph blocks', () => {
            const text = 'A'.repeat(5000);
            const blocks = NotionService.chunkTextToBlocks(text) as any[];

            expect(blocks.length).toBe(3);
            expect(blocks[0].paragraph.rich_text[0].text.content.length).toBe(2000);
            expect(blocks[1].paragraph.rich_text[0].text.content.length).toBe(2000);
            expect(blocks[2].paragraph.rich_text[0].text.content.length).toBe(1000);
            expect(blocks[0].type).toBe('paragraph');
        });

        it('should handle small strings normally', () => {
            const str = 'Small string';
            const blocks = NotionService.chunkTextToBlocks(str) as any[];
            expect(blocks.length).toBe(1);
            expect(blocks[0].paragraph.rich_text[0].text.content).toBe(str);
        });
    });

    describe('createBlock', () => {
        it('converts a heading block properly', () => {
            const block: DescriptionBlock = {
                type: 'heading_2',
                richText: [{ text: 'Section Title', annotations: { bold: false, italic: false } }]
            };

            const notionBlock = NotionService.createBlock(block) as any;
            expect(notionBlock.type).toBe('heading_3'); // Maps heading_2 to heading_3 internally
            expect(notionBlock.heading_3.rich_text[0].text.content).toBe('Section Title');
        });

        it('preserves text annotations', () => {
            const block: DescriptionBlock = {
                type: 'paragraph',
                richText: [{ text: 'Bold Text', annotations: { bold: true, italic: false } }]
            };

            const notionBlock = NotionService.createBlock(block) as any;
            expect(notionBlock.type).toBe('paragraph');
            expect(notionBlock.paragraph.rich_text[0].annotations.bold).toBe(true);
            expect(notionBlock.paragraph.rich_text[0].annotations.italic).toBe(false);
        });
    });
});
