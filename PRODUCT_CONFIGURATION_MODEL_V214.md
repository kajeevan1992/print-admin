# Product configuration model v214

v214 starts connecting product option setup to print production estimates.

A product option setup should eventually provide:

- selected finished size: width/height
- bleed allowance
- pages and sides
- source sheet/roll/board dimensions
- production kind: sheet, roll, board
- quantity

The pricing engine can then calculate production requirements before money is calculated.

## Business card / flyer / booklet
- product kind: sheet
- source: SRA3/SRA2/cut sheet
- finished size: selected product size
- ups per sheet: calculated from source sheet and finished size
- sheets required: quantity × page sets / ups
- impressions: sheets × sides

## PVC banner
- product kind: roll
- source: roll width
- finished size: custom width/height
- width must be within printable roll/printer width
- length can be long but should later check roll length and handling limits

## Board/signage
- product kind: board
- source: board sheet size
- finished size: selected/custom size
- ups per board: calculated from source board and finished size
- cutting/routing time comes later
