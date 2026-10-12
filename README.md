# CreativeWise app icons

Icons for the apps on the CreativeWise dashboard, in two styles:

- **card**: a lime glyph on a green card, a sky card tilted behind, and print grain. In `card/`.
- **lime**: the glyph alone in the brand lime, with the grain, on a transparent background. For a tile that is already green. In `bare/lime/`.
- **cotton**: the same in cotton. In `bare/_cotton/`.

`bare/cotton/` is where the first no-card links pointed. It is kept so those links work, and holds whichever no-card set is in use: lime at the moment, despite the name.

All are 512 by 512 PNGs. The card style at 1024 by 1024 is in `1024/`.

## Which style the links serve

The icons at the top of the repo (`games.png`, `vpn.png`, ...) are the ones
the dashboard links to. They are a copy of one of the three sets, and the file
`CURRENT` says which. To switch every icon at once:

```bash
npm run use lime   # or: cotton, or card
git commit -am "Switch the icons to lime" && git push
```

GitHub can take about five minutes to serve the new files. The links never
change, so nothing on the dashboard has to be touched. To pin one style
whatever `CURRENT` says, link into `card/`, `bare/lime/` or `bare/_cotton/` instead.

| File | App | Icon |
| --- | --- | --- |
| `games.png` | Games | horseshoe with a star |
| `play-hard.png` | Play Hard (time off) | umbrella and deck chair |
| `solidtime.png` | solidtime | stopwatch |
| `vaultwarden.png` | Vaultwarden | safe door |
| `vpn.png` | VPN | shield with a globe |
| `booking.png` | Meeting booking | calendar with a clock |
| `recording.png` | Screen recording | video camera |
| `compress.png` | File compression | shape squeezed by two arrows |
| `notes.png` | Meeting notes | speech bubble with a sound wave and pencil |
| `shelf-check.png` | Shelf Check | shelf with a star |
| `motion.png` | Motion graphics | bouncing ball |
| `longhorn.png` | Longhorn | the Longhorn project's own mark, restyled to match |
| `project-hub.png` | Project Hub | ring binder with index tabs |

The bare glyphs everything is made from are in `glyphs/`.
`tools/make-variants.mjs` makes every icon in other colours from them.

New ones are made with `tools/make-icons.mjs` (see the top of that file).

To use one, link to its raw file:

```
https://raw.githubusercontent.com/creativewise-co/cw-icons/main/games.png
```
