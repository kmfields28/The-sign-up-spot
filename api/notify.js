export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body;

  // Welcome email for newsletter subscribers
  if (body._type === 'welcome') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer re_5iqe9VEp_BBDBKkAV7b8fttNk1QL336rB',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Kristen at The Sign Up Spot <onboarding@resend.dev>',
        to: body.email,
        subject: 'Welcome to The Sign Up Spot!',
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:2rem;">
            <h1 style="color:#2563eb;font-size:1.8rem;margin-bottom:0.5rem">Welcome to The Sign Up Spot!</h1>
            <p style="color:#444;font-size:1rem;line-height:1.7">Hi there!</p>
            <p style="color:#444;font-size:1rem;line-height:1.7">I'm Kristen, and I'm so glad you're here. I built The Sign Up Spot because I was tired of endless Google searches just to find the right activities for my girls.</p>
            <p style="color:#444;font-size:1rem;line-height:1.7">Here's what you can expect from me:</p>
            <ul style="color:#444;font-size:1rem;line-height:2">
              <li>New activity listings in your area</li>
              <li>Seasonal camp guides (so you never miss registration!)</li>
              <li>Local family events and deals</li>
              <li>Tips for managing the family activity schedule</li>
            </ul>
            <a href="https://thesignupspot.com" style="display:inline-block;background:#2563eb;color:#fff;padding:0.75rem 1.5rem;border-radius:99px;text-decoration:none;font-weight:700;margin-top:1rem">Find Activities Near You →</a>
            <p style="color:#999;font-size:0.8rem;margin-top:2rem">You're receiving this because you signed up at thesignupspot.com. <a href="#" style="color:#999">Unsubscribe</a></p>
          </div>
        `
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data });
    return res.status(200).json({ success: true });
  }

  // Business submission notification to Kristen
  const { name, email, category, categories, address, phone, website, description, age_min, age_max, class_types, featured_interest } = body;

  const html = `
    <h2>New Business Submission — The Sign Up Spot</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;font-weight:bold">Business Name</td><td style="padding:8px">${name}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">Contact Email</td><td style="padding:8px">${email}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">Categories</td><td style="padding:8px">${(categories||[category]).join(', ')}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">Address</td><td style="padding:8px">${address||'—'}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">Phone</td><td style="padding:8px">${phone||'—'}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">Website</td><td style="padding:8px">${website||'—'}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">Age Range</td><td style="padding:8px">${age_min != null ? age_min+'-'+age_max : '—'}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">Class Types</td><td style="padding:8px">${(class_types||[]).join(', ')||'—'}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">Featured Interest</td><td style="padding:8px">${featured_interest ? 'Yes' : 'No'}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">Description</td><td style="padding:8px">${description||'—'}</td></tr>
    </table>
    <br/>
    <a href="https://thesignupspot.com/?admin" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Review in Admin →</a>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer re_5iqe9VEp_BBDBKkAV7b8fttNk1QL336rB',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'The Sign Up Spot <onboarding@resend.dev>',
      to: 'LiliBellebiz@gmail.com',
      subject: 'New Business Submission: ' + name,
      html
    })
  });

  const data = await response.json();
  if (!response.ok) return res.status(500).json({ error: data });
  res.status(200).json({ success: true });
}
