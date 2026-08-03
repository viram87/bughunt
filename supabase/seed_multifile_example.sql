-- One multi-file challenge per language, to exercise the feature.
--
-- The point of this tier: the symptom shows up in cart.py/cart.js, but the
-- bug is in pricing.py/pricing.js. Students have to trace across a file
-- boundary rather than reading one function.
--
-- Run after 0005_multi_file_challenges.sql.

insert into public.bug_challenges (
  title, language, bug_category, difficulty, function_name,
  broken_code, correct_code, problem_description, symptom_description,
  explanation, test_cases, status, files, entry_file
) values (
  $$Discount is subtracted as a flat amount$$,
  $$python$$,
  $$logic_error$$,
  $$medium$$,
  $$checkout$$,
  $$# see pricing.py — the bug is not in this file$$,
  $$# see pricing.py$$,
  $$checkout(total, pct) should apply a percentage discount, so checkout(200, 50) returns 100.$$,
  $$checkout(200, 50) returns 150 instead of 100 — the discount is far too small. cart.py looks correct, so the problem is somewhere else.$$,
  $$apply_discount subtracts the percentage as if it were a flat amount: 200 - 50 rather than 200 - (200 * 50 / 100). cart.py is entirely correct, which is what makes this realistic — the symptom appears where the function is *called*, not where the bug lives. Following the call into pricing.py is the actual skill.$$,
  $$[{"input":[200,50],"expected_output":100},{"input":[100,10],"expected_output":90},{"input":[50,0],"expected_output":50}]$$::jsonb,
  'published',
  $$[
    {"name":"pricing.py","broken":"def apply_discount(total, pct):\n    return total - pct","correct":"def apply_discount(total, pct):\n    return total - (total * pct / 100)"},
    {"name":"cart.py","broken":"from pricing import apply_discount\n\ndef checkout(total, pct):\n    return apply_discount(total, pct)","correct":"from pricing import apply_discount\n\ndef checkout(total, pct):\n    return apply_discount(total, pct)"}
  ]$$::jsonb,
  $$cart.py$$
), (
  $$Total ignores the quantity of each item$$,
  $$javascript$$,
  $$logic_error$$,
  $$medium$$,
  $$cartTotal$$,
  $$// see lineItem.js — the bug is not in this file$$,
  $$// see lineItem.js$$,
  $$cartTotal(items) should total price x quantity for every item, so two of a 10 unit item plus one of a 5 unit item is 25.$$,
  $$cartTotal returns 15 instead of 25 — quantities are being ignored. cart.js just sums what lineItem.js gives it, so the problem is upstream.$$,
  $$lineTotal returns the unit price and never multiplies by quantity. cart.js sums correctly, so nothing there looks wrong — which is exactly why this pattern is worth practising: the file showing the symptom is often not the file containing the bug.$$,
  $$[{"input":[[{"price":10,"qty":2},{"price":5,"qty":1}]],"expected_output":25},{"input":[[{"price":3,"qty":3}]],"expected_output":9},{"input":[[]],"expected_output":0}]$$::jsonb,
  'published',
  $$[
    {"name":"lineItem.js","broken":"function lineTotal(item) {\n    return item.price;\n}\nmodule.exports = { lineTotal };","correct":"function lineTotal(item) {\n    return item.price * item.qty;\n}\nmodule.exports = { lineTotal };"},
    {"name":"cart.js","broken":"const { lineTotal } = require('./lineItem');\n\nfunction cartTotal(items) {\n    return items.reduce((sum, item) => sum + lineTotal(item), 0);\n}\nmodule.exports = { cartTotal };","correct":"const { lineTotal } = require('./lineItem');\n\nfunction cartTotal(items) {\n    return items.reduce((sum, item) => sum + lineTotal(item), 0);\n}\nmodule.exports = { cartTotal };"}
  ]$$::jsonb,
  $$cart.js$$
);
