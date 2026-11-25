import { describe, expect, it } from "bun:test";

// A QR's payload is invisible: if the SVG's modules change, the scanned URL changes
// silently and no render test can see it. Pin the file bytes — any different payload
// fails here. If the QR is ever regenerated on purpose, update the hash only after
// scanning the new code and landing on https://fenzit.com/app/download.
const EXPECTED_SHA256 = "affb82deb3555fe25bce72d9aecfd5e69268c6c869212a3edcd6438ebac4181b";

describe("download-qr.svg", () => {
  it("is the QR that encodes https://fenzit.com/app/download", async () => {
    const bytes = await Bun.file(new URL("./download-qr.svg", import.meta.url)).arrayBuffer();
    expect(new Bun.CryptoHasher("sha256").update(bytes).digest("hex")).toBe(EXPECTED_SHA256);
  });
});
