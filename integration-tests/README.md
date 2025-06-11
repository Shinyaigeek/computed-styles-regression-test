# CSSOM Regression Test Integration Tests

This package contains comprehensive integration tests for the CSSOM regression testing utility using static HTML fixtures.

## Test Structure

### Test Files

- **`basic-layout.spec.ts`** - Tests basic CSS layout properties, grid/flexbox layouts, and responsive behavior
- **`flexbox-grid.spec.ts`** - Advanced CSS Grid and Flexbox layout testing with complex nested structures
- **`transform-animation.spec.ts`** - CSS transforms, animations, filters, and 3D effects testing
- **`cross-browser.spec.ts`** - Cross-browser compatibility testing for consistent CSSOM behavior
- **`performance.spec.ts`** - Performance testing with large DOMs, deep nesting, and complex CSS

### HTML Fixtures

- **`basic-layout.html`** - Simple responsive layout with header, navigation, content grid, and footer
- **`flexbox-grid.html`** - Complex layout combining CSS Grid and Flexbox with modern design patterns
- **`transform-animation.html`** - Comprehensive CSS transforms, animations, and filter effects showcase

## Running Tests

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Run tests with UI
pnpm run test:ui

# Run tests in headed mode (see browser)
pnpm run test:headed
```

## Test Categories

### Layout Tests
- Container and responsive layout testing
- CSS Grid properties and areas
- Flexbox alignment and distribution
- Nested layout structures

### Style Tests
- Computed style accuracy
- Background, border, padding, margin properties
- Color and typography properties
- Position and z-index handling

### Transform Tests
- 2D transforms (rotate, scale, translate, skew)
- 3D transforms and perspective
- Matrix transforms
- Transform combinations

### Animation Tests
- CSS animation properties
- Keyframe animations
- Transition properties
- Animation timing and iteration

### Filter Tests
- CSS filter effects (blur, brightness, contrast, etc.)
- Combined filter effects
- Browser-specific filter support

### Regression Tests
- Before/after snapshot comparisons
- Style modification detection
- Layout change detection
- Cross-browser consistency

### Performance Tests
- Large DOM handling (100+ elements)
- Deep nesting performance (20+ levels)
- Multiple complex selectors
- Rapid successive snapshots
- Memory-intensive operations
- Comparison performance with large snapshots

## Test Scenarios

### Responsive Testing
Tests verify layout behavior across different viewport sizes:
- Desktop: 1920x1080, 1200x800
- Tablet: 768x1024
- Mobile: 375x667

### Cross-Browser Testing
Tests run across multiple browser engines to ensure consistent CSSOM behavior:
- Chromium-based browsers
- Firefox (if configured)
- WebKit/Safari (if configured)

### Change Detection
Tests verify the utility can detect various types of changes:
- Style property modifications
- Layout structural changes
- Animation and transform updates
- Filter effect changes

## Expected Behavior

The tests are designed to work with the current CSSOM regression test utility implementation. Note that some tests may not pass initially as they test the ideal behavior of the utility.

### Known Limitations
- Some CSS properties may not be captured depending on browser support
- Complex pseudo-element styles might not be fully captured
- Browser-specific vendor prefixes may vary
- Performance benchmarks may need adjustment based on hardware

## Debugging

- Use `--headed` flag to see tests running in browser
- Use `--ui` flag for interactive test debugging
- Check browser console for detailed error messages
- Screenshots and videos are captured on test failures

## Contributing

When adding new tests:
1. Create descriptive test names
2. Include performance expectations
3. Test both positive and negative scenarios
4. Document any browser-specific behavior
5. Use the static HTML fixtures or create new ones as needed