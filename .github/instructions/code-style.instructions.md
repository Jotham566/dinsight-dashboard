---
applyTo: '**'
---

## Context

This guide defines default code formatting and style rules applied across all product codebases. Individual projects may extend or override these in `.agent-os/product/code-style.md`.

The goal is to ensure **consistency**, **readability**, and **maintainability**, regardless of language or framework. Consistent code formatting promotes industry-proven programming practices that increase engineering efficiency and enables better collaboration across diverse teams.

---

## General Principles

### 📖 Readability First
* The primary purpose of coding standards is to create readable code that is easy to review and maintain
* Code should be self-documenting through clear structure and naming
* Use whitespace effectively to show logical groupings and hierarchy
* Prioritize clarity over cleverness or conciseness

### 🤝 Team Consistency
* Consistent code is easier to read and understand, making it faster to add new features
* Follow established patterns within the codebase
* Minimize cognitive load when switching between different parts of the project
* Enable seamless collaboration across team members

### 🔧 Tool-Assisted Enforcement
* Leverage automated formatting tools to reduce manual effort
* Use linters to catch style issues and potential bugs early
* Integrate style checks into development workflow and CI/CD pipelines
* Balance AI assistance with human oversight for optimal code quality

---

## General Formatting

### Indentation
- Use **2 spaces** per indentation level. Never use tabs.
- Maintain consistent indentation throughout the file.
- Align nested structures to improve readability.
- **Rationale**: Consistent indentation is fundamental to code readability and helps prevent nested code from becoming too deep

### Line Length
- Keep lines under **100 characters** where possible.
- Break long lines at natural breaking points for readability, but not at the expense of best practices
- Use hanging indents for continued expressions.
- Consider using string templates or concatenation for very long strings.

### Naming Conventions

| Entity                | Style              | Example                    | Notes                           |
|-----------------------|--------------------|----------------------------|---------------------------------|
| Variables & functions  | camelCase          | `userProfile`, `fetchData` | Descriptive and meaningful      |
| Classes & Types       | PascalCase         | `UserProfile`, `PaymentProcessor` | Clear and specific          |
| Constants             | UPPER_SNAKE_CASE   | `MAX_RETRY_COUNT`, `API_TIMEOUT` | Global configuration values |
| Files & folders       | kebab-case         | `data-validation.ts`, `user-service/` | Consistent with URLs     |
| Private members       | _camelCase         | `_privateMethod`, `_internalState` | Indicate internal use    |

### String Formatting
- Use **single quotes** `'...'` for strings unless template literals are needed.
- Use **template literals** (backticks) for multiline strings or string interpolation.
- Avoid unnecessary concatenation; prefer template literals for dynamic strings.
- Escape quotes consistently within the chosen quote style.

### Whitespace and Layout
- Use blank lines to separate logical sections of code.
- Add spaces around operators (`+`, `-`, `=`, `===`, etc.).
- No trailing whitespace at the end of lines.
- Single space after commas in parameter lists and array elements.
- Consistent spacing in object literals and destructuring assignments.

---

## Language-Specific Guidelines

### JavaScript / TypeScript

#### Modern Language Features
- Prefer **`const`** for all variables that don't reassign; use `let` only when necessary.
- Use **arrow functions** for anonymous callbacks and functional programming.
- Use **async/await** for asynchronous operations instead of raw Promises.
- Leverage destructuring for object and array assignments.
- Use optional chaining (`?.`) for safe property access.

#### Type Safety (TypeScript)
- Use **strict typing** wherever possible; avoid `any` type.
- Define interfaces for object shapes and function signatures.
- Use union types and type guards for better type safety.
- Leverage utility types (`Partial`, `Pick`, `Omit`) for type transformations.
- Enable strict TypeScript compiler options (`strict: true`).

#### Code Quality
- Avoid unused variables and imports — use ESLint to catch these.
- Use meaningful names that describe intent, not implementation.
- Keep functions under 20 lines where possible for better readability
- Prefer early returns to reduce nesting levels.

**Example - Good:**
```typescript
const formatUserDisplayName = (user: User): string => {
  if (!user.firstName && !user.lastName) {
    return user.email;
  }
  
  return `${user.firstName} ${user.lastName}`.trim();
};
```

**Example - Avoid:**
```typescript
const formatUserDisplayName = (user: any) => {
  let name;
  if (user.firstName || user.lastName) {
    name = user.firstName + ' ' + user.lastName;
  } else {
    name = user.email;
  }
  return name;
};
```

### Python

#### PEP 8 Compliance
- Follow **PEP 8** conventions strictly.
- Use `snake_case` for variables, functions, and module names.
- Use `PascalCase` for class names.
- Limit line length to **88 characters** (Black formatter standard).
- Use 4 spaces for indentation (Python standard).

#### Import Organization
```python
# Standard library imports
import os
import sys
from typing import List, Dict, Optional

# Third-party imports
import requests
import pandas as pd

# Local application imports
from .models import User
from .utils import format_date
```

#### Modern Python Features
- Use type hints for function signatures and variable declarations.
- Leverage f-strings for string formatting.
- Use dataclasses or Pydantic models for structured data.
- Prefer pathlib over os.path for file operations.
- Use context managers (`with` statements) for resource management.

### Other Languages

#### Go
- Follow official Go formatting standards (`gofmt`).
- Use short, descriptive variable names in limited scopes.
- Handle errors explicitly; don't ignore them.
- Use interfaces to define behavior contracts.

#### Rust
- Follow Rust community conventions (`rustfmt`).
- Use snake_case for variables and functions.
- Use PascalCase for types and traits.
- Prefer `match` over complex `if-else` chains.

#### SQL
- Use UPPERCASE for SQL keywords (`SELECT`, `FROM`, `WHERE`).
- Use snake_case for table and column names.
- Indent subqueries and JOIN clauses for readability.
- Use meaningful aliases for tables and complex expressions.

---

## HTML / JSX / TSX Formatting

### Structure Rules
- Use **2 spaces** indentation consistently.
- Place nested elements on new lines with proper indentation.
- Self-close void elements in JSX (`<img />`, `<input />`).
- Use semantic HTML elements when available (`<nav>`, `<main>`, `<section>`).

### Attribute Formatting
- For single-line elements, keep attributes on the same line if under 100 characters.
- For multi-line JSX props, put each prop on its own line.
- Align attributes vertically for better readability.
- Place the closing `>` or `/>` appropriately for multi-line tags.

**Example - Single Line:**
```jsx
<Button type="submit" variant="primary" onClick={handleSubmit} />
```

**Example - Multi-line:**
```jsx
<Button
  type="submit"
  variant="primary"
  className="mt-4 px-6 py-2"
  disabled={isLoading}
  onClick={handleSubmit}
>
  Submit Form
</Button>
```

### Accessibility Considerations
- Follow WCAG 2.1 AA standards for web accessibility
- Always include `alt` attributes for images.
- Use semantic HTML and proper heading hierarchy.
- Ensure sufficient color contrast ratios (4.5:1 for normal text).
- Implement keyboard navigation support.
- Use ARIA labels where semantic HTML isn't sufficient.

---

## CSS and Styling

### Tailwind CSS Preferences

#### Multi-line CSS Classes in Markup
- Write Tailwind classes on multiple lines per breakpoint for complex components.
- Order: base styles, responsive breakpoints (sm, md, lg, xl, 2xl), state modifiers.
- Align classes vertically for better readability.
- Group related utilities together (spacing, colors, typography).

**Example:**
```html
<div class="custom-cta 
           bg-gray-50 dark:bg-gray-900 
           p-4 rounded-lg shadow-sm
           cursor-pointer transition-colors duration-200
           hover:bg-gray-100 dark:hover:bg-gray-800
           focus:outline-none focus:ring-2 focus:ring-blue-500
           sm:p-6 sm:rounded-xl
           md:p-8 md:text-lg
           lg:p-10 lg:text-xl lg:max-w-md
           xl:p-12 xl:text-2xl">
  Call to action content
</div>
```

#### Custom CSS
- Use CSS custom properties (variables) for theming.
- Follow BEM methodology for custom class names.
- Prefer utility classes over custom CSS when possible.
- Use CSS Grid and Flexbox for layout, avoiding floats.

### SCSS/Sass Guidelines
- Use 2-space indentation.
- Nest selectors maximum 3 levels deep.
- Use meaningful variable names with descriptive prefixes.
- Group related styles with comments.
- Prefer mixins over @extend for reusable patterns.

---

## Code Comments and Documentation

### When to Comment

* Document your code to save time when passing code to someone else or revisiting old projects
* Clarify non-obvious business logic or complex algorithms.
* Explain *why* decisions are made, not *what* the code does.
* Document edge cases and workarounds.
* Add TODO comments for known technical debt with issue tracking references.

### Comment Style Guidelines

**Avoid redundant comments:**
```javascript
// BAD: Redundant comment
const userCount = users.length; // Get the length of users array
```

**Write meaningful comments:**
```javascript
// GOOD: Explains business logic
// Users with premium subscriptions get priority processing
// to ensure faster response times during high-load periods
const priorityUsers = users.filter(user => user.subscription === 'premium');
```

### Documentation Standards

#### Function/Method Documentation
```typescript
/**
 * Calculates compound interest with monthly contributions
 * Uses formula: A = P(1 + r/n)^(nt) + PMT × (((1 + r/n)^(nt) - 1) / (r/n))
 * 
 * @param principal - Initial investment amount in dollars
 * @param annualRate - Annual interest rate as decimal (0.05 for 5%)
 * @param years - Investment period in years
 * @param monthlyContribution - Additional monthly payment
 * @returns Final amount after compound growth
 * @throws {Error} When any parameter is negative
 */
const calculateCompoundInterest = (
  principal: number,
  annualRate: number,
  years: number,
  monthlyContribution: number = 0
): number => {
  // Implementation here
};
```

#### Class Documentation
```python
class PaymentProcessor:
    """
    Handles secure payment processing with multiple gateway support.
    
    This class provides a unified interface for processing payments
    across different payment providers while ensuring PCI compliance
    and proper error handling.
    
    Attributes:
        gateway_config: Configuration for the active payment gateway
        retry_attempts: Number of retry attempts for failed transactions
        
    Example:
        processor = PaymentProcessor(gateway_config)
        result = processor.process_payment(payment_data)
    """
```

---

## Modern Tooling and Automation

### Automated Formatting

#### Prettier Configuration
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

#### ESLint Integration
- Use ESLint with custom rules for project-specific requirements
- Configure eslint-plugin-prettier to ensure consistency without conflicts
- Enable TypeScript-specific rules for type safety.
- Use pre-commit hooks to enforce formatting before commits.

**Essential ESLint Rules:**
```json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:prettier/recommended"
  ],
  "rules": {
    "no-unused-vars": "error",
    "no-console": "warn",
    "prefer-const": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

### Language-Specific Tools

| Language   | Formatter | Linter | Additional Tools |
|------------|-----------|--------|------------------|
| JavaScript/TypeScript | Prettier | ESLint | TypeScript compiler |
| Python | Black | Flake8/Pylint | mypy for type checking |
| Go | gofmt/goimports | golint | go vet |
| Rust | rustfmt | Clippy | cargo check |
| CSS/SCSS | Prettier | Stylelint | PostCSS |

### Editor Integration

#### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "editor.rulers": [100],
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true
}
```

#### Git Hooks
- Use **Husky** for Git hooks management.
- Run formatters and linters in pre-commit hooks.
- Validate commit messages with conventional commit format.
- Block commits that fail style or type checks.

**Package.json Scripts:**
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit"
  }
}
```

---

## Accessibility in Code

### WCAG 2.1 AA Compliance
- Follow WCAG principles: Perceivable, Operable, Understandable, and Robust (POUR)
- Ensure websites meet WCAG 2.1 AA standards as required by ADA compliance
- Test with screen readers and keyboard-only navigation.
- Implement proper focus management and visual indicators.

### Semantic HTML Best Practices
```html
<!-- Good: Semantic structure -->
<main>
  <article>
    <header>
      <h1>Article Title</h1>
      <time datetime="2025-01-15">January 15, 2025</time>
    </header>
    <section>
      <h2>Section Heading</h2>
      <p>Content goes here...</p>
    </section>
  </article>
</main>

<!-- Avoid: Generic divs without semantic meaning -->
<div class="main">
  <div class="article">
    <div class="title">Article Title</div>
    <div class="content">Content goes here...</div>
  </div>
</div>
```

### ARIA Implementation
- Use ARIA labels for complex interactive elements.
- Implement proper focus management for single-page applications.
- Ensure color is not the only way to convey information.
- Provide alternative text for all meaningful images.

---

## Code Review Guidelines

### Style Review Checklist
- [ ] Code follows established naming conventions
- [ ] Indentation and formatting are consistent
- [ ] Comments explain business logic, not obvious code
- [ ] Functions are appropriately sized and focused
- [ ] No unused imports or variables
- [ ] Accessibility considerations are addressed
- [ ] Error handling is implemented properly

### Collaborative Standards
- Make your style guide easy to reference and accessible to everyone
- Use automated tools to catch style issues before human review.
- Focus code reviews on logic, architecture, and business requirements.
- Provide constructive feedback with suggestions for improvement.
- Update style guidelines based on team consensus and industry changes.

---

## Performance Considerations

### Optimization Guidelines
- Avoid premature optimization, but be mindful of obvious performance issues.
- Use efficient algorithms and data structures for the problem at hand.
- Minimize bundle size through proper import practices and tree shaking.
- Implement lazy loading for large components or resources.
- Cache expensive computations when appropriate.

### Bundle and Asset Optimization
- Split code into logical chunks for better caching.
- Optimize images and use appropriate formats (WebP, AVIF).
- Minimize CSS and JavaScript for production builds.
- Use CDN for static assets and third-party libraries.

---

## Security Considerations in Code Style

### Secure Coding Practices
- Never commit secrets, API keys, or passwords to version control.
- Sanitize and validate all user inputs.
- Use parameterized queries to prevent SQL injection.
- Implement proper error handling that doesn't expose sensitive information.
- Follow the principle of least privilege in code design.

### Code Review Security Checklist
- [ ] No hardcoded secrets or credentials
- [ ] Input validation is implemented
- [ ] Error messages don't expose system details
- [ ] Authentication and authorization are properly handled
- [ ] Dependencies are up to date and from trusted sources

---

## Team Collaboration and Onboarding

### Style Guide Adoption
1. **Start Small**: Begin with a single team to act as ambassadors of the new system
2. **Tool Integration**: Set up automated formatting and linting tools
3. **Documentation**: Keep the style guide accessible and up to date
4. **Training**: Include style guidelines in developer onboarding
5. **Iteration**: Regularly review and update standards based on team feedback

### Conflict Resolution
- When style preferences conflict, prioritize team consistency over individual preference.
- Use objective criteria (readability, maintainability, performance) to resolve disputes.
- Document decisions and rationale for future reference.
- Consider industry standards and best practices when making choices.

---