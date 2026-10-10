# Design notes

All dimensions are millimeters. The solid source controls geometry; animations show intended motion without modeling forces or contact.

## Servo and manual reset

Five printed bodies: housing/supports, separate reading plate, lower and upper pin guides, and one joined catch carrier/pull tab. The carrier has six narrow catch stems connected to common rails. The hook sits beneath a raised pin collar; a 5 mm rightward pull moves all hooks away. Individual stems are shown deflecting during writing, but no stiffness or fatigue calculation has validated them.

Base 110 × 90 × 4; dot pitch 20; dot lift 2.4; reading plate top at 62; pin radius 1; guide-hole radius 1.25; ball radius 3; reading-hole radius 3.15. These are enlarged prototype dimensions, not standard Braille. Housing posts have pilot holes; the lid has clearance holes. Guide supports are intended for attachment after printing, with fastening still to be developed. SG90s, horns, steel pins and collars are hardware envelopes. Do not print the assembled hardware model as one object.

The earlier viewer used separate intersecting primitives. The solid rebuild unions connected shapes and subtracts openings. Printed components are verified to have closed edges and one connected solid each. This does not establish assembly clearance, adequate catch force, servo torque, wear, print orientation, or reliable gravity reset. Prototype one channel and adjust parameters before relying on the full cell.

## Four-part drive

Flat carriage 100 × 80 × 5; long arm centers 90 apart; crank radius 35. Purchased bearing nominal ID 1/8 inch (3.175), OD 3/8 inch (9.525), with assumed width 3.175. M3 × 16 screws were specified by the user. Nominal 5 mm shaft and 4.5 mm flat dimension remain assumptions for the Oriental Motor PK244M-03BA adapter; physically measure the shaft before printing. Bearing bores use 0.15 diameter clearance. The carriage compartment and guide channels are separate future parts.

## Readable research reconstruction

See `web/documents/readable-measurements.csv` and `reconstruction-notes.txt` for source measurements and approximations. Its 27-object assembly export is a research visualization. Geometry includes illustrative hardware and does not constitute validated manufacturing CAD.
