---
title: Locators that survive a redesign
description: Why UI tests break when nothing is wrong, and how to find elements the way a user does.
date: 2026-03-12
tags: [testing, playwright, automation]
---

Most UI test failures I have seen were not bugs. A developer renamed a CSS class, wrapped a button in another `div`, or moved a section up the page, and twenty tests went red. The product worked. The tests were looking for things in the wrong way.

The part of a test that finds an element is the locator. Choosing it well is the cheapest way to make a suite stable.

## What breaks, from worst to best

**Position in the page.**

```ts
page.locator('div:nth-child(7) > div > a');
```

This means "a link inside the first `div` inside the seventh `div`". It says nothing about what the link is. Add a banner above it and the test clicks something else, or nothing. Worse, when it clicks the wrong thing it might still pass.

**CSS classes.**

```ts
page.locator('.btn-primary-lg');
```

Classes exist for styling. They change when the design changes, and many build tools generate them (`Button_root__x7Kq2`), so they change on every build.

**Text alone.**

```ts
page.getByText('Submit');
```

Better, because users see text. But "Submit" may appear in several places, and text alone does not say whether it is a button, a link or a heading.

**Role and accessible name.**

```ts
page.getByRole('button', { name: 'Submit order' });
```

This is how a user, and a screen reader, finds things: "the button called Submit order". It survives restyling, restructuring and moving. It only breaks when the thing the user sees changes, which is exactly when a test should notice.

## Narrow the search the same way

Users also find things by area: "the Delete button in the second row", "the price in the basket". Locators can be chained the same way:

```ts
const basket = page.getByRole('region', { name: 'Basket' });
await expect(basket.getByRole('listitem')).toHaveCount(2);
await basket.getByRole('listitem')
  .filter({ hasText: 'Blue mug' })
  .getByRole('button', { name: 'Remove' })
  .click();
```

Each step is something a person could describe out loud. When the test fails, the locator itself tells you what was missing.

## When there is no good role or name

Some elements have no meaningful role or label: a chart, a canvas, a decorative container you still need to check. For those, ask developers to add a test id:

```html
<div data-testid="revenue-chart">...</div>
```

```ts
page.getByTestId('revenue-chart');
```

A test id is a contract: it exists only for tests, so nobody changes it by accident. It is a good fallback, but reach for roles first, because a test id does not tell you whether a real user can find the element.

## A side effect: accessibility checks for free

If you cannot find a button with `getByRole('button', { name: ... })`, often a screen reader user cannot either. Maybe it is a `div` with a click handler, or an icon with no label. Writing role-based locators turns into a lightweight accessibility review: every time a locator is hard to write, there is a question worth asking the developer.

## Strict by default

One more reason to use locators instead of older APIs. In Playwright, a locator that matches more than one element fails loudly when you act on it:

```text
Error: strict mode violation: getByRole('button', { name: 'Delete' }) resolved to 3 elements
```

Older APIs such as `page.click(selector)` silently used the first match. That is how a test ends up deleting the wrong row and still passing.

## A quick checklist

- Can I describe this locator out loud the way a user would? If not, rethink it.
- Would it survive a restyle? Then it does not use classes.
- Would it survive moving the section? Then it does not use positions.
- Does it match exactly one element? Then strict mode will keep it that way.
