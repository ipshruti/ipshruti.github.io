---
title: Flaky tests have causes
description: The five usual reasons a test passes sometimes and fails other times, and a method for finding which one you have.
date: 2026-09-24
tags: [testing, flaky-tests, automation]
---

A flaky test is a test that passes and fails on the same code. It is tempting to treat that as bad luck: re-run the job, add a retry, move on. But the test is not random. Something differs between the passing run and the failing run, and that something is a bug, either in the test or in the product.

Retries make it worse. They turn a failure you can see into a green tick you cannot, and every team that relies on them ends up with a suite nobody trusts.

## The five usual causes

In my experience almost every flaky test falls into one of these.

### 1. Timing

The test does something before the application is ready for it.

- Clicking a button before the page has finished loading the code that handles the click.
- Reading text before a request has returned.
- Asserting on a list while it is still rendering.

The classic symptom is a fixed wait in the test: `sleep(2)` or `waitForTimeout(2000)`. It works on a fast laptop and fails on a busy CI machine. The fix is to wait for the condition, not for a time:

```ts
// Fragile: hopes 2 seconds is enough
await page.waitForTimeout(2000);
expect(await page.locator('.result').count()).toBe(3);

// Stable: retries until the condition is true or the timeout is reached
await expect(page.getByRole('listitem')).toHaveCount(3);
```

### 2. Shared state

Two tests touch the same thing: a database row, a user account, a file, a feature flag. Run alone, each passes. Run in parallel, one changes what the other expects.

The fix is isolation. Each test creates the data it needs, with unique names, and does not depend on anything another test left behind.

### 3. Order dependence

A test only passes because an earlier test happened to set something up: logged in, created a record, warmed a cache. Change the order or run it alone and it fails.

A good check: run your suite with the order shuffled, and run any suspicious test on its own. If the result changes, the tests are coupled.

### 4. The environment

The test runs on a machine that differs from yours in ways you did not think about:

- slower CPU, so timing problems appear;
- a different time zone, so "today" is a different date;
- a different locale, so numbers and dates format differently;
- a different screen size, so an element is hidden behind a menu;
- a different region or IP address, so a site serves different content or blocks the request.

### 5. The product really is flaky

Sometimes the test is fine and the application has a race condition: two requests that can complete in either order, a cache that is sometimes stale. These are the most valuable flaky tests, because they found a real bug that users will hit occasionally and nobody will be able to reproduce.

## A method for finding the cause

1. **Collect evidence from failing runs.** Turn on traces, screenshots and logs for failures in CI, and keep several failing runs, not one. In Playwright, `trace: 'retain-on-failure'` records every action, the page at each step, and the network.
2. **Compare a failing run with a passing one.** Look at the step that failed. What was different: was something still loading, was there an overlay, did a request fail?
3. **Reproduce it on purpose.** Run the test many times with the CI settings: `npx playwright test my.spec.ts --repeat-each=50 --workers=4`. If it will not fail locally, get closer to CI: same container image, slower CPU, same screen size.
4. **Name one cause and prove it.** "The list sometimes renders after the assertion" is a hypothesis. Make it happen every time, for example by delaying the request, and check you get the same error as CI.
5. **Fix the cause, then prove the fix.** Run the test repeatedly again and expect zero failures.

## Passing ten times is not proof

Step 5 has a trap. If a test failed one run in six, ten passes in a row will happen about one time in six even if nothing changed. A passing streak measures luck as much as the fix.

Better proof is to show the cause is gone. If the problem was a request finishing late, delay that request on purpose and show the test now waits for it. If it was shared data, run two copies in parallel and show they no longer collide.

## What to do while you investigate

If a flaky test is blocking everyone, quarantine it visibly: mark it as skipped with a link to a ticket, so it stays on the list of things to fix. Deleting it or hiding it behind retries means it never gets fixed, and the bug it was pointing at stays in the product.
