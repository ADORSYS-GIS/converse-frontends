# Victory Native XL Usage Page Feature
## Test-First Phased Execution Plan

**Plan ID:** `victory-usage-page-tdd`  
**Version:** 1.0.0  
**Generated:** 2026-04-02  
**Estimated Duration:** 12-16 hours

---

## Executive Summary

This document provides a comprehensive test-first implementation strategy for the Victory Native XL usage page feature. It follows strict Test-Driven Development (TDD) principles, writing all tests before implementation, and adheres to the 4-Layer MVC architecture defined in AGENTS.md.

### Selected Path
**Victory Native XL Ecosystem with Security Controls**

### Key Decisions
- **Charts:** Victory Native XL for cross-platform compatibility
- **Validation:** Zod for runtime type safety and input sanitization
- **Security:** DOMPurify for label/tooltip sanitization
- **Architecture:** Strict 4-layer MVC with CVA-pattern UI components

### Canonical Plan Location
`.opencode/state/victory-usage-page-tdd.json`

---

## Problem Summary

Implement a comprehensive usage analytics page featuring:
- Line and bar charts for token consumption visualization
- Interactive date range selection with preset options
- Metric type selection via dropdown
- Real-time data fetching via TanStack Query
- Security-hardened rendering with DOMPurify sanitization
- Cross-platform support (React Native + Web)
- Full accessibility compliance (ARIA labels, keyboard navigation)

---

## Selected Path Summary

### Architecture Compliance
| Constraint | Implementation |
|------------|----------------|
| 4-Layer MVC | View (usage-view.tsx) → Service (useQueryUsage) → API (api-rest) → i18n |
| CVA Pattern | All components: `cva.tsx`, `types.tsx`, `component.tsx`, `index.tsx` |
| Semantic Tokens | Only theme tokens (primary, secondary, ink, surface, etc.) |
| Cross-Platform | Victory Native XL + platform-specific select implementations |
| TanStack Query | Data fetching via existing `useQueryUsage` hook |
| TypeScript Strict | Strict mode enabled; no `any` types |

### Security Requirements
| Requirement | Implementation |
|-------------|----------------|
| Label/Tooltip Sanitization | DOMPurify on all user-facing chart labels |
| Input Validation | Zod schemas for all query parameters |
| Dependency Pinning | Exact versions in package.json |
| No dangerouslySetInnerHTML | Strict lint rule; verified in tests |

---

## User-Visible Acceptance Criteria

### Functional Requirements
1. **Chart Display:** Users can view token usage as line or bar charts
2. **Date Range Selection:** Users can select from presets (Last 7 days, 30 days, 90 days) or custom range
3. **Metric Selection:** Users can switch between different usage metrics (tokens, requests, etc.)
4. **Real-time Updates:** Chart updates automatically when filters change
5. **Loading States:** Clear visual feedback during data fetching
6. **Error Handling:** Graceful error display with retry option

### Non-Functional Requirements
1. **Performance:** Initial render < 100ms, chart updates < 500ms
2. **Accessibility:** WCAG 2.1 AA compliance (keyboard navigation, screen readers)
3. **Security:** No XSS vulnerabilities; all inputs sanitized
4. **Cross-Platform:** Identical behavior on iOS, Android, and Web

---

## First Failing Tests (Phase 1-2)

These tests must be written FIRST, before any implementation:

### Test 1: Infrastructure Validation
```typescript
// packages/ui/src/components/__tests__/test-setup.validation.test.tsx
describe('Test Infrastructure', () => {
  it('should have Jest configured with TypeScript strict mode', () => {
    // Arrange
    const tsConfig = require('../../tsconfig.json');
    
    // Assert
    expect(tsConfig.compilerOptions.strict).toBe(true);
  });

  it('should render NativeWind components in test environment', () => {
    // Arrange
    const { render } = require('@testing-library/react-native');
    const { Text } = require('@lightbridge/ui');
    
    // Act
    const { getByText } = render(<Text>Test</Text>);
    
    // Assert
    expect(getByText('Test')).toBeTruthy();
  });
});
```

### Test 2: Security Dependencies
```typescript
// packages/ui/src/components/__tests__/security-dependencies.validation.test.ts
describe('Security Dependencies', () => {
  it('should have DOMPurify installed and working', () => {
    // Arrange
    const DOMPurify = require('isomorphic-dompurify');
    const malicious = '<img src=x onerror=alert(1)>';
    
    // Act
    const clean = DOMPurify.sanitize(malicious);
    
    // Assert
    expect(clean).not.toContain('onerror');
  });

  it('should have Zod installed for validation', () => {
    // Arrange & Act
    const { z } = require('zod');
    const schema = z.string().min(1);
    
    // Assert
    expect(() => schema.parse('')).toThrow();
  });
});
```

---

## Summary

This plan establishes:
- **8 Phases** from infrastructure to E2E testing
- **63 Tasks** with clear dependencies and verification steps
- **Strict TDD workflow**: Tests written before implementation
- **Security-first approach**: DOMPurify and Zod from day one
- **Cross-platform compatibility**: Victory Native XL for RN + Web
- **Full accessibility**: ARIA labels, keyboard navigation
- **Resumable execution**: JSON state file for progress tracking

### Next Steps

1. Execute Phase 1: Install testing infrastructure
2. Write first failing tests for validation schemas
3. Implement incrementally following the canonical plan
4. Run validation commands at each phase exit
5. Update task status in JSON file as work progresses

### Resume Instructions

To resume work:
```bash
# Check current status
cat .opencode/state/victory-usage-page-tdd.json | jq '.phases[] | {id, status}'

# Find next pending task
cat .opencode/state/victory-usage-page-tdd.json | jq '.tasks[] | select(.status == "pending") | .id' | head -1

# Run tests for current phase
pnpm test:unit --testPathPattern=<phase-specific-pattern>
```

---

## Fixtures, Mocks, and Test Data

### Sample Usage Data (for tests)
```typescript
export const mockUsageData = [
  { bucket_start: '2026-01-01T00:00:00Z', total_tokens: 1500, request_count: 45 },
  { bucket_start: '2026-01-02T00:00:00Z', total_tokens: 2300, request_count: 67 },
  { bucket_start: '2026-01-03T00:00:00Z', total_tokens: 1800, request_count: 52 },
];

export const maliciousXSSPayloads = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  '<svg onload=alert(1)>',
];
```

### Test Utilities
```typescript
// packages/ui/src/test-utils/cva-test-helper.ts
export function expectCvaVariants(
  variantsFn: Function,
  testCases: Array<[string, string, string]>
) {
  testCases.forEach(([prop, value, expectedClasses]) => {
    const result = variantsFn({ [prop]: value });
    expectedClasses.split(' ').forEach(cls => {
      expect(result).toContain(cls);
    });
  });
}
```

---

## Definition of Done

- [ ] All 63 tasks completed
- [ ] All phases exit criteria met
- [ ] Unit test coverage > 80%
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Security audit passed
- [ ] Accessibility audit passed
- [ ] Cross-platform build successful
- [ ] No TypeScript errors (strict mode)
- [ ] All i18n keys translated
- [ ] Documentation updated

---

*Generated by TDD Agent on 2026-04-02*
