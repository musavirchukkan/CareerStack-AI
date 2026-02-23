import { describe, it, expect } from 'vitest';
import { extractJobDescription } from '../src/utils/dom-utils';

describe('extractJobDescription', () => {
  it('should extract plain text from simple DOM elements', () => {
    document.body.innerHTML = `
            <div id="job">
                <p>Hello World</p>
                <ul>
                    <li>React</li>
                    <li>Node</li>
                </ul>
            </div>
        `;
    const el = document.getElementById('job')!;
    const result = extractJobDescription(el);

    expect(result.text).toContain('Hello World');
    expect(result.text).toContain('React');
    expect(result.text).toContain('Node');
  });

  it('should create correctly formatted blocks for Notion', () => {
    document.body.innerHTML = `
            <div id="job">
                <h2>Requirements</h2>
                <ul>
                    <li>5+ years experience</li>
                </ul>
                <p><strong>Strong</strong> communication skills.</p>
            </div>
        `;
    const el = document.getElementById('job')!;
    const result = extractJobDescription(el);

    expect(result.blocks.length).toBe(3);
    expect(result.blocks[0].type).toBe('heading_2');
    expect(result.blocks[0].richText[0].text).toContain('Requirements');

    expect(result.blocks[1].type).toBe('bulleted_list_item');
    expect(result.blocks[1].richText[0].text).toContain('5+ years experience');

    expect(result.blocks[2].type).toBe('paragraph');
    expect(result.blocks[2].richText[0].text).toContain('Strong');
    expect(result.blocks[2].richText[0].annotations?.bold).toBe(true);
  });
});
