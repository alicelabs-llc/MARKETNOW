---
name: multimodal-content-factory
description: Multi-platform content repurposing engine. Use when agents need to create, adapt, and publish content across different formats (text, image, audio, video) and platforms (blog, social, podcast, video). One input → many outputs. Solves the "I have a blog post but need a TikTok, podcast script, LinkedIn thread, and newsletter" workflow.
---

# Multimodal Content Factory - One Input, All Outputs

## Overview

Multimodal Content Factory takes a single content input (blog post, script, transcript, raw notes) and automatically repurposes it into 10+ content formats optimized for different platforms. Uses AI to adapt tone, length, structure, and medium for each target channel. Saves agents from having to manually recreate content for each platform.

## Pain Points This Solves

| Pain | Solution |
|------|----------|
| Creating content for every platform manually | One input → auto-generate all formats |
| Content doesn't fit platform conventions | Platform-specific tone/length/structure |
| No time for repurposing (even though it drives 3x reach) | Full auto-repurpose pipeline |
| Audio/video content creation is complex | Automated script → TTS + visual generation |
| Can't maintain consistent messaging across platforms | Central source of truth → all derivations |

## Input → Output Matrix

```
INPUT                           OUTPUTS
                    ┌─────────────────────────────┐
 Blog Post (2,000)  │ → Twitter/X thread (20 tweets) │
                    │ → LinkedIn article             │
                    │ → Instagram carousel (10 slides)│
                    │ → Newsletter (500 words)        │
                    │ → TikTok script (60s)           │
                    │ → YouTube script (8min)         │
                    │ → Podcast episode script        │
                    │ → Email sequence (5 emails)     │
                    │ → Reddit post + comments        │
                    │ → Quora answer (1,000 words)    │
                    │ → Short-form summary (3 bullets)│
                    │ → Audio version (TTS)           │
                    │ → Image quotes (5-10 graphics)  │
                    └─────────────────────────────┘
```

## Factory Pipeline

```markdown
Step 1: Ingest Content
  `factory ingest blog-post.md --title "10 Ways AI Changes Marketing" --source-type blog`
  
  Supported input types:
  - Blog post (markdown, HTML, text)
  - Video transcript (SRT, VTT, plain text)  
  - Podcast transcript
  - Raw notes/bullet points
  - PDF existing content
  - URL (auto-fetch and parse)

Step 2: Content Analysis
  Automatic analysis extracts:
  - Core thesis / main argument
  - Key statistics and data points
  - Quotes and expert opinions
  - Emotional tone (professional, humorous, urgent)
  - Target audience segments
  - SEO keywords for discovery
  - Content structure (list, narrative, tutorial)

Step 3: Format Generation
  `factory generate --platforms twitter,linkedin,newsletter,instagram`

  Each platform gets:
  - Appropriate word/character count
  - Platform-native formatting
  - Tone adaptation (Twitter: punchy, LinkedIn: professional)
  - Hashtag strategy per platform
  - Optimal posting time suggestion

  Advanced: 
  `factory generate all` → All 10+ formats
  `factory generate --batch youtube,reddit,podcast` → Targeted batch
```

## Platform Profiles

### Twitter/X Thread
```markdown
Structure:
1/ Hook tweet (grab attention with stat or question)
2-3/ Problem/context setup
4-7/ Core value (one key point per tweet)
8/ Conclusion + CTA
9/ Optional: personal take

Format: 280 chars per tweet, emojis encouraged
Best for: Bite-sized insights, controversial takes, list-based
Auto-thread: Splits long content into threaded tweets
```

### LinkedIn Article
```markdown
Structure:
- Headline (professional, benefit-driven, 60 chars)
- Opening: Context + problem statement
- Body: 3-5 key sections with subheadings
- Data/evidence: Stats, quotes, case studies
- Conclusion: Actionable takeaway
- CTA: Comment "X" if you agree

Format: 1,500-2,000 words, professional tone, 5-10 min read
Best for: Industry insights, thought leadership
```

### TikTok/Reels Script
```markdown
Structure:
0-3s: Hook (visual + audio, highest energy)
3-15s: Problem introduction
15-45s: Key insight (fast cuts, on-screen text)
45-55s: Application tip
55-60s: CTA ("Follow for more")

Format: 60s max, conversational tone, fast-paced
Best for: One key insight, demo, tip
Auto-generates: Closed captions, B-roll suggestions
```

### Podcast Script
```markdown
Structure:
- Intro (30s): Topic intro, tease the value
- Hook story (2min): Personal/anecdotal
- Deep dive (15min): Key insights with examples
- Actionable tips (3min): Practical takeaways
- Outro (30s): Where to learn more, call to action

Format: 15-30 min episode, conversational tone, solo or interview
Best for: Deep dives, comprehensive topic coverage
```

### Email Sequence (5-part)
```markdown
Email 1: "The [Topic] Problem" — Pain point awareness
Email 2: "3 Things Nobody Tells You About [Topic]" — Curiosity
Email 3: "The [Topic] Blueprint" — Value delivery
Email 4: "What Most People Get Wrong" — Counter-intuitive
Email 5: "Your [Topic] Action Plan" — Actionable conclusion

Each email: 300-500 words, single CTA, personal voice
```

## Visual Asset Generation

```markdown
Image quotes for social:
`factory visuals --quotes 10 --style minimal --size 1080x1080`

Carousel slides:
`factory carousel --title "10 Ways AI Changes Marketing" --slides 10`

Video thumbnail:
`factory thumbnail --title "10 AI Marketing Tips" --style clickable`

Auto-generates:
- 10 quote cards (text + background)
- Carousel with title slide + 9 content slides
- YouTube thumbnail with title overlay
- Pinterest pins (vertical format, 2:3 ratio)
```

## Audio Pipeline

```markdown
Text to audio:
`factory podcast --voice professional-male --format mp3 --duration 15min`

Audio variants:
- Full narration (15-30 min)
- Short clip (60s, for social)
- Audiogram (audio + waveform video)
- Podcast RSS feed generation

Voice options: (via configured TTS)
- Professional (deep, authoritative)
- Friendly (warm, conversational)
- Energetic (upbeat, fast)
- Calm (slow, meditative)
```

## Content Calendar & Scheduling

```markdown
Generate a content calendar:
`factory calendar --platforms twitter,linkedin,instagram --days 30`

Output: CSV or markdown table with:
- Date & time
- Platform
- Content format
- Copy preview
- Hashtags
- Asset links

Bulk schedule (if API-connected):
`factory schedule --platform twitter --from calendar.csv`
```

## Scripts

### scripts/factory.py
Main orchestrator:
- `ingest` - Parse input content
- `generate` - Generate platform outputs
- `visuals` - Generate visual assets
- `calendar` - Create content schedule
- `schedule` - Auto-publish to platforms

### scripts/platform_profiles.py
Platform-specific formatting rules and tone profiles for 15+ platforms including Twitter, LinkedIn, Instagram, TikTok, YouTube, Medium, Reddit, Quora, Substack, Facebook, Pinterest, Discord, Telegram.

### scripts/tts_pipeline.py
Text-to-speech conversion with voice selection, audio mixing, and RSS feed generation.

## Assets

### assets/tone_profiles.json
Tone, vocabulary, and structural preferences for each platform.

### assets/content_calendar_template.csv
Blank calendar template for scheduling.

---

**One-command repurpose:** `factory ingest article.md && factory generate all`
**Quick social:** `factory generate --platforms twitter,linkedin --cap 3`
