---
title: Testing less and finding more with boundaries and partitions
description: Two classic test design techniques, worked through on one input field, with what to automate and what to explore by hand.
date: 2026-06-18
tags: [testing, test-design]
---

You cannot test every input. A field that accepts an age from 18 to 65 has billions of possible values if you count every string someone could type. The skill is choosing the few values that are most likely to find a bug.

Two techniques do most of the work: equivalence partitioning and boundary value analysis. They are old, they appear in every testing course, and they are still the fastest way I know to design a good set of cases.

## Equivalence partitioning

Split all possible inputs into groups where the system should behave the same way. If one value in a group works, the others very likely do too, so you test one value per group.

For an age field that accepts whole numbers from 18 to 65:

| Partition | Example | Expected |
| --- | --- | --- |
| Below the range | 10 | rejected: too young |
| In the range | 40 | accepted |
| Above the range | 80 | rejected: too old |
| Not a number | `abc` | rejected: invalid |
| Not a whole number | `30.5` | rejected: invalid |
| Empty | (nothing) | rejected: required |

Six values instead of billions, and each one checks a different rule.

The groups for invalid input are easy to forget. Most real bugs live there, because developers write and test the happy path first.

## Boundary value analysis

Bugs cluster at the edges of a range. Someone writes `age > 18` instead of `age >= 18`, and 18 is rejected. So for every boundary, test the value on it and the values either side:

| Boundary | Test values |
| --- | --- |
| Lower: 18 | 17, 18, 19 |
| Upper: 65 | 64, 65, 66 |

Combined with the partitions, that is about a dozen cases, and they cover the mistakes people most often make.

## Boundaries hide in places other than numbers

Once you look for edges, they are everywhere:

- **Length:** a username of 3 to 20 characters. Try 2, 3, 20, 21. Try 20 characters where one is an emoji, which may count as two.
- **Dates:** the last day of a month, 29 February, the day the clocks change, midnight.
- **Collections:** an empty list, one item, the page size, one more than the page size.
- **Money:** zero, the smallest unit, a value with more decimal places than the currency has.
- **Time zones:** an event at 23:30 for a user one hour ahead.

## Inputs nobody designed for

After the partitions and boundaries, add a few values that test how the system copes with surprises:

- leading and trailing spaces: `"  40  "`;
- characters with special meaning somewhere in the stack: `&`, `#`, `%`, `+`, quotes, `<`, `>`;
- non-English text and emoji: `José`, `日本`, `🙂`;
- very long input, far beyond any limit.

These rarely need exact expected values. The question is simpler: does the system reject it clearly, or accept it and keep working, without crashing, corrupting data or showing an error page?

Special characters are worth extra attention when input travels between systems: into a URL, an HTML page, a CSV export or a database query. A surname like `O'Brien` that breaks a hand-built SQL string, or a comma in a company name that shifts every column in an export, is not a validation bug. It is a boundary between two systems, and those boundaries are where data gets lost.

## Automate the table, explore the rest

Partition and boundary cases make excellent data-driven tests, because they are a table of inputs and expected results:

```ts
const cases = [
  { age: '17', valid: false },
  { age: '18', valid: true },
  { age: '65', valid: true },
  { age: '66', valid: false },
  { age: 'abc', valid: false },
  { age: '', valid: false },
];

for (const { age, valid } of cases) {
  test(`age "${age}" is ${valid ? 'accepted' : 'rejected'}`, async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Age').fill(age);
    await page.getByRole('button', { name: 'Continue' }).click();
    const error = page.getByRole('alert');
    if (valid) await expect(error).toBeHidden();
    else await expect(error).toBeVisible();
  });
}
```

One test body, many cases, and adding a case is one line.

Keep some time for exploring by hand as well. The techniques tell you where bugs are likely, but they only cover the rules you already know about. Exploring is how you find the rule nobody wrote down.

## The short version

1. List the groups of input that should behave the same way, including invalid ones.
2. Pick one value from each group.
3. For every limit, test on it and one either side.
4. Add a handful of surprising inputs.
5. Automate the table; explore around it.
