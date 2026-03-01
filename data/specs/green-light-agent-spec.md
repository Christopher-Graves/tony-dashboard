# 🟢 The Green Light — Video & Tweet Idea Validator Agent

## Spec v1.0 — Created by Coach T for Engineering (Gilfoyle)
**Date:** 2026-02-19
**Priority:** CRITICAL — Chris is recording tomorrow. This needs to work TODAY.
**Requested by:** Chris via Life Coach session

---

## Overview

A single-command validation agent that takes a raw content idea from Chris, runs deep research, and returns a GO/NO-GO verdict with full research backing. Works for both YouTube videos and X/Twitter posts.

**The problem it solves:** Chris has been stuck in a 2-month planning spiral. This agent removes the "is this good enough?" friction by giving him data-backed confidence to hit record (or type the tweet).

---

## User Flow

### Input (Chris drops a message in Slack)
```
Idea: AI is not a search engine, it's an employee

My take: I'm literally building this right now with OpenClaw — 14 AI agents running my life, 
automating workflows, doing research while I sleep. Most people are still using ChatGPT like 
Google. That's like buying a Ferrari and only driving it to the mailbox.

Type: youtube
```

**Input fields:**
- `idea` — the core topic/title concept (required)
- `my take` — Chris's angle, thoughts, personal connection (optional but encouraged)
- `type` — `youtube` or `tweet` (defaults to `youtube`)

### Output (Agent responds in thread)

#### For YouTube:
```
🟢 GO RECORD

## Marcus Match: 9/10
Marcus (28-38, knowledge worker) would click this immediately. He's been using ChatGPT 
at work but knows he's barely scratching the surface. This video promises to show him 
what he's missing — and he'll feel smarter AND more capable after watching.

**Would he click?** Yes — "employee" reframe is a pattern interrupt. Everyone thinks "tool."
**Can he USE it?** Yes — practical examples of AI-as-employee in daily work.
**Does he feel smarter?** Yes — he'll understand a framework most people don't have yet.

## Transformation
- **Hook:** Confused → Understands (what AI actually is)
- **Core:** Afraid → Confident (I can do this too)
- **Land:** Average → Elite (I'm using AI better than 99% of people)

## Competitive Landscape
| Video | Views | Channel | Subs | Angle |
|-------|-------|---------|------|-------|
| "Stop Using AI Wrong" | 2.1M | ... | 500K | General productivity tips |
| "AI Agents Explained" | 850K | ... | 200K | Technical explainer |
| "I Replaced My Team With AI" | 1.5M | ... | 300K | Clickbait, light on substance |

**Gap:** Nobody is showing a REAL personal setup with 14 agents running their actual life.
Most content is theoretical or surface-level productivity tips. Chris's angle (lived experience 
+ actual system) is unique.

## Your Angle (What Makes This Different)
You're not theorizing — you're LIVING this. 14 agents, automated morning briefs, overnight 
research, financial tracking, health monitoring. Show don't tell. This is the "proof" video 
that nobody else can make because nobody else has built this.

## Talking Points (Riff Starters)
1. The search engine trap — why 90% of people use AI wrong
2. The employee mindset shift — delegation, not queries
3. Your actual setup — quick tour of what your agents do (don't go deep, tease)
4. The "overnight test" — what happened while you slept
5. The one thing to try TODAY — give Marcus his first "employee" task
6. Where this is going — AI employees become AI teams become AI companies

## Key Research / Data Points
- [relevant stats about AI adoption, productivity gains, etc.]
- [top tweets/threads on this topic from studied creators]
- [any relevant YouTube search volume data]

## Suggested Titles (pick or remix)
1. "AI Is Not a Search Engine. It's an Employee."
2. "I Have 14 AI Employees. Here's What They Do."
3. "Stop Googling With ChatGPT (Do This Instead)"
4. "The AI Mindset Shift Nobody's Talking About"

## Suggested Thumbnail Concepts
- Chris pointing at screen showing agent dashboard
- Split: "Search Engine" (crossed out) → "Employee" 
- Chris with 14 mini AI avatars around him

## 📝 Draft Script (REQUIRED OUTPUT)
A full teleprompter-ready script (800-1200 words, ~8-12 min read) structured for Marcus:

**Hook (first 30 sec):**
"Right now, 90% of people are using AI like a search engine. They type a question, 
get an answer, and move on. But what if I told you that's like buying a Ferrari 
and only driving it to the mailbox?"

**Setup (the problem):**
[2-3 paragraphs establishing why the current way is wrong, with relatable examples 
Marcus would recognize from his own work life]

**Core (the shift):**
[3-4 paragraphs delivering the main insight with specific examples from Chris's 
actual AI agent setup — keep it tangible, not theoretical]

**Proof (show don't tell):**
[2-3 paragraphs with real results, real workflows, real "this happened while I slept" 
moments that make Marcus think "I need to try this"]

**Action (what Marcus does next):**
[1-2 paragraphs with a specific, doable first step Marcus can take TODAY]

**Close:**
[Short, memorable closer that reinforces the transformation]

**Script rules:**
- Write in Chris's natural speaking voice — conversational, not formal
- Include [PAUSE] markers for emphasis moments
- Include [B-ROLL: description] markers for editing
- No jargon Marcus wouldn't know — if you use a technical term, explain it immediately
- Every section should pass the Marcus test: would he keep watching?
```

#### For Tweets:
```
🟢 GO POST

## Marcus Match: 8/10
This is a strong opinion post. Marcus will engage because it challenges 
how he currently uses AI.

## Draft Options
1. [Thread format - 4-5 tweets]
2. [Single tweet - punchy version]
3. [Quote tweet angle if responding to someone]

## Supporting Research
- [Relevant data points]
- [Creators who've covered this angle]
```

---

## Technical Architecture

### Agent: `greenlight` (new agent OR a mode within the YouTube agent)

**Option A (Recommended):** Build as a Slash command or dedicated Slack workflow in the YouTube agent's channel. Chris types, YouTube agent responds.

**Option B:** New lightweight agent with its own workspace.

### Pipeline Steps (YouTube mode):

1. **Parse Input** — Extract idea, angle, and type from Chris's message

2. **Marcus Score** — Using the Marcus avatar definition:
   - Age 28-38, knowledge worker
   - Wants to understand the future + position for success
   - Transformation: "Stop being afraid of the future and start using it"
   - Three tests: Would he click? Can he USE it? Does he feel smarter?
   - Score 1-10 with explanation

3. **YouTube Search** — Use YouTube Data API:
   - Search for the topic keywords
   - Pull top 10-20 results
   - Filter for videos with 100K+ views
   - Get: title, views, channel, subscriber count, publish date, duration
   - Script: leverage existing `test-yt-api.py` patterns

4. **Outlier Detection** — For top results:
   - Calculate outlier score (views vs channel average)
   - Identify which angles performed best
   - Flag content gaps (what hasn't been covered?)

5. **Transcript Analysis** (for top 2-3 most relevant videos):
   - Use existing transcription pipeline or YouTube transcript API
   - Extract: key points covered, structure, hooks used
   - Identify what Chris can do DIFFERENTLY

6. **X/Twitter Search** — Use bird CLI:
   - Search for recent tweets on the topic
   - Pull from creator-map.md creators specifically
   - Identify trending angles and engagement patterns

7. **Web Research** — Use Brave search:
   - Recent articles, stats, data points on the topic
   - Industry reports or studies Chris can reference
   - News hooks (is this topic timely?)

8. **Synthesis** — Compile all research into the output format:
   - GO / TWEAK / SKIP verdict
   - Marcus match score + reasoning
   - Competitive landscape table
   - Chris's unique angle
   - Talking points
   - Title suggestions
   - Thumbnail concepts

### Pipeline Steps (Tweet mode):

1. **Parse Input**
2. **Marcus Score** (lighter version)
3. **X/Twitter Search** — recent posts on topic from big creators
4. **Voice Guide Check** — load X-VOICE-GUIDE.md, ensure drafts match Chris's voice
5. **Draft Options** — 2-3 tweet versions in Chris's voice
6. **GO / SKIP verdict**

---

## Existing Tools to Leverage

| Tool | Location | Use |
|------|----------|-----|
| YouTube Data API | `scripts/test-yt-api.py` | Search & video stats |
| Marcus Scorer | `scripts/score-marcus.py` | Avatar matching |
| Transcript Pipeline | `scripts/ujs-transcribe-now.py` | Video transcription |
| Bird CLI | `bird.cmd` | X/Twitter search |
| Brain Search | `brain.py search` | Existing research lookup |
| Brave Search | Built-in web_search tool | Web research |
| X Voice Guide | `youtube/X-VOICE-GUIDE.md` | Tweet voice matching |
| Creator Map | `x-strategy/creator-map.md` | Creator tracking |

---

## Key Constraints

1. **Honesty over encouragement.** If the idea is weak, say so. Don't shape-shift to make Chris feel good. The whole point is TRUST in the verdict.
2. **Speed matters.** Target: full YouTube validation in under 5 minutes. Tweet validation in under 2 minutes.
3. **Research must be REAL.** All video links, view counts, and data must come from actual API calls, not hallucinated.
4. **The unique angle is everything.** The most important part of the output is "what makes YOUR take different?" — this is what gives Chris confidence to record.

---

## Success Criteria

Chris drops an idea → gets back a verdict he trusts → feels confident enough to record → actually records.

**If this agent makes Chris record one more video per week, it's paid for itself 1000x.**

---

## Delivery

- This is the #1 priority task right now
- Chris is recording TOMORROW (2026-02-20)
- The first idea to validate is: "AI is not a search engine, it's an employee"
- Agent needs to be functional TODAY
