import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type ArtworkSpec = {
  pages?: number | string
  width?: number | string
  height?: number | string
  bleed?: number | string
  fileType?: string
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function compareArtwork(expected: ArtworkSpec, actual: ArtworkSpec) {
  const issues: Array<Record<string, unknown>> = []

  const expectedPages = toNumber(expected.pages)
  const actualPages = toNumber(actual.pages)

  if (expectedPages > 0 && actualPages > 0 && expectedPages !== actualPages) {
    issues.push({
      type: "page_count",
      severity: "fail",
      expected: expectedPages,
      actual: actualPages,
      message: `Expected ${expectedPages} pages but detected ${actualPages}.`,
    })
  }

  const expectedWidth = toNumber(expected.width)
  const expectedHeight = toNumber(expected.height)
  const actualWidth = toNumber(actual.width)
  const actualHeight = toNumber(actual.height)

  if (
    expectedWidth > 0 &&
    expectedHeight > 0 &&
    actualWidth > 0 &&
    actualHeight > 0 &&
    (expectedWidth !== actualWidth || expectedHeight !== actualHeight)
  ) {
    issues.push({
      type: "trim_size",
      severity: "fail",
      expected: `${expectedWidth}x${expectedHeight}mm`,
      actual: `${actualWidth}x${actualHeight}mm`,
      message: "Artwork trim size does not match the selected product size.",
    })
  }

  const expectedBleed = toNumber(expected.bleed)
  const actualBleed = toNumber(actual.bleed)

  if (expectedBleed > 0 && actualBleed < expectedBleed) {
    issues.push({
      type: "bleed",
      severity: "fail",
      expected: `${expectedBleed}mm`,
      actual: `${actualBleed}mm`,
      message: "Artwork bleed is missing or too small.",
    })
  }

  const passed = issues.length === 0

  return {
    passed,
    preflightStatus: passed ? "pass" : "fail",
    productionStatus: passed ? "ready" : "blocked",
    overrideRequired: !passed,
    issues,
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "internal-preflight-production",
    data: {
      description: "Preflight to production blocking endpoint",
      statuses: {
        preflightStatus: ["pass", "fail", "warning"],
        productionStatus: ["ready", "blocked", "override-required"],
      },
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))

    if (body.action === "override") {
      const reason = String(body.reason || "").trim()

      if (!reason) {
        return NextResponse.json(
          { ok: false, error: "Override reason is required" },
          { status: 400 }
        )
      }

      return NextResponse.json({
        ok: true,
        source: "internal-preflight-production",
        data: {
          preflightStatus: "fail",
          productionStatus: "override-required",
          override: {
            allowed: true,
            reason,
            at: new Date().toISOString(),
          },
        },
      })
    }

    const expected = body.expected || {}
    const actual = body.actual || {}
    const result = compareArtwork(expected, actual)

    return NextResponse.json({
      ok: true,
      source: "internal-preflight-production",
      data: result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Preflight failed",
      },
      { status: 500 }
    )
  }
}
