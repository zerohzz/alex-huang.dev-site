# Illustrations — ai-website-one-day

Skill: `zz-material-illustration`. Style: clean Swiss editorial 3D on off-white studio background, site palette (coffee main + Morandi accents), Fraunces/Outfit type, English labels. Generator: `blog-image-hero/scripts/generate.mjs` (APIMART gpt-image-2).

## pipeline-v2.png — the 4-phase tool pipeline  *(used in the post)*
- **Placement:** "The Overall Approach" section, after the ASCII diagram.
- **Concept:** left→right rail: vague doc → ChatGPT (Requirements) → Gemini (Prototype) → Claude Code (Customise) → GitHub Pages (Deploy) → live site.
- **Labels:** Requirements · Prototype · Customise · Deploy
- **Accent:** coffee `#AF8F6F` (site main).
- **Prompt:** `pipeline.prompt.md`
- **Command:**
  ```bash
  node .claude/skills/blog-image-hero/scripts/generate.mjs \
    --prompt public/images/illustrations/ai-website-one-day/pipeline.prompt.md \
    --out public/images/illustrations/ai-website-one-day/pipeline-v2.png --size 1200x624 --resolution 1k
  ```
- **QA:** pass — 4 labels correct, 6 stages read L→R, off-white studio render, coffee rail/arrows, no crop.

> A second illustration (before/after "vague → actionable", Morandi-blue accent) was generated as a style demo but is not used in the post.
