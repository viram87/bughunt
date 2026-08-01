// Emits schema.org structured data. Search engines use this to understand
// what a page is, and it's what can earn rich results.
//
// The JSON is escaped so a "</script>" appearing inside any field (a
// challenge description, say) can't break out of the script tag.
export function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
