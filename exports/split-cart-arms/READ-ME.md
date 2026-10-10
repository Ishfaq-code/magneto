# Square-socket arms and removable axle holders — prototype

Millimeters. One 256 × 256 mm plate for the saved Centauri Carbon workflow in OrcaSlicer. These are geometry-only 3MFs: select your printer, filament, supports and brim, retain the arranged object positions, and inspect the sliced layers before printing. This revision replaces the previous arm puzzle joints and integral wheel extensions.

17 separate printable solids: 3 long-arm sections, 2 short-crank sections, 4 cart solids (two ends plus separate middle front/rear rails), 2 removable-front-panel sections, 4 axle holders, and 2 socket-fit-test halves. Hardware, axles, wheels, cell modules and reset parts are excluded. All 17 objects are nested on this single bed without scaling. Exact CAD projections verify at least 5 mm bed margins and 3 mm between silhouettes, including elevated geometry. Bounding rectangles may overlap because parts occupy the open spaces within other parts. Supports and brims may require adjustment; avoid brims wider than the available gap, and inspect the sliced plate before printing.

## Enclosed arm sockets

6 × 6 mm square peg, 16 mm engagement, nominal 6.4 × 6.4 mm blind socket. Clearance is 0.20 mm per face and at the blind end. The reinforced land is 16 mm wide × 12 mm high, with tapered transitions to the arm. At the socket the top/bottom walls are 2.8 mm and side walls 4.8 mm. Print and dry-fit the included coupon first. Clear supports from the hole and avoid forcing the peg. The square opening captures top, bottom and sides and limits twisting; adhesive is still needed to prevent axial pullout. No retaining screw is modeled.

Sections slide together along the arm length. Bond with an adhesive appropriate to the filament, use a flat alignment surface, check pivot center distances (225 and 550 mm), and follow the adhesive's cure instructions. Do not scale the parts. Joint strength, creep, fatigue and fit remain unvalidated.

## Removable axle holders

The long wheel-support extensions are removed from the cart. Four short, 6 mm-thick mounting pads remain. Each separate holder bolts UNDER a pad using two vertical Ø3.4 mm holes on 10 mm centers. Pad tops contain Ø6.2 mm counterbores 3.2 mm deep for recessed screw heads. Holder flange thickness is 4 mm. The holders have a broad bridge and a closed axle cheek rather than an unmeasured LEGO support block.

Provisional fastener plan: eight M3 × 12 socket-head screws, eight M3 nuts, and eight small washers under the holder flanges. Verify head diameter/height, actual washer/nut sizes, thread engagement, access and moving clearance before purchase/assembly. The recess leaves 2.8 mm of pad material below the head. Fasteners are separate hardware, not printed meshes. Remove the cell modules for tool access if needed.

Each holder has a Ø6.4 mm through-hole along Y, 10 mm bearing length, with axle center Z=38 mm. This is a holder interface, not a universal-fit claim. Make a matching axle later; its material, clearance, wheel hub, axial retention and wear need development. Wheel diameter 28 mm, wheel width 10 mm, and wheel centers Y=±94 mm remain visual placeholders. Do not assume compatibility with LEGO or any wheel kit. The deck is a concept.

Holder 1 is at the negative-X end; holder 2 at positive X. Front is negative Y; rear is positive Y. The end pairs have different reach and are not interchangeable. Nuts sit below the flange; the recessed heads must not protrude into the moving-arm path. Front-panel removal stays independent of holder removal.

## Cart and printing

Cart/front-panel finger joints still slide together lengthwise and require bonding. Filenames number sections from low to high original X. Middle cart 2a is the front rail; 2b is the rear. Bond the panel's own seam, but do not bond its original removable end fingers to the cart.

All exports retain original Z-up orientation and sit on Z=0. Enclosed horizontal sockets, the short-arm fork, and elevated holder flanges require support/bridge review in Orca; no support-free claim is made. Clear sockets before fitting. Individual files allow reorientation as desired; check strength and dimensional effects of print orientation.

Rebuild with `npm run build:cad`. CAD sources: `arms-source.mjs`, `split-source.mjs`, `casing-source.mjs`, and `wheel-mount-source.mjs`. The saved nesting is `single-bed-layout.json`, verified against current CAD at every build. Viewer/exports share those solids. The operating viewer shows the reinforced arm envelopes; the split preview shows actual peg/socket sections. Geometric checks do not establish mechanical reliability. Test manually and at low load before powered use.
