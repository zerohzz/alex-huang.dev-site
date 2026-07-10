# Illustrations — tech-deepdive-funlab-usa-expansion

Skill: `zz-material-illustration`. Style: clean Swiss editorial 3D on off-white studio background, site palette, Fraunces/Outfit type, English labels. Generator: `blog-image-hero/scripts/generate.mjs` (APIMART gpt-image-2), `--size 1280x720 --resolution 1k`.

## recursion-loop.png — the async recursion cycle  *(used in the post)*
- **Placement:** "Problem 1", after the `System.isBatch() ...` guard code block.
- **Concept:** clockwise cycle Trigger fires → Queue job → DML update → (guard breaks return) → black-box package → back to trigger.
- **Labels:** Trigger fires · Queue job · DML update · Guard breaks loop · Black box
- **Accent:** coffee `#AF8F6F`.
- **Prompt:** `recursion-loop.prompt.md`
- **Note:** first pass used the label "Enqueue job" and the model misspelled it ("Enqeueue"). Regenerated with "Queue job" — renders clean.
- **QA:** pass — 5 labels correct, cycle reads clockwise, sealed black box, coffee arrows, no crop.

## readiness-gate.png — the async readiness state machine  *(used in the post)*
- **Placement:** end of "Problem 4", before "## Deploying into a shared, live org".
- **Concept:** top-row states Not ready → Recalculating → Ready → gate → Generate doc; two black-box packages below both point to one shared readiness flag.
- **Labels:** Not ready · Recalculating · Ready · Generate doc · Readiness flag
- **Accent:** coffee `#AF8F6F`.
- **Prompt:** `readiness-gate.prompt.md`
- **QA:** pass — 5 labels correct, states read L→R, two sealed boxes → central flag, no crop.
