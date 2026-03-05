# Cursor Update — Deal Terms + Scenario Model Final Pass

---

## Deal Terms Page

### 1. Update round status text
Change the second line from:

"~20% committed. Strategic investors in biotech, pharma, and ophthalmology."

To:

"Current investor pool includes strategics in biotech, pharma, and ophthalmology."

Same styling: Inter 400, 13px, slate.

### 2. Move >$100K callout into Common SPV Questions accordion
Remove the green callout box for checks above $100K. Add it as a new accordion item in Common SPV Questions:

**Q:** "Can I invest more than $100K?"
**A:** "The maximum guaranteed allocation is $100,000 per investor. For larger checks, additional allocation may be available depending on what remains in the round. If you're considering more than $100K, call or text me and we can discuss — 360-318-4480."

### 3. Update SPV Terms copy
Change the SPV Terms text to:

"This SPV is administered by AngelList. 20% carry on profits, no fees, and pro-rata rights to participate in PST's next round."

Inter 400, 14px, charcoal. No bold, no underline.

### 4. Tighten Next Steps spacing
Reduce the vertical spacing in the Next Steps section:

- Gap between numbered steps: 12px (down from 16px)
- Top margin above the "NEXT STEPS" label: 28px (down from 36px)
- Bottom margin below the label: 12px (down from 16px)

---

## Scenario Model Page

### 1. Fix Combined Dilution Factor row height
The "Combined Dilution Factor" row in the Series A Dilution card is taller than the other rows. Make it the same height as every other data row in the card — same padding (12px 20px), no extra spacing.

### 2. Update plain English dilution summary
Change:

"Your 0.20% seed ownership is reduced to **0.12%** after the Series A. This is what you own going into an exit event."

To:

"Your 0.20% seed ownership is reduced to **0.12%** after the Series A — what you'll own going into an exit event."

(One sentence instead of two.)

### 3. Remove carry mention from exit scenarios context paragraph
In the paragraph below "EXIT SCENARIOS", remove ", after 20% carry is deducted from profits" from the sentence. The carry is explained in the footnotes below the table. The paragraph should read something like:

"PST is pursuing a strategic acquisition following the top-line readout of a combined US Phase I/II clinical trial, targeted for Q1 2029. The table below shows what your investment could return at different acquisition valuations."

### 4. Add footnote markers to table headers
Add an asterisk (*) to "NET TO YOU" and "IRR" in the table column headers:

- "NET TO YOU" → "NET TO YOU*"
- "IRR" → "IRR†"

Then update the footnotes below the table to match:

"*Net to You reflects 20% carry on profits. If the investment does not generate a profit, no carry is charged."
"†IRR assumes a 4-year hold to Q1 2029 exit."

Same styling as current (Inter 400, 12px, ash).

### 5. Italicize Important Disclosures
Change all the text in the Important Disclosures section to italic (`fontStyle: "italic"`). Keep the "Important Disclosures" bold title in regular weight (not italic) — only the body paragraphs below it should be italicized.

---

## Checklist

- [ ] Deal Terms: round status updated (removed "~20% committed", added "current investor pool includes strategics")
- [ ] Deal Terms: >$100K callout removed, added as accordion question
- [ ] Deal Terms: SPV Terms copy updated
- [ ] Deal Terms: Next Steps spacing tightened
- [ ] Scenario Model: Combined Dilution Factor row height fixed
- [ ] Scenario Model: dilution summary rewritten as one sentence
- [ ] Scenario Model: carry mention removed from exit scenarios paragraph
- [ ] Scenario Model: footnote markers added to NET TO YOU* and IRR†
- [ ] Scenario Model: Important Disclosures body text italicized