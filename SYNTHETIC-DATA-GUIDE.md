# Crowe Keystone — Synthetic Data Instructions

Generate a realistic discovery session transcript for use in testing the Keystone pipeline end-to-end.

---

## Context

Keystone is an internal Crowe IRM AI tool that processes discovery session transcripts
from client engagements. The transcript is uploaded as a `.txt` file, then run through
a 6-node AI pipeline that filters noise, researches the client, disambiguates acronyms,
extracts a content outline, and compiles a deck brief Word document.

This guide tells you exactly what to generate so the pipeline can be tested end-to-end.

---

## What to Generate

A single `.txt` file: `discovery-session-transcript.txt`

This is a Fireflies.ai transcript of a 90-minute discovery session between a Crowe
consulting team and a mid-sized regional bank's internal audit and AML leadership.

---

## Client Profile

- **Client name:** Riverside Community Bank (Synthetic)
- **Industry:** Community Banking
- **Engagement type:** Internal Audit Program Assessment + AML Program Review
- **Session date:** April 2025
- **Location:** Virtual (Teams call)

**Client attendees:**
- Chief Audit Executive (CAE)
- Director of BSA/AML Compliance
- VP of Internal Audit — Credit Risk
- AML Investigations Manager

**Crowe attendees:**
- Engagement Partner
- Senior Manager (IRM)
- Manager (IRM)

---

## Transcript Requirements

### Format
Write it as a Fireflies.ai transcript — meaning it is speaker-labeled, time-stamped,
and reads like a verbatim recording. It should feel raw, not polished. Include:
- False starts and self-corrections
- Natural interruptions
- People talking over each other occasionally
- Filler words (um, uh, you know, so)
- Moments where someone asks to repeat or clarify

### Length
Approximately 2,000–2,500 words of actual dialogue (not counting timestamps/headers).

### Structure

**Opening (will be filtered out by the pipeline — intentionally noisy):**
- Logistics: waiting for people to join, audio checks, "can everyone hear me"
- Introductions around the call
- Quick agenda recap

**Core content (this is what the pipeline extracts value from):**

The conversation should cover the following topics authentically — not as a clean list,
but woven into natural back-and-forth dialogue:

1. **Current state of the internal audit program**
   - Audit committee reporting cadence and relationship
   - Size of the IA function (headcount, co-source vs. outsource)
   - Current audit universe and coverage gaps
   - Use of data analytics in fieldwork — what they have vs. what they want
   - Biggest pain points: resource constraints, keeping up with regulatory expectations,
     reliance on manual testing

2. **Model risk and audit coverage of models**
   - How many models in the inventory
   - Whether IA has visibility into the model risk management function
   - Validation backlogs and vendor model challenges
   - SR 11-7 compliance status

3. **BSA/AML program**
   - Transaction monitoring system (vendor name optional — can be generic "our TMS")
   - Alert volumes and disposition rates
   - SAR filing volumes and quality review process
   - KYC/CDD refresh program — backlog issues
   - High-risk customer onboarding procedures
   - FinCEN 314(a) and 314(b) processes
   - Concerns about keeping pace with typology updates
   - Staffing — investigators, analysts, how many FTEs

4. **Regulatory environment and recent exams**
   - Most recent OCC exam findings (no MRA/MRIA details — keep vague for safety)
   - Any consent order history or current commitments (keep vague)
   - Relationship with their primary regulator
   - Upcoming exam cycle expectations

5. **Priorities for the engagement**
   - What the CAE wants Crowe to focus on
   - What AML director is most worried about
   - Timeline pressures (board presentation, exam window)
   - Budget constraints mentioned casually

**Closing (will be filtered out by the pipeline):**
- Next steps discussion
- Document request list mentioned
- Scheduling follow-up
- Sign-offs

---

## Acronyms to Include Naturally in the Text

The pipeline's research agent and disambiguator will identify and expand these.
Sprinkle them throughout naturally — do not define them in the transcript itself.

| Acronym | What it stands for |
|---------|-------------------|
| BSA | Bank Secrecy Act |
| AML | Anti-Money Laundering |
| SAR | Suspicious Activity Report |
| KYC | Know Your Customer |
| CDD | Customer Due Diligence |
| EDD | Enhanced Due Diligence |
| TMS | Transaction Monitoring System |
| CTR | Currency Transaction Report |
| FinCEN | Financial Crimes Enforcement Network |
| OCC | Office of the Comptroller of the Currency |
| MRM | Model Risk Management |
| SR 11-7 | Federal Reserve / OCC Model Risk Management Guidance (SR Letter 11-7) |
| MRA | Matter Requiring Attention |
| MRIA | Matter Requiring Immediate Attention |
| CAE | Chief Audit Executive |
| IA | Internal Audit |
| FTE | Full-Time Equivalent |
| RCSA | Risk and Control Self-Assessment |
| QA | Quality Assurance (in context of SAR review) |
| CIP | Customer Identification Program |

---

## Tone and Realism Notes

- The CAE should be thoughtful and strategic — focused on audit committee relationships
  and resource constraints.
- The BSA/AML Director should be more operational and slightly defensive about their
  alert volumes and staffing.
- The AML Investigations Manager should be specific and detail-oriented — the one who
  knows the exact numbers.
- Crowe's team should ask open-ended questions and probe — not pitch.
- There should be at least one moment where the client says something candid that they
  half-walk back ("I probably shouldn't say this on a recorded call, but...").
- Include at least one disagreement or tension between client attendees about priorities.

---

## Output

Save the file as: `discovery-session-transcript.txt`

This file gets uploaded directly into the Keystone app to test the full pipeline.
