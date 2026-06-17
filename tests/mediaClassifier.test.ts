import { describe, expect, it } from "vitest";
import { extractDurationSeconds, validateProbeForKind } from "../src/services/mediaClassifier";

describe("media classification helpers", () => {
  it("uses stream duration when format duration is missing", () => {
    expect(
      extractDurationSeconds({
        format: {},
        streams: [{ codec_type: "audio", duration: "42.5" }]
      })
    ).toBe(42.5);
  });

  it("rejects media2 video files with no audio stream", () => {
    expect(() =>
      validateProbeForKind(
        {
          format: { duration: "5" },
          streams: [{ codec_type: "video", codec_name: "h264" }]
        },
        "video",
        "media2"
      )
    ).toThrow("Input 2 must contain a readable audio stream.");
  });
});
