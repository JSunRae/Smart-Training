import { describe, expect, it } from "vitest";

import {
  DEFAULT_SUPPORT_NAME,
  PUBLIC_SUPPORT_CONTACT_ENV_VARS,
  PUBLIC_SUPPORT_CONTACT_REQUIREMENT,
  readPublicSupportContact
} from "./runtime";

describe("readPublicSupportContact", () => {
  it("exposes the configured email contact with the default label", () => {
    expect(
      readPublicSupportContact({
        NEXT_PUBLIC_SUPPORT_EMAIL: " pilot-support@example.com "
      })
    ).toEqual({
      email: "pilot-support@example.com",
      name: DEFAULT_SUPPORT_NAME,
      requiredEnvVars: PUBLIC_SUPPORT_CONTACT_ENV_VARS,
      requirement: PUBLIC_SUPPORT_CONTACT_REQUIREMENT,
      url: null,
      visibleOnPrivacyPage: true
    });
  });

  it("treats a configured support URL as sufficient for privacy-page visibility", () => {
    expect(
      readPublicSupportContact({
        NEXT_PUBLIC_SUPPORT_NAME: " Field Ops Support ",
        NEXT_PUBLIC_SUPPORT_URL: " https://support.example.com/privacy "
      })
    ).toEqual({
      email: null,
      name: "Field Ops Support",
      requiredEnvVars: PUBLIC_SUPPORT_CONTACT_ENV_VARS,
      requirement: PUBLIC_SUPPORT_CONTACT_REQUIREMENT,
      url: "https://support.example.com/privacy",
      visibleOnPrivacyPage: true
    });
  });

  it("marks the launch posture incomplete when neither public contact is configured", () => {
    expect(
      readPublicSupportContact({
        NEXT_PUBLIC_SUPPORT_EMAIL: "   ",
        NEXT_PUBLIC_SUPPORT_NAME: "   ",
        NEXT_PUBLIC_SUPPORT_URL: ""
      })
    ).toEqual({
      email: null,
      name: DEFAULT_SUPPORT_NAME,
      requiredEnvVars: PUBLIC_SUPPORT_CONTACT_ENV_VARS,
      requirement: PUBLIC_SUPPORT_CONTACT_REQUIREMENT,
      url: null,
      visibleOnPrivacyPage: false
    });
  });
});