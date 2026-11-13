import { describe, expect, it } from "bun:test";
import { parseAppRoadblockConfig, type AppRoadblockConfig } from "./configApi";
import {
  androidMinVersionRefusal,
  compareVersionNames,
  draftFromConfig,
  toConfigBody,
  validateDraft,
} from "./configRules";

const baseConfig: AppRoadblockConfig = {
  android: {
    minVersion: "1.4.2",
    message: "Please update the Fenzit app to continue.",
    storeUrl: "https://play.google.com/store/apps/details?id=com.fenzit",
  },
  ios: {
    minVersion: "1.0.0",
    message: "Please update the Fenzit app to continue.",
    storeUrl: "https://apps.apple.com/app/id0000000000",
  },
  support: { email: "help@fenzit.com", phone: "+919279230451" },
  liveAndroidVersion: "1.4.3",
};

function draftWithAndroidMin(minVersion: string) {
  const draft = draftFromConfig(baseConfig);
  draft["android.minVersion"] = minVersion;
  return draft;
}

describe("compareVersionNames", () => {
  it("compares numerically, so 1.10.0 is newer than 1.9.0", () => {
    expect(compareVersionNames("1.10.0", "1.9.0")).toBeGreaterThan(0);
  });

  it("orders a patch bump in both directions", () => {
    expect(compareVersionNames("1.4.4", "1.4.3")).toBeGreaterThan(0);
    expect(compareVersionNames("1.4.2", "1.4.3")).toBeLessThan(0);
  });

  it("treats the exact same version as equal", () => {
    expect(compareVersionNames("1.4.3", "1.4.3")).toBe(0);
  });
});

describe("validateDraft — Android minimum against the live Play version", () => {
  it("refuses a minimum newer than the live version, with the live version in the sentence", () => {
    const errors = validateDraft(draftWithAndroidMin("1.4.4"), "1.4.3");

    expect(errors["android.minVersion"]).toBe(
      "Version 1.4.4 isn't live on Google Play yet. The latest live Android version is 1.4.3.",
    );
  });

  it("accepts the exact live version", () => {
    expect(validateDraft(draftWithAndroidMin("1.4.3"), "1.4.3")).toEqual({});
  });

  it("accepts a minimum older than the live version", () => {
    expect(validateDraft(draftWithAndroidMin("1.4.2"), "1.4.3")).toEqual({});
  });

  it("compares numerically: 1.10.0 is refused against a live 1.4.3", () => {
    expect(
      validateDraft(draftWithAndroidMin("1.10.0"), "1.4.3")["android.minVersion"],
    ).toBeDefined();
  });

  it("skips the live check when the server could not report a live version", () => {
    expect(validateDraft(draftWithAndroidMin("9.9.9"), null)).toEqual({});
  });

  it("keeps the format error when the value is not three numbers, and does not add a live error", () => {
    const errors = validateDraft(draftWithAndroidMin("1.4"), "1.4.3");

    expect(errors["android.minVersion"]).toBe("Use three numbers with dots, like 1.4.0.");
  });

  it("does not run the live check on the iOS minimum", () => {
    const draft = draftFromConfig(baseConfig);
    draft["ios.minVersion"] = "9.9.9";

    expect(validateDraft(draft, "1.4.3")).toEqual({});
  });
});

describe("the live version is read-only", () => {
  it("is not sent back on save", () => {
    const body = toConfigBody(draftFromConfig(baseConfig)) as Record<string, unknown>;

    expect(body).not.toHaveProperty("liveAndroidVersion");
  });
});

describe("parseAppRoadblockConfig", () => {
  const wire = {
    android: baseConfig.android,
    ios: baseConfig.ios,
    support: baseConfig.support,
  };

  it("reads the live Android version the server sends", () => {
    expect(
      parseAppRoadblockConfig({ ...wire, liveAndroidVersion: "1.4.3" }).liveAndroidVersion,
    ).toBe("1.4.3");
  });

  it("reads a null live version as null (the server could not check)", () => {
    expect(
      parseAppRoadblockConfig({ ...wire, liveAndroidVersion: null }).liveAndroidVersion,
    ).toBeNull();
  });

  it("treats an older server with no field as undefined (not shown yet), not an error", () => {
    expect(parseAppRoadblockConfig(wire).liveAndroidVersion).toBeUndefined();
  });

  it("treats a non-string live version as undefined rather than trusting it", () => {
    expect(
      parseAppRoadblockConfig({ ...wire, liveAndroidVersion: 143 }).liveAndroidVersion,
    ).toBeUndefined();
  });
});

describe("androidMinVersionRefusal — the popup's reason", () => {
  it("reports above-live with the live version", () => {
    expect(androidMinVersionRefusal(draftWithAndroidMin("1.4.4"), "1.4.3")).toEqual({
      kind: "above-live",
      live: "1.4.3",
    });
  });

  it("reports invalid for a version that is not three numbers", () => {
    expect(androidMinVersionRefusal(draftWithAndroidMin("1.4"), "1.4.3")).toEqual({
      kind: "invalid",
    });
    expect(androidMinVersionRefusal(draftWithAndroidMin("abc"), null)).toEqual({ kind: "invalid" });
  });

  it("reports nothing for the live version, an older one, or an empty field", () => {
    expect(androidMinVersionRefusal(draftWithAndroidMin("1.4.3"), "1.4.3")).toBeNull();
    expect(androidMinVersionRefusal(draftWithAndroidMin("1.4.2"), "1.4.3")).toBeNull();
    expect(androidMinVersionRefusal(draftWithAndroidMin(""), "1.4.3")).toBeNull();
  });

  it("does not report above-live when the live version is unknown", () => {
    expect(androidMinVersionRefusal(draftWithAndroidMin("9.9.9"), null)).toBeNull();
  });
});

describe("an unchanged Android minimum is never refused on save", () => {
  it("does not refuse a stored minimum that is above the live version", () => {
    // Halted release: the stored minimum is above live. Saving the support phone must still work.
    expect(androidMinVersionRefusal(draftWithAndroidMin("1.4.4"), "1.4.3", "1.4.4")).toBeNull();
    expect(validateDraft(draftWithAndroidMin("1.4.4"), "1.4.3", "1.4.4")).toEqual({});
  });

  it("still refuses a change to a version above live", () => {
    expect(androidMinVersionRefusal(draftWithAndroidMin("1.4.5"), "1.4.3", "1.4.4")).toEqual({
      kind: "above-live",
      live: "1.4.3",
    });
  });
});
