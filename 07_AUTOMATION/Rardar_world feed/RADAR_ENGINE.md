# RADAR / WORLD FEED ENGINE v1

## Purpose
Continuous external-information acquisition for Dance Content Engine.

This is an ENGINE, not a dance-specific implementation. The subject domain is supplied by a profile.

## Modes
### World Feed
Broad global discovery. It may find important dance stories, championships, research, child-development findings, unusual cultural events, and other relevant discoveries worldwide.

### Radar
Targeted monitoring of selected topics, entities, sources and geographies. It detects new, changed and recurring signals.

Both use the same pipeline.

## Pipeline
SOURCE → COLLECT → RAW ITEM → NORMALIZE → RELEVANCE → CLASSIFY → SCORE → DEDUPLICATE → FACT/SIGNAL → STORE → DOWNSTREAM AI

## Responsibilities
Collector: obtain external data.
Normalizer: common structure.
Classifier: determine scope/topic/audience.
Scorer: relevance, importance, freshness, confidence.
Deduplicator: merge safe duplicates.
Knowledge writer: preserve evidence and structured records.
Content Engine: later decides what to publish.

Radar NEVER directly publishes content.

## Geographic layers
LOCAL: Serpukhov and nearby context.
RUSSIA: Russian dance/children/education/culture/sport.
GLOBAL: world dance and directly related science/education/health/culture.
SOURCE-INDEPENDENT: useful discoveries where geography is secondary.

## Topic layers
L1 CORE DANCE: dance, ballroom, choreography, ballet, modern, contemporary, hip-hop, K-pop, jazz-funk, training, pedagogy, performance, competitions.
L2 CHILD DEVELOPMENT: only when directly connected to movement, activity, adaptation, motivation, confidence, learning, etc.
L3 HEALTH/SAFETY: only when directly connected to children + physical activity/dance, injury prevention, load, recovery, posture/movement, age-appropriate activity.
L4 NUTRITION/RECOVERY: only in relation to children, activity, training or recovery.
L5 EDUCATION/PSYCHOLOGY/PARENTING: adaptation, motivation, performance anxiety, discipline, practice, parent-child communication around training.
L6 LOCAL ECOSYSTEM: Serpukhov events, competitions, venues, cultural institutions, local media/communities.
L7 DANCE WORLD: major championships, international competitions, notable dancers/teams, traditions, important professional/cultural developments.
L8 ADJACENT OPPORTUNITY: only where a clear bridge to children, parents, dance, education, activity or content exists.

## Critical rule
Do NOT become a generic news aggregator.
The question is not "is this interesting?" but "can this become useful knowledge for our audience, expertise, content or local relevance?"

## Evidence model
Every durable record is FACT, SIGNAL or HYPOTHESIS.
FACT requires source evidence.
SIGNAL is an observed event/trend/change that may deserve attention.
HYPOTHESIS is an AI interpretation requiring validation.

Never turn AI inference into FACT.

## Scores
Keep separate 0–100 scores:
- dance_relevance
- audience_relevance
- content_relevance
- local_relevance
- importance
- freshness
- source_confidence

One aggregate score must not replace these dimensions.

## Storage
Raw/volatile observations: 02_RESEARCH or runtime storage.
Durable structured knowledge: 01_KNOWLEDGE.
Engine configuration/specification: 07_AUTOMATION.
Historical observations must not be silently overwritten.

## Source provenance
For each item preserve source name, URL/identifier, observed date, publication date if available, source type, and confidence.

## Health/medical rule
Collect only directly relevant evidence. Preserve limitations and source quality. Radar is not a medical advisor.

## Unexpected discovery rule
World Feed may discover items outside the keyword list. They enter durable knowledge only after relevance classification.

## Incremental operation
Each run finds:
- new items;
- changed items;
- duplicates;
- repeated signals/trends.

Volatile facts such as prices, schedules and offers keep observation dates.

## Failure rule
Source failure is logged; other sources continue. Never fabricate missing data.

## Design goal
Adding a source or changing the topic profile must not require rewriting the core engine.
