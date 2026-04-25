# Product Configuration Model v221

v221 adds a pricing scenario library for repeatable testing.

This is important because print pricing needs repeatable examples:

- Business card, 85x55, 350gsm silk, matt laminate, qty 500
- Banner, custom 1200x3000mm, hem + eyelets, qty 1
- Booklet, A5, 16pp, 170gsm inner, 300gsm cover, qty 250

The scenario library lets the admin save these product/option/quantity combinations and re-run pricing diagnostics without manually rebuilding the payload each time.

This prepares the next phase: comparing expected manual print-shop prices against calculated SaaS prices.
