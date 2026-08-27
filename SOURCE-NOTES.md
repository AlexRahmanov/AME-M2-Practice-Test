# Source Import Notes

This build uses the new `AME M.zip` material supplied for the rebuild.

## Imported question counts after cleanup

- Airframe (AF): 281
- Powerplant (PP): 1,649
- Standard Practice (SP): 799
- CARs: 835
- AME-M Practice: 200
- Total available across all banks: 3,764

Cleanup removes exact duplicate question stems, entries without four usable choices, entries without a definite source answer, and obvious extraction artifacts.

## CARs scope

The CARs bank imports the marked-answer AME regulation/practice sets. The Airside Driver Permit / AVOP practice file is intentionally excluded because it is not an AME CARs examination bank.

Several unmarked/scan-style CARs source files were also not imported automatically where a dependable per-question answer could not be recovered from the document without additional manual reconciliation.

## Figures

Usable embedded figures were extracted from Standard Practice and the dedicated Powerplant image-question source and are stored in `assets/`.

## Accuracy note

These are source-derived study questions. In particular, older CARs study material can contain legacy terminology or references. Regulatory questions should be audited against the current Canadian Aviation Regulations before the site is described as a current verified regulatory question bank.
