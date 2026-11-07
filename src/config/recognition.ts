/**
 * DPIIT Startup India recognition details, as printed on the Certificate of Recognition.
 *
 * Source: the certificate issued to FENZIT TECHNOLOGY LLP on 29-10-2026. Valid until 20-09-2036,
 * and only while turnover stays at or below Rs 200 Cr. Review the badge before the end date or
 * if turnover changes.
 *
 * `verifyUrl` is the link the certificate's "Scan to Verify" QR code points to. It stays null
 * until it is confirmed. While it is null the badge shows no link.
 */
export const DPIIT_RECOGNITION = {
  certificateNo: "DIPP290906",
  year: "2026",
  validUpTo: "2036-09-20",
  verifyUrl:
    "https://www.startupindia.gov.in/content/sih/en/block-chain-recognised-certificate.html?DIPP=DIPP290906" as
      string | null,
} as const;
