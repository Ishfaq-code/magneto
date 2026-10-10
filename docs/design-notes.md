# Design notes

All dimensions are millimeters. The solid source controls geometry; animations show intended motion without modeling forces or contact.

## Servo and manual reset

Ten printed bodies: standalone servo docking base, removable cell base with integrated supports and stem guide, reading plate, transverse catch carrier, and six ball-seat plungers. The removable module has the same base, plate, carrier and plungers as a rail cell. Single-cell module geometry is 20 mm lower than the rail geometry; no part dimensions change. Reading surface is Z 62 standalone / Z 82 on the rail. The carrier releases with a 6 mm outward (+Y) pull. Its six ramped catches and integral return leaves remain unvalidated flexures.

The standalone base is 110 × 90 × 4; the removable cell footprint is 49.5 × 70; dot pitch is 20 and lift is 2.4. Four support posts at X ±22, Y ±30 support the module underside at Z 36.5. Each locating peg has radius 1.4 and height 1.2; matching underside sockets have radius 1.65 and depth 1.55. These clearances are provisional. The module includes four lid supports, pilot screw holes, lid clearance holes and a stem guide with 2.5 mm bores. Lid fastening and servo mounting need physical verification. The cell may be removed from the standalone docking base and placed in the rail casing; the casing and rail motion are optional add-ons. SG90s, horns and balls are bought hardware; do not print the assembly as one object.

Each plunger has a shallow spherical glue seat: outer diameter 6, top Z 58.2, ball center Z 59.5, and spherical cutter radius 2.55 (0.05 radial glue clearance). The 5 mm ball is flush with the reading plate at rest and protrudes 2.4 when raised. Seat depth is 1.25; these seat and glue dimensions are provisional. Glue the ball into the cup, keeping adhesive off the guides. The shoulder and servo foot keep their existing geometry; gravity return and fit of the printed 2 mm stems require physical testing. Balls are separate bought bodies in the assembly and excluded from each plunger 3MF.

The earlier viewer used separate intersecting primitives. The solid rebuild unions connected shapes and subtracts openings. Printed components are verified to have closed edges and one connected solid each. This does not establish assembly clearance, adequate catch force, servo torque, wear, print orientation, or reliable gravity reset. Prototype one channel and adjust parameters before relying on the full cell.

## Four-part drive

Flat carriage 100 × 80 × 5; long arm centers 90 apart; crank radius 35. Purchased bearing nominal ID 1/8 inch (3.175), OD 3/8 inch (9.525), with assumed width 3.175. M3 × 16 screws were specified by the user. Nominal 5 mm shaft and 4.5 mm flat dimension remain assumptions for the Oriental Motor PK244M-03BA adapter; physically measure the shaft before printing. Bearing bores use 0.15 diameter clearance. The carriage compartment and guide channels are separate future parts.

## Readable research reconstruction

See `web/documents/readable-measurements.csv` and `reconstruction-notes.txt` for source measurements and approximations. Its 27-object assembly export is a research visualization. Geometry includes illustrative hardware and does not constitute validated manufacturing CAD.

## All-printed eight-cell reset prototype

See `cad/eight-cell/reset-source.mjs` and its README. A closed-fork bracket, rigid gravity-return flap and a user-supplied 3 mm × 16 mm nail service eight transverse carriers. This supersedes the thin spring-loop station. The horizontal Y-axis pivot is at (-25, -60, 87); the carrier tip extends to Y=-52 and moves 6 mm in +Y on return. The cam stays outside the casing while the flap lifts on forward travel. A broad stop carries return contact loads. The flap has a closed 3.4 mm bore, the near cheek a 3.3 mm entry bore, and the far cheek a provisional 2.9 mm blind socket retaining the nail and enclosing its point. Hub width is 6 mm; fork gap 7.5 mm; cheek thicknesses 2.5 and 7 mm. The nail envelope assumes 16 mm under-head length including a 2 mm point; its 6 mm head diameter and 1.2 mm thickness are provisional. Measure the actual nail and tune the fit before printing. Bought nail geometry is excluded from 3MF print exports. The carriers retain their 0.8 mm return leaves; there is no spring in the fixed station. Keep the device upright. Gravity settling, pivot friction, nail retention, contact geometry and carrier springs require a one-cell physical test. Browser and 3MFs share the same reset solids. The animation assumes motion and is not evidence of mechanical reliability.

The shared base includes six collar rest stops, each with a 2.5 mm stem bore. Their tops sit at rail Z 65.4 (standalone Z 45.4), supporting the lowered collar. Side pillars clear the contact foot, and stop bridges sit above its maximum lift. These stops establish the modeled blank height without relying on the servo horn to support a loose plunger. Print clearances remain provisional.

## Visual electronics

Both viewers use the shared `createElectronics` model in `web/cardboard-shell.js`: Jetson Nano with a heatsink and ports, Arduino, a power supply placeholder, servo distribution board and illustrative wire paths. The Electronics + wires button directly beneath Cardboard shell controls their visibility. These are approximate bought-hardware visual placeholders, not CAD mounting envelopes or verified electrical connections. They are not included in printed-part 3MFs. Electronics follow the shell floor placement, while servo wire ends follow the fixed station height.

The eight-cell tray has a removable front panel, three lower locating tongues and straight finger joints at both ends. Two chunky fingers per panel end interleave with a tray finger, with 0.15 mm provisional clearance per mating face. The previous loose locking pins and ears are superseded. Pull the panel outward to load cells; friction alone retains it during operation, and must be tested. See `cad/eight-cell/README.md` for print files and assembly details.

## M3 cell lid fastening

Each cell uses four bought M3 × 8 mm machine screws, M3 × 0.5 thread, without washers in the nominal length stack (32 screws for eight cells). The 2 mm reading plate has Ø3.3 mm clearance holes. Its integral support posts have Ø2.5 mm blind tap pilots, 9 mm deep from the post top. Cut M3 × 0.5 threads after printing; these exports do not contain printed threads, insert pockets, or self-tapping screw provisions. Prepare at least 6 mm of usable thread for the nominal 6 mm screw engagement; use an appropriate blind-hole cutting tap and verify actual depth and screw fit. The pilot diameter follows the conventional M3 cutting-tap range: https://guhring.com/ProductsServices/SizeDetails?EDP=9041550030000 .

Printed fit, thin post walls and thread strength remain provisional, especially in resin. Test one fully cured post before assembling all cells; do not force an untapped hole. Separate lid standoffs are unnecessary because the supports are integral. This update applies to the cell lid connections in both standalone and rail variants; servo hardware and the separate nail reset pivot retain their existing specifications. Older single-cell ZIP packages are not updated and must not be used for this revision; use the freshly rebuilt individual cell-base and reading-plate 3MFs.


## Wheeled cart animation (supersedes sliding shoes and rails)

The tray now has four provisional end-mounted pads and connecting extensions for bought wheel supports. Local wheel centers are X −410 and +70, Y ±94, Z 38 mm. End placement keeps the extensions clear of the fixed reset bracket across X −50…+350 mm travel. The unchanged motor and two arms drive the cart; cell and servo heights are preserved. Casing browser mesh and casing 3MF share the updated solid source. Mount holes and actual LEGO attachment are not specified.

Four browser-only bought-wheel placeholders have Ø28 mm tires, 10 mm width, nominal Ø4 mm axle envelopes and illustrative support blocks. They rotate by travel / radius. The raised platform has two 940 × 60 × 6 mm running surfaces at top Z 24 mm, with an open center for the station; outer guide edges have 1 mm nominal tire-side clearance. These are concept envelopes, not measured LEGO dimensions or print exports. Legacy rail-support exports are obsolete for this variant. Platform stiffness, anchoring, wheel play, tire compression, lateral guidance and attachment need physical development. Existing geometry checks do not validate those properties or mechanical reliability.
