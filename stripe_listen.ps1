# Helper script to run Stripe Listen
$StripePath = "c:\Users\amend\.gemini\antigravity\scratch\Amieira Marina\stripe-cli\stripe.exe"
Write-Host "Starting Stripe Listener on port 9002..."
& $StripePath listen --forward-to localhost:9002/api/webhooks/stripe
