# Illustrations — project-funlab-digital-transformation

Skill: `zz-material-illustration`. Style: clean Swiss editorial 3D on off-white studio background, site palette, Fraunces/Outfit type, English labels. Generator: `blog-image-hero/scripts/generate.mjs` (APIMART gpt-image-2), `--size 1280x720 --resolution 1k`.

## wizard-orchestrator.png — the booking-wizard hub-and-spoke  *(used in the post)*
- **Placement:** "The LWC Booking Wizard → Architecture", after the "mocked parent" paragraph.
- **Concept:** central Orchestrator console; step panels (Venue, Date/time, Package, Pricing, Payment, Confirm) each route through the hub via custom-event tokens — no component-to-component coupling.
- **Labels:** Orchestrator · Venue · Date/time · Package · Pricing · Payment · Confirm · Custom events
- **Accent:** coffee `#AF8F6F`.
- **Prompt:** `wizard-orchestrator.prompt.md`
- **QA:** pass — all spoke labels correct, every connection passes through the hub, envelope event tokens, no crop.
