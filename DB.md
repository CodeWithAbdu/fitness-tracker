Data domains for FitLog and the two jsonbin.io bins they map to.

- **Taxonomy** — Muscle Group → Exercise list, stored in jsonbin `6aa3b7b5ac6210605abfc74b`, editable in-app under "Manage exercises". Seeded once from [exercises.js](exercises.js) `DEFAULT_EXERCISES` if the bin is empty
- **Session** — one training day: `id`, `date`, `muscleGroups[]` (a day can be Chest + Arms), `exercises[]`
- **Entry** — one exercise inside a session: `exercise`, `muscle` (which of the day's muscle groups it belongs to), `progression` (`stay` \| `up` \| `down`, user's own call, not computed), `sets[]`
- **Set** — one working set: `reps`, `weight` — unit is fixed `kg`, no per-set choice
- **Storage** — both bins use whole-document PUT (fetch-append-put, never partial update)

**Sessions bin `6aa3ad3effd5d16053f93f83`** — `{ "sessions": [ Session, ... ] }`, newest first

```json
{
  "sessions": [
    {
      "id": "abc123",
      "date": "2026-09-11",
      "muscleGroups": ["Chest", "Arms"],
      "exercises": [
        {
          "exercise": "Bench Press",
          "muscle": "Chest",
          "progression": "up",
          "sets": [
            { "reps": 8, "weight": 60, "unit": "kg" },
            { "reps": 8, "weight": 60, "unit": "kg" }
          ]
        }
      ]
    }
  ]
}
```

**Taxonomy bin `6aa3b7b5ac6210605abfc74b`** — flat map, root is the record itself

```json
{
  "Chest": ["Bench Press", "Incline Bench Press"],
  "Arms": ["Barbell Curl", "Tricep Pushdown"]
}
```

⚠️ `X-Master-Key` ships in [app.js](app.js) client-side for both bins — anyone with the deployed URL's source can read/write them. Acceptable only because the data is a private personal log, no PII/financial data.
