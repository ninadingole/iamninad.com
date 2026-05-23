---
title: Now
excerpt: "What I'm focused on right now."
permalink: /now/
layout: layouts/default
route: now
statusPath: "~/.now"
lastUpdated: 2026-05-23
---

<nav class="Breadcrumb" aria-label="Breadcrumb">
  <a href="/">~</a>
  <span class="sep">/</span>
  <span class="here">.now</span>
</nav>

<div class="Prompt">
  <span class="u">{{ site.profile.handle }}</span><span class="at">@</span><span class="h">{{ site.profile.host }}</span><span class="colon">:</span><span class="p">~</span><span class="dollar"> $ </span><span class="cmd">cat .now</span>
</div>

<h1 class="About-Title"># now<span class="Caret" aria-hidden="true"></span></h1>
<div class="About-Meta">last updated {{ lastUpdated | date_formatted }} · inspired by <a href="https://nownownow.com/about" class="t-accent">nownownow.com</a></div>

<div class="About-Copy">
  <p class="About-Para is-primary">A snapshot of what's eating most of my attention this month. Updated whenever the answer shifts enough to be worth writing down. If you want to know what I'm <em>not</em> working on, it's everything else.</p>
</div>

## $ ls ~/work/

- Building out the founding-engineer scope. Mostly Go services, mostly the unglamorous data path.
- Hardening the Postgres → Kafka pipeline so it can lose a node without anyone noticing.
- A long-form post on exactly-once delivery that I keep promising myself I'll finish.

## $ ls ~/reading/

- *Designing Data-Intensive Applications*, Kleppmann — third time, still finding new things.
- *The Pragmatic Engineer* newsletter — Gergely's writing on staff-eng tracks.
- Various RFC drafts on streaming protocols, mostly out of curiosity.

## $ ls ~/learning/

- WebAssembly system interfaces — does it actually replace shelling out, or is it still a research project?
- A serious look at Rust for the data layer. Not committing yet, just reading.
- Working through some old testing books to sharpen the test-first reflex.

## $ ls ~/away_from_keyboard/

- Walking, mostly. Berlin in the spring is good for it.
- Coffee shops where the wifi is just slow enough that I have to think before I search.
- Cooking — slowly figuring out that "just follow the recipe" was advice I should've taken sooner.

---

This page is a [/now](https://nownownow.com/about) page. The convention: a single URL that answers "what are you focused on right now" without scrolling through a year of social posts. If you have one too, [add it to the list](https://nownownow.com/about).
