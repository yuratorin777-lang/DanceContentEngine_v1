# Dance Content Engine — Content & Channel Architecture v1

**Status:** Draft for implementation
**Pilot geography:** Серпухов
**Primary evidence:** Analyst baseline v1, Audience & Decision Journey Research v2, first-party owner knowledge, existing Content/SEO rules, current Planner/Writer/Retriever/Radar architecture.

## 1. Purpose

This document defines the operating architecture of the content system. It does not replace the Analyst, Planner, Writer, Retriever, Publisher or Analytics modules. It defines how they work together.

## 2. Strategic principle

Content is not produced for the sake of publication volume. It exists to help a parent move through a real decision journey, build trust in the school's expertise, and eventually support conversion and retention.

The system therefore follows:

Audience need → Content job → Content asset → Channel → Publication → Analytics → Feedback.

## 3. Core inputs

The content system consumes five major evidence layers:

1. **01_KNOWLEDGE** — owner expertise, experience, observations and first-party knowledge.
2. **02_RESEARCH** — market, audience, competitor, search and content evidence.
3. **03_AUDIENCE** — audience structures and validated audience information as it grows.
4. **05_SEO** — search-specific rules and intelligence.
5. **RADAR** — current external signals, not automatically verified truth.

Analytics will later become a sixth feedback layer.

## 4. Core processing chain

Librarian → Retriever → Content Planner → Writer → Validator → Publisher → Analytics.

### Librarian
Maintains the map of available project knowledge.

### Retriever
Builds a bounded and diverse evidence package. It does not decide the content strategy.

### Content Planner
Converts a user/content request plus retrieved evidence into a structured content execution plan.

### Writer
Creates the final asset according to the plan, source material and output contract.

### Validator
Checks the generated output against project rules and factual/source constraints.

### Publisher
Distributes approved assets to selected channels.

### Analytics
Measures actual performance and feeds evidence back into Research, Audience and Content Strategy.

## 5. Content decision hierarchy

Every content decision should be evaluated in this order:

1. Audience need.
2. Decision stage.
3. Content job.
4. Available evidence.
5. Business relevance.
6. Channel suitability.
7. Search relevance when applicable.
8. Current external signals from Radar.

Radar does not override audience need or source truth.

## 6. Audience decision stages

The current working journey is:

TRIGGER → PROBLEM AWARENESS → EXPLORATION → SHORTLIST → COMPARISON → FIRST CONTACT → FIRST LESSON → ADAPTATION → CONTINUE / DROP → PROGRESS → LOYALTY / SWITCHING.

The model is evidence-based where possible and remains open to first-party validation.

## 7. Content jobs

The system should serve six primary content jobs:

### Decision support
Help a parent understand what to choose and how to compare options.

### Problem solving
Help a parent handle uncertainty, adaptation, resistance, safety and other practical problems.

### Expert authority
Expose the school's real expertise, methodology and accumulated experience.

### Relationship / brand
Build familiarity with the owner, teachers, philosophy and culture.

### Local relevance
Connect the school to Serpukhov, local context, events and community life where genuinely useful.

### Conversion / retention
Help a ready parent take the next step and help an existing family understand value, progress and continuation.

## 8. Content categories

Content can be expressed through several recurring categories:

- authorial;
- educational;
- problem-oriented;
- decision-support;
- comparative;
- local;
- commercial;
- proof / progress;
- Radar-driven timely content.

These are categories, not mandatory weekly quotas.

## 9. Content asset model

One underlying idea should be treated as a reusable content asset rather than as one post.

A core asset can be adapted into:

- VK post;
- Telegram post;
- long-form site article;
- Dzen article when justified;
- short video script;
- video caption;
- carousel / visual summary;
- FAQ / SEO block;
- follow-up or retention message.

The channel determines the presentation, not the underlying truth.

## 10. Channel principle

A channel must have a defined job. A channel should not be added only because competitors use it.

Initial channel roles are defined in `CHANNEL_STRATEGY.md`.

## 11. Planning principle

Content planning is not a single universal calendar.

The Planner should eventually generate plans per channel from the same strategic content system, while respecting:

- channel role;
- format;
- audience stage;
- publication frequency;
- content fatigue;
- current assets;
- Radar signals;
- Analytics feedback.

## 12. Analytics feedback loop

Future loop:

Published asset → platform metrics → normalized analytics → interpretation → audience/content insight → Research/Audience updates → strategy refinement.

Writer and Retriever should not be repeatedly modified because of isolated subjective reactions. Changes should be evidence-driven after sufficient data accumulates.

## 13. Boundaries

This architecture does not currently create a separate SEO Architect role. SEO is a strategic input and specialist method inside the content system. A separate SEO role should only be introduced when SEO becomes a materially independent operating domain.

## 14. Definition of done for v1

The architecture is considered operational when:

- Content Strategy exists;
- Channel Strategy exists;
- Planner can translate strategy into channel-specific plans;
- approved assets can reach Publisher;
- Analytics can later return performance evidence;
- Strategy is treated as a controlled system rather than a collection of ad hoc post ideas.
