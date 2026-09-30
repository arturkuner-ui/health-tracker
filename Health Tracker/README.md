# Health Tracker

A personal health web app with a home page and three sections:

- **Health monitor**: upload a bloodwork PDF, press *Evaluate my health*, and every marker is rated green (good), yellow (mild) or red (immediate attention), with a summary and next steps. Past reports are kept.
- **Calorie tracker**: log food by searching a built-in food list, typing it in manually, taking a photo, or describing the meal. Tracks calories, protein, carbs and fat. Each day starts fresh; a calendar shows every past day with its totals, and clicking a day shows everything eaten.
- **Profile & weight**: enter sex, age, height, weight and exercise frequency to get maintenance, lean bulk, bulk and cut calories plus daily macro goals. Log your weight over time on a graph, with two predictions of future weight (your weigh-in trend, and your logged calories versus maintenance) and an estimated date to reach a target weight.

## How to open it

Double-click `index.html` to open it in your browser. No install or server needed.

If your browser blocks something when opened as a file, run a local server in this folder instead:

    python3 -m http.server 8000

then go to http://localhost:8000.

## Claude API key

The bloodwork evaluation and the photo/describe food estimates call the Claude API directly from your browser. Add your API key (from console.anthropic.com) under **Settings** (the ⚙ icon). Each evaluation or photo is one paid API call on your account. Everything else works without a key.

## Your data

All data is stored in your browser only (localStorage). Bloodwork PDFs and photos are sent to Anthropic's API only when you press the evaluate/estimate button, and are not stored by the app, only the results. Use **Settings → Download backup** to save a copy, and **Restore backup** to move it to another browser or device.

The bloodwork evaluation is for information only and is not medical advice.

## Files

- `index.html`, `styles.css`: page shell and styling (light and dark mode)
- `js/store.js`: saving and loading data
- `js/calc.js`: calorie formulas (Mifflin-St Jeor) and weight predictions
- `js/claude.js`: Claude API calls
- `js/foods.js`: built-in food list (per 100 g)
- `js/chart.js`: weight graph
- `js/pages/`: one file per page
