# Design System

Source: [website - Figma](https://www.figma.com/design/jwxO5SuJOWn043A7A5BHPR/website?node-id=101-227&m=dev)

This document records the Web page type system used by the website implementation.

## Web Type System

All inspected Web text styles use `Wanted Sans Variable`.

| Style | Font size | Weight | Line height | Letter spacing | Color |
| --- | ---: | ---: | ---: | ---: | --- |
| Main | 20px | 600 | 145% / 29px | -0.8px | `#FFFFFF` |
| Sub | 20px | 600 | 145% / 29px | -0.8px | `#FFFFFF` |
| Display Font | 12px | 500 | 135% / 16.2px | -0.24px | `#B3B8E2` |
| System font | 12px | 500 | 135% / 16.2px | -0.24px | `#B3B8E2` |
| Wanted Sans Variable | 24px | 600 | 135% / 32.4px | -0.72px | `#FFFFFF` |

### CSS Reference

```css
:root {
  --font-family-web: "Wanted Sans Variable", sans-serif;
  --color-text-primary: #ffffff;
  --color-text-secondary: #b3b8e2;
}

.type-main,
.type-sub {
  font-family: var(--font-family-web);
  font-size: 20px;
  font-style: normal;
  font-weight: 600;
  line-height: 145%;
  letter-spacing: -0.8px;
  color: var(--color-text-primary);
}

.type-display,
.type-system {
  font-family: var(--font-family-web);
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
  line-height: 135%;
  letter-spacing: -0.24px;
  color: var(--color-text-secondary);
}

.type-wanted-sans-variable {
  font-family: var(--font-family-web);
  font-size: 24px;
  font-style: normal;
  font-weight: 600;
  line-height: 135%;
  letter-spacing: -0.72px;
  color: var(--color-text-primary);
}
```

## Existing Project Tokens

These values are currently used by the landing page and should remain the source of truth until the remaining Figma visual tokens are documented.

| Token | Value | Usage |
| --- | --- | --- |
| Page background | `#B59CE8` | Body fallback background |
| Header surface | `rgba(255, 255, 255, 0.15)` | Glass header background |
| Body font fallback | `"Wanted Sans", "Noto Sans KR", sans-serif` | Existing CSS fallback stack |

## Implementation Notes

- Use the Web type styles for the Background tab and its related content.
- Keep letter spacing values exactly as specified; do not introduce additional negative tracking.
- The Figma source remains authoritative if the design system changes.
