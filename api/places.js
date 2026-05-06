export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { endpoint, ...params } = req.query;
  const GOOGLE_KEY = "AIzaSyDBNrlLOqcrWw3pYXDJQxCNSO3tifBXR68";
  
  const queryString = Object.entries({ ...params, key: GOOGLE_KEY })
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
    .join('&');
  
  const url = 'https://maps.googleapis.com/maps/api/' + endpoint + '/json?' + queryString;
  
  const response = await fetch(url);
  const data = await response.json();
  res.status(200).json(data);
}
