import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title") || "Codepylot";
  const subtitle =
    searchParams.get("subtitle") ||
    "AI-powered sprint board that turns ideas into shipped code";
  const type = searchParams.get("type") || "default";

  const badgeText =
    type === "blog"
      ? "Blog"
      : type === "compare"
        ? "Comparison"
        : type === "tool"
          ? "Free Tool"
          : type === "glossary"
            ? "Glossary"
            : type === "template"
              ? "Template"
              : type === "integration"
                ? "Integration"
                : type === "use-case"
                  ? "Use Case"
                  : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          background: "linear-gradient(135deg, #0f0a1e 0%, #1a1333 50%, #0f0a1e 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(124, 58, 237, 0.15) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Gradient orb */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(124, 58, 237, 0.3) 0%, transparent 70%)",
          }}
        />

        {/* Badge */}
        {badgeText && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#c084fc",
                background: "rgba(124, 58, 237, 0.2)",
                border: "1px solid rgba(124, 58, 237, 0.3)",
                borderRadius: 20,
                padding: "6px 16px",
              }}
            >
              {badgeText}
            </span>
          </div>
        )}

        {/* Title */}
        <h1
          style={{
            fontSize: title.length > 50 ? 48 : 56,
            fontWeight: 800,
            color: "white",
            lineHeight: 1.15,
            margin: 0,
            maxWidth: 900,
          }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 24,
            color: "rgba(255, 255, 255, 0.6)",
            marginTop: 20,
            lineHeight: 1.4,
            maxWidth: 700,
          }}
        >
          {subtitle}
        </p>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: "auto",
            paddingTop: 40,
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            🚀
          </div>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "white",
            }}
          >
            Codepylot
          </span>
          <span
            style={{
              fontSize: 18,
              color: "rgba(255, 255, 255, 0.4)",
              marginLeft: 8,
            }}
          >
            codepylot.io
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
