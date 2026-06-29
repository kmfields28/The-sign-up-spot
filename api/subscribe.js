export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, zip, kidCount, ageRanges } = req.body;

  try {
    // Add to Beehiiv
    await fetch('https://api.beehiiv.com/v2/publications/pub_7aa8d691-f3c2-475b-bfd8-3de8fb95170a/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer VdzkxrPREMvPolaUkQDPIEzmShFDkk7O4xRsGbRtiEIifygGdxLnrDhE6NhfxwYa',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        reactivate_existing: true,
        send_welcome_email: true,
        custom_fields: [
          { name: 'zip', value: zip || '' },
          { name: 'kid_count', value: String(kidCount || '') },
          { name: 'age_ranges', value: (ageRanges || []).join(', ') }
        ]
      })
    });

    // Also save to Supabase
    await fetch('https://owehkzrhtwyjgccjpptq.supabase.co/rest/v1/newsletter_subscribers', {
      method: 'POST',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZWhrenJodHd5amdjY2pwcHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODMwNjgsImV4cCI6MjA5MzY1OTA2OH0.OAOwSAReUlaG7MOkGvx0bhRO0EjNfRzmkEkuINuZinU',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZWhrenJodHd5amdjY2pwcHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODMwNjgsImV4cCI6MjA5MzY1OTA2OH0.OAOwSAReUlaG7MOkGvx0bhRO0EjNfRzmkEkuINuZinU',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ email: email.trim(), source: 'website', zip, kid_count: kidCount })
    });

    res.status(200).json({ success: true });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
