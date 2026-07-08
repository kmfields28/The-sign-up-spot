export default async function handler(req, res) {
  // Verify this is called by Vercel cron (or manually by you)
  const auth = req.headers.authorization;
  if (auth !== 'Bearer ' + process.env.CRON_SECRET && req.query.secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SUPABASE_URL = 'https://owehkzrhtwyjgccjpptq.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZWhrenJodHd5amdjY2pwcHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODMwNjgsImV4cCI6MjA5MzY1OTA2OH0.OAOwSAReUlaG7MOkGvx0bhRO0EjNfRzmkEkuINuZinU';
  const RESEND_KEY = 're_5iqe9VEp_BBDBKkAV7b8fttNk1QL336rB';

  // Get today and tomorrow
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  try {
    // Find activities opening for registration today or tomorrow
    const activitiesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/activities?reg_open=in.(${today},${tomorrow})&status=eq.approved`,
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    const activities = await activitiesRes.json();

    if (!activities.length) {
      return res.status(200).json({ message: 'No registrations opening', sent: 0 });
    }

    let sent = 0;

    for (const activity of activities) {
      // Find everyone who signed up for alerts for this activity
      const alertsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/registration_alerts?activity_id=eq.${activity.id}`,
        { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
      );
      const alerts = await alertsRes.json();

      for (const alert of alerts) {
        // Send email
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Kristen at The Sign Up Spot <onboarding@resend.dev>',
            to: alert.user_email,
            subject: `Registration is opening for ${activity.name}!`,
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:2rem;">
                <h2 style="color:#2563eb">Registration is opening for ${activity.name}!</h2>
                <p style="color:#444;font-size:1rem;line-height:1.7">
                  Great news! You asked us to let you know when registration opens for <strong>${activity.name}</strong>.
                </p>
                <p style="color:#444;font-size:1rem;line-height:1.7">
                  Registration opens: <strong>${new Date(activity.reg_open).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}</strong>
                  ${activity.reg_close ? '<br>Registration closes: <strong>' + new Date(activity.reg_close).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }) + '</strong>' : ''}
                </p>
                ${activity.reg_url ? `<a href="${activity.reg_url}" style="display:inline-block;background:#2563eb;color:#fff;padding:0.75rem 1.5rem;border-radius:99px;text-decoration:none;font-weight:700;margin-top:1rem">Register Now →</a>` : ''}
                ${activity.website ? `<p style="margin-top:1rem"><a href="${activity.website}" style="color:#2563eb">Visit their website →</a></p>` : ''}
                <hr style="margin:2rem 0;border:none;border-top:1px solid #eee"/>
                <p style="color:#999;font-size:0.8rem">You're receiving this because you signed up for registration alerts at thesignupspot.com.</p>
              </div>
            `
          })
        });
        sent++;
      }
    }

    res.status(200).json({ message: `Sent ${sent} alerts`, activities: activities.length, sent });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
