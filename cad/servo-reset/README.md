# Detachable single-cell CAD concept

The shared cell base restores six side-loading stem slots (2.5 mm) and lower foot-entry openings (6.6 mm). Load from the nearest left/right side with the lid and carrier removed and the module undocked. The slotted base is shared with the eight-cell CAD and both export formats. Open slots do not laterally retain loose plungers; verify assembled retention and fit physically. See the eight-cell CAD notes for the provisional assembly requirements.

Edit `parameters.json` and `servo-source.mjs`; run `npm run build:cad` and `npm run check`. Browser geometry and 3MF exports share these solids.

The standalone view shows the complete passive top module separating vertically from a compact 110 × 90 mm servo base. The 40 mm separation is an inspection illustration. Sliding operation belongs to the eight-cell tray, which carries all eight cells on two fixed rails underneath.

The top module owns its cell base, guides, six plungers, bought balls, catches and reading plate. Locating posts seat the module on the standalone base. Servos contact the feet from below and retract before detachment. Raised dots and gravity retention remain with the detached module. Writing is disabled while detached. The standalone servo hardware is lowered 1 mm to clear the base; nominal horn-to-foot clearance is 2.35 mm.

This remains concept geometry. Guide assembly access, lid fastening, locating fits, catch fatigue, friction and physical retention need development and printed trials. `scripts/check-guide-slots.mjs` checks sampled detachment, pin lift and gravity stops; it does not prove mechanical reliability. Previously packaged single-cell ZIPs describe earlier designs.


## M3 cell lid fastening

Each cell uses four bought M3 × 8 mm machine screws, M3 × 0.5 thread, without washers in the nominal length stack (32 screws for eight cells). The 2 mm reading plate has Ø3.3 mm clearance holes. Its integral support posts have Ø2.5 mm blind tap pilots, 9 mm deep from the post top. Cut M3 × 0.5 threads after printing; these exports do not contain printed threads, insert pockets, or self-tapping screw provisions. Prepare at least 6 mm of usable thread for the nominal 6 mm screw engagement; use an appropriate blind-hole cutting tap and verify actual depth and screw fit. The pilot diameter follows the conventional M3 cutting-tap range: https://guhring.com/ProductsServices/SizeDetails?EDP=9041550030000 .

Printed fit, thin post walls and thread strength remain provisional, especially in resin. Test one fully cured post before assembling all cells; do not force an untapped hole. Separate lid standoffs are unnecessary because the supports are integral. This update applies to the cell lid connections in both standalone and rail variants; servo hardware and the separate nail reset pivot retain their existing specifications. Older single-cell ZIP packages are not updated and must not be used for this revision; use the freshly rebuilt individual cell-base and reading-plate 3MFs.


## Extra guide clearance revision

The upper stem guide is raised 0.6 mm: its rail center is Z 72.6 mm (standalone Z 52.6 mm). Its 2 mm thickness, side-entry slots, lower stop, catch, plunger and lid heights are preserved. Collar-to-guide underside headroom at rest increases from 4.4 to 5.0 mm; the previous CAD already exceeded the requested 3 mm guide-travel allowance. Checks now explicitly sample 0–3 mm of plunger travel against the base and lid, while prescribed operating lift stays 2.4 mm. This is extra geometric clearance, not a 3 mm hard stop or validation of printed fit. The distinct STL is `exports/cell-base_slotted_extra-0p6mm-headroom_CONCEPT.stl`.


## Screw-fastened plunger keepers

Two removable comb strips close the six side-entry slots near their final shaft positions. Print one left and one right keeper per cell (16 strips total for eight cells), plus the revised cell base with four dedicated pillars at X +/-22, Y +/-10 mm. Do not use an earlier base without these pillars. Each strip is fastened with two additional bought M3 x 8 screws: 3.3 mm clearance holes in the keeper and 2.5 mm blind tap pilots, 8 mm deep, through the upper guide into the pillars. Cut M3 x 0.5 threads; allow at least 6 mm usable thread and verify depth before fastening. This adds four screws per cell, 32 for eight cells, beyond the lid screws.

Insert plungers with the lid, carrier and keepers removed and the module undocked. Slide the keepers inward along X, then secure their screws before finishing assembly. For service remove screws and slide the keepers outward with the cell out of its tray. The tongues have 0.2 mm side clearance in the slots; their inner tips leave 0.45 mm nominal shaft clearance. They block direct sideways escape near the shaft rather than only at the outer plate edge. Some lateral play remains; this is not a zero-play bearing. Upper-guide clearance, 2.4 mm operating lift and stop/catch heights are unchanged. Tests check side loading without keepers, keeper removal, 0–3 mm vertical guide travel, and outward shaft interference with installed keepers. Screw/thread strength, flexure, wear, printed fit and all possible escape paths under load still require a physical trial.


## Fastening and horn clearance audit

Only the reading plate (four M3 x 8 screws) and keepers (four additional M3 x 8 screws) have detailed screw provisions on the passive module. The guide plates, pillars and stops are one integrated printed base. The cell-to-station pegs locate rather than fasten it; servo body mounting, horn fastening and a station-to-frame connection are not detailed fabrication interfaces. Therefore the entire single cell is not yet a fully screw-fastened assembly.

`check-horn-clearance.mjs` samples all six horns at 61 poses in both variants with a 0.5 mm expanded modeled horn envelope. It checks against all printed non-plunger parts. The existing bottom guide openings pass without CAD changes. Real horn shape, attachment screw, servo placement and printer error must be measured before treating this as physical clearance.
