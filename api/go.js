export default async function handler(req, res) {
  const { placeId, name, maps } = req.query;
  
  // Log the click for tracking (you can expand this later)
  console.log("Affiliate click:", { placeId, name, timestamp: new Date().toISOString() });
  
  // For now redirect to Google Maps
  // Later you'll replace this with the business's actual registration/booking URL
  const destination = maps || "https://www.google.com/maps/place/?q=place_id:" + placeId;
  
  res.writeHead(302, { Location: destination });
  res.end();
}
