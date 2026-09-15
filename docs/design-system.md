I want to redesign the existing Bluevua Klaviyo Email & SMS Marketing Dashboard.

IMPORTANT:
Do NOT change any existing data queries, Supabase logic, KPI calculations,
date comparison logic, AI analytics logic, or API integrations.

This task is primarily a UI/UX redesign.

We currently use BoardUI. Keep BoardUI where it works well for dashboard
structure, controls, tables, and charts.

You may introduce selected components from Spectrum UI:
https://ui.spectrumhq.in/

Do NOT migrate the entire application to another UI framework.

--------------------------------------------------
DESIGN DIRECTION
--------------------------------------------------

The dashboard should feel like a modern AI-native marketing analytics product.

Visual references:
- Linear
- Stripe Dashboard
- Vercel
- modern SaaS analytics products

Desired qualities:
- minimal
- editorial
- data-dense
- premium
- strong information hierarchy
- generous but controlled whitespace
- subtle interaction and motion

Avoid:
- generic admin dashboard appearance
- grids of identical KPI cards
- excessive borders
- excessive rounded containers
- unnecessary gradients
- decorative animation
- every metric having equal visual importance

--------------------------------------------------
DESIGN SYSTEM
--------------------------------------------------

SURFACES

Page background:
#FAFAFA or equivalent subtle neutral.

Primary surfaces:
white.

Secondary surfaces:
very subtle neutral background.

Borders:
low contrast.
Use borders only when they improve hierarchy.

Do not put every section inside a visible bordered card.

RADIUS

Primary containers:
approximately 16px.

Controls:
8–10px.

Avoid excessive pill-shaped UI.

TYPOGRAPHY

Page title:
28–32px.

Section titles:
20–24px.

Primary KPI:
32–40px.

Secondary KPI:
22–28px.

Metadata / labels:
12–13px.

Use typography and spacing to establish hierarchy before adding containers.

--------------------------------------------------
COLOR SYSTEM
--------------------------------------------------

Blue:
interactive / selected / informational.

Green:
positive performance.

Red:
negative performance or risk.

Amber:
warning / attention.

Gray:
neutral information.

Do not color metrics unless the color communicates meaning.

--------------------------------------------------
MOTION
--------------------------------------------------

Use subtle motion only for:

- KPI value changes
- AI insight loading
- chart transitions
- hover interactions
- expanding AI analysis

Avoid decorative animation.

Spectrum UI components may be used selectively for these interactions.

--------------------------------------------------
INFORMATION HIERARCHY
--------------------------------------------------

Not all KPIs should have equal visual weight.

Primary business outcomes should dominate visually.

For example:

Total EDM Revenue = primary business KPI

Email Revenue / SMS Revenue = channel breakdown

Flow Revenue / Campaign Revenue = revenue source breakdown

Recipients = volume / reach metric

Do NOT render all six as identical cards.

Use composition, typography, whitespace, charts, and grouped metrics
to communicate their relationships.

--------------------------------------------------
PAGE STRUCTURE
--------------------------------------------------

Redesign the Overview page approximately around this hierarchy:

1. Compact Dashboard Header
2. Executive KPI Overview
3. AI Performance Insights
4. Business Overall
5. List Health
6. Channel Performance
7. Flow Performance
8. Campaign Performance
9. A/B Testing / Creative Performance

The most important insights should appear above the fold.

--------------------------------------------------
AI PERFORMANCE INSIGHTS
--------------------------------------------------

AI Performance Insights should be one of the signature components
of the dashboard, not another generic card.

It should visually communicate:

- What changed?
- Why did it change?
- What looks unusual?
- What should the marketing team do next?

Structure the AI section around:

Headline insight

Supporting explanation

Key drivers

Risks / anomalies

Recommended actions

Relevant supporting metrics

Example:

Revenue grew 22.3% despite declining recipients.

+45.4% SMS Revenue
+24.7% Flow Revenue
-28.1% Recipients

Key Driver
...

Risk
...

Recommended Action
...

Provide an "Ask AI" interaction below the analysis.

Use Spectrum UI selectively if components improve this experience.

--------------------------------------------------
BUSINESS OVERALL
--------------------------------------------------

Do NOT display:

Total EDM Revenue
Email Revenue
SMS Revenue
Flow Revenue
Campaign Revenue
Recipients

as six identical cards.

Instead create a visual hierarchy.

For example:

Large primary revenue area:
$215.4K
Total EDM Revenue
+22.3%

Include a small revenue trend visualization.

Then provide:

CHANNEL MIX

Email Revenue
SMS Revenue

and:

REVENUE SOURCE

Flow Revenue
Campaign Revenue

Recipients can be displayed as a supporting operational metric.

--------------------------------------------------
COMPONENT STRATEGY
--------------------------------------------------

BoardUI:
- dashboard layout
- sidebar
- controls
- tables
- existing chart infrastructure

Spectrum UI:
- AI insight interactions
- KPI presentation
- animated numbers
- status indicators
- subtle interactive cards
- AI prompt / Ask AI interaction
- micro-interactions

Charts:
Continue using the existing chart library unless there is a strong
technical reason to change it.

Do not add another complete UI framework such as MUI, Ant Design,
or Mantine.

--------------------------------------------------
IMPLEMENTATION PROCESS
--------------------------------------------------

Before modifying code:

1. Inspect the current Overview page and related components.
2. Identify reusable BoardUI components.
3. Identify repeated generic KPI card patterns.
4. Identify which components should be visually redesigned.
5. Check the existing responsive behavior.
6. Identify appropriate Spectrum UI components if useful.

Then create a short redesign plan.

After that, implement the redesign.

IMPORTANT:

Preserve all existing dashboard functionality and calculations.

Prefer refactoring presentation components instead of rewriting
business/data logic.

The final implementation must remain responsive and work well on
desktop widths around 1440–1920px as well as smaller screens.

Do not redesign the sidebar navigation architecture unless necessary.

Start with the Overview page only.