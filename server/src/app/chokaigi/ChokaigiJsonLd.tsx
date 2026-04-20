import {
  EVENT_END_ISO,
  EVENT_START_ISO,
  EVENT_VENUE_NAME,
  JSON_LD_EVENT_NAME,
  LP_DESCRIPTION,
  canonicalUrl,
} from "./lp-content";

/**
 * schema.org Event（開催日は lp-content の EVENT_* が入ったときだけ付与）
 */
export function ChokaigiJsonLd() {
  const url = canonicalUrl();
  const event: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: JSON_LD_EVENT_NAME,
    description: LP_DESCRIPTION,
    url,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: EVENT_VENUE_NAME,
      address: {
        "@type": "PostalAddress",
        addressLocality: "千葉市美浜区",
        addressRegion: "千葉県",
        addressCountry: "JP",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "すれちがいライト（企画予告）",
      url,
    },
  };

  if (EVENT_START_ISO) {
    event.startDate = EVENT_START_ISO;
  }
  if (EVENT_END_ISO) {
    event.endDate = EVENT_END_ISO;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(event) }}
    />
  );
}
