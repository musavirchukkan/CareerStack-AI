import { describe, it, expect } from 'vitest';
import selectors from '../src/config/selectors.json';

const REQUIRED_FIELDS = ['position', 'company', 'salary', 'description', 'appLink'];

describe('Selector Configuration Validation (selectors.json)', () => {
  it('should have a top-level version string', () => {
    expect(selectors.version).toBeDefined();
    expect(typeof selectors.version).toBe('string');
  });

  const platforms = ['linkedin', 'indeed'];

  platforms.forEach((platform) => {
    describe(`${platform} selectors`, () => {
      const platformSelectors = (selectors as any)[platform];

      it(`should exist in the config`, () => {
        expect(platformSelectors).toBeDefined();
      });

      REQUIRED_FIELDS.forEach((field) => {
        it(`should have at least one valid selector for '${field}'`, () => {
          const fieldSelectors = platformSelectors[field];
          expect(fieldSelectors).toBeDefined();
          expect(Array.isArray(fieldSelectors)).toBe(true);
          expect(fieldSelectors.length).toBeGreaterThan(0);

          // Ensure all selectors are non-empty strings
          fieldSelectors.forEach((selector: string) => {
            expect(typeof selector).toBe('string');
            expect(selector.trim().length).toBeGreaterThan(0);
          });
        });
      });

      it(`should have optional companyUrl selectors if defined`, () => {
        if (platformSelectors.companyUrl) {
          expect(Array.isArray(platformSelectors.companyUrl)).toBe(true);
          platformSelectors.companyUrl.forEach((selector: string) => {
            expect(typeof selector).toBe('string');
            expect(selector.trim().length).toBeGreaterThan(0);
          });
        }
      });
    });
  });
});
