export default async function handler(req, res) {
  const { placeId, name, dest } = req.query;

  // Log click for future commission tracking
  console.log("Click tracked:", {
    placeId,
    name,
    destination: dest,
    timestamp: new Date().toISOString(),
    referrer: req.headers.referer || "direct"
  });

  // Redirect to business website or Google Maps fallback
  const destination = dest || "https://www.google.com/maps/search/?q=" + encodeURIComponent(name || "");

  res.writeHead(302, { Location: destination });
  res.end();
}
