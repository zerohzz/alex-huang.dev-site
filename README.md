# alex-huang.dev

Personal portfolio site for Alex Huang — Salesforce Engineer based in Melbourne.

**Live:** [alex-huang.dev](https://alex-huang.dev)

---

## Stack

- **Framework:** [Astro 5](https://astro.build) (static site)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com)
- **Content:** Markdown / MDX via Astro glob loader
- **Search:** [Pagefind](https://pagefind.app) (static full-text)
- **OG Images:** Satori + resvg (auto-generated)
- **Code highlighting:** Shiki
- **Hosting:** GitHub Pages via GitHub Actions

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — macOS Finder-style README widget |
| `/resume` | Experience, skills, education, certs |
| `/projects` | Project portfolio with category filter |
| `/posts` | Blog — technical writing, project write-ups |
| `/effects-lab` | Interactive visual experiments (canvas / CSS) |
| `/skill-lab` | Skills breakdown with interactive layout |
| `/search` | Full-text search across all content |

---

## Structure

src/
  components/     # Astro UI components
  pages/          # Route pages
  data/
    blog/         # Markdown blog posts
    resume.ts     # Experience, projects, skills, education
    hero.ts       # Hero bio + typing roles
  styles/

public/
  images/         # Static assets
  CNAME           # alex-huang.dev
