import { describe, expect, it } from "vitest";
import { buildMergeArgs } from "../src/services/ffmpegService";
import type { ClassifiedMedia } from "../src/types/media";

const image: ClassifiedMedia = {
  field: "media1",
  originalName: "cover.png",
  mimeType: "image/png",
  extension: "png",
  size: 10,
  path: "/tmp/cover.png",
  kind: "image"
};

const video: ClassifiedMedia = {
  field: "media1",
  originalName: "clip.mp4",
  mimeType: "video/mp4",
  extension: "mp4",
  size: 10,
  path: "/tmp/clip.mp4",
  kind: "video",
  durationSeconds: 10,
  probe: { streams: [{ codec_type: "video" }], format: { duration: "10" } }
};

const audioSource: ClassifiedMedia = {
  field: "media2",
  originalName: "song.mp3",
  mimeType: "audio/mpeg",
  extension: "mp3",
  size: 10,
  path: "/tmp/song.mp3",
  kind: "audio",
  durationSeconds: 300.221,
  probe: { streams: [{ codec_type: "audio" }], format: { duration: "300.221" } }
};

describe("buildMergeArgs", () => {
  it("loops image input and maps full source audio", () => {
    const args = buildMergeArgs(image, audioSource, "/tmp/out.mp4");

    expect(args).toContain("-loop");
    expect(args).toContain("1");
    expect(args).toContain("-map");
    expect(args).toContain("1:a:0");
    expect(args).toContain("300.221");
    expect(args).toContain("ultrafast");
    expect(args).toContain("30");
    expect(args).toContain("128k");
    expect(args).toContain("512");
    expect(args).toContain("scale=-2:min(720\\,ih):force_original_aspect_ratio=decrease,format=yuv420p");
    expect(args).not.toContain("-shortest");
  });

  it("loops primary video indefinitely before trimming output to audio duration", () => {
    const args = buildMergeArgs(video, audioSource, "/tmp/out.mp4");

    expect(args.slice(0, 8)).toEqual([
      "-hide_banner",
      "-loglevel",
      "error",
      "-stream_loop",
      "-1",
      "-i",
      "/tmp/clip.mp4",
      "-i"
    ]);
    expect(args).toContain("1:a:0");
    expect(args).toContain("300.221");
    expect(args).toContain("-threads");
    expect(args).toContain("1");
    expect(args).toContain("scale=-2:min(720\\,ih):force_original_aspect_ratio=decrease,format=yuv420p");
    expect(args).not.toContain("-shortest");
  });
});
