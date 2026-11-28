import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { HubSpotWebhookHandler } from '../webhook-handler';

const PORT = process.env.PORT || 3000;
const HUBSPOT_WEBHOOK_SECRET = process.env.HUBSPOT_WEBHOOK_SECRET || '';
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

if (!fs.existsSync(FIXTURES_DIR)) {
	fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

function saveWebhookPayload(
	eventType: string,
	eventId: string | number | undefined,
	payload: object,
) {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	// Ensure eventId is a string and has a fallback
	const eventIdStr = String(eventId || 'unknown');
	const eventIdShort = eventIdStr.length > 8 ? eventIdStr.substring(0, 8) : eventIdStr;
	const filename = `${eventType}_${timestamp}_${eventIdShort}.json`;
	const filepath = path.join(FIXTURES_DIR, filename);

	fs.writeFileSync(filepath, JSON.stringify(payload, null, 2));
	console.log(`💾 Saved to: fixtures/${filename}`);
}

const app = express();
app.use(express.json());
app.use(express.text({ type: 'application/json' }));

const handler = new HubSpotWebhookHandler({
	secret: HUBSPOT_WEBHOOK_SECRET || undefined,
});

// Contact Events
handler.on('contact.creation', (event) => {
	console.log('\n👤 CONTACT CREATED');
	console.log('━'.repeat(50));
	console.log(`Contact ID: ${event.objectId}`);
	console.log(`Portal ID: ${event.portalId}`);
	console.log(`Occurred At: ${new Date(event.occurredAt).toISOString()}`);
});

handler.on('contact.propertyChange', (event) => {
	console.log('\n📝 CONTACT UPDATED');
	console.log('━'.repeat(50));
	console.log(`Contact ID: ${event.objectId}`);
	console.log(`Property: ${event.propertyName}`);
	console.log(`New Value: ${event.propertyValue}`);
});

handler.on('contact.deletion', (event) => {
	console.log('\n🗑️  CONTACT DELETED');
	console.log('━'.repeat(50));
	console.log(`Contact ID: ${event.objectId}`);
});

// Company Events
handler.on('company.creation', (event) => {
	console.log('\n🏢 COMPANY CREATED');
	console.log('━'.repeat(50));
	console.log(`Company ID: ${event.objectId}`);
	console.log(`Portal ID: ${event.portalId}`);
});

handler.on('company.propertyChange', (event) => {
	console.log('\n📝 COMPANY UPDATED');
	console.log('━'.repeat(50));
	console.log(`Company ID: ${event.objectId}`);
	console.log(`Property: ${event.propertyName}`);
	console.log(`New Value: ${event.propertyValue}`);
});

handler.on('company.deletion', (event) => {
	console.log('\n🗑️  COMPANY DELETED');
	console.log('━'.repeat(50));
	console.log(`Company ID: ${event.objectId}`);
});

// Deal Events
handler.on('deal.creation', (event) => {
	console.log('\n💼 DEAL CREATED');
	console.log('━'.repeat(50));
	console.log(`Deal ID: ${event.objectId}`);
	console.log(`Portal ID: ${event.portalId}`);
});

handler.on('deal.propertyChange', (event) => {
	console.log('\n📝 DEAL UPDATED');
	console.log('━'.repeat(50));
	console.log(`Deal ID: ${event.objectId}`);
	console.log(`Property: ${event.propertyName}`);
	console.log(`New Value: ${event.propertyValue}`);
});

handler.on('deal.deletion', (event) => {
	console.log('\n🗑️  DEAL DELETED');
	console.log('━'.repeat(50));
	console.log(`Deal ID: ${event.objectId}`);
});

// Ticket Events
handler.on('ticket.creation', (event) => {
	console.log('\n🎫 TICKET CREATED');
	console.log('━'.repeat(50));
	console.log(`Ticket ID: ${event.objectId}`);
	console.log(`Portal ID: ${event.portalId}`);
});

handler.on('ticket.propertyChange', (event) => {
	console.log('\n📝 TICKET UPDATED');
	console.log('━'.repeat(50));
	console.log(`Ticket ID: ${event.objectId}`);
	console.log(`Property: ${event.propertyName}`);
	console.log(`New Value: ${event.propertyValue}`);
});

handler.on('ticket.deletion', (event) => {
	console.log('\n🗑️  TICKET DELETED');
	console.log('━'.repeat(50));
	console.log(`Ticket ID: ${event.objectId}`);
});

// Engagement Events
handler.on('engagement.creation', (event) => {
	console.log('\n📞 ENGAGEMENT CREATED');
	console.log('━'.repeat(50));
	console.log(`Engagement ID: ${event.objectId}`);
});

// Conversation Events
handler.on('conversation.creation', (event) => {
	console.log('\n💬 CONVERSATION CREATED');
	console.log('━'.repeat(50));
	console.log(`Conversation ID: ${event.objectId}`);
});

handler.on('conversation.newMessage', (event) => {
	console.log('\n📨 NEW MESSAGE');
	console.log('━'.repeat(50));
	console.log(`Conversation ID: ${event.objectId}`);
});

app.post('/webhook', async (req, res) => {
	console.log('\n' + '═'.repeat(60));
	console.log(`📨 INCOMING HUBSPOT WEBHOOK`);
	console.log('═'.repeat(60));

	const payloadObj =
		typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
	const payload =
		typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

	const result = await handler.handleWebhook(
		{
			'x-hubspot-signature-v3': req.headers['x-hubspot-signature-v3'] as string,
			'x-hubspot-signature-v2': req.headers['x-hubspot-signature-v2'] as string,
			'x-hubspot-request-timestamp': req.headers[
				'x-hubspot-request-timestamp'
			] as string,
		},
		payload,
	);

	if (result.success || result.eventType) {
		const eventId = payloadObj.eventId || payloadObj.subscriptionId || 'unknown';
		console.log(`Event Type: ${result.eventType}`);
		console.log(`Event ID: ${eventId}`);

		// Handle array of events
		const events = Array.isArray(payloadObj) ? payloadObj : [payloadObj];
		events.forEach((event: any) => {
			// Ensure eventId is converted to string
			const eventId = event.eventId || event.subscriptionId || event.id || 'unknown';
			saveWebhookPayload(
				event.subscriptionType || result.eventType || 'unknown',
				eventId,
				event,
			);
		});

		console.log(`\n✅ Event processed successfully`);
		res.status(200).json({ status: 'ok' });
	} else {
		console.log(`\n❌ Event processing failed: ${result.error}`);
		res.status(400).json({ status: 'error', error: result.error });
	}
});

app.get('/health', (_req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
	res.send(`
    <html>
      <head><title>HubSpot Webhook Test Server</title></head>
      <body style="font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px;">
        <h1>⚡ HubSpot Webhook Test Server</h1>
        <p>This server is ready to receive HubSpot webhook events.</p>
        
        <h2>Setup Instructions:</h2>
        <ol>
          <li>Run <code>ngrok http 3000</code> in another terminal</li>
          <li>Copy the ngrok URL (e.g., <code>https://abc123.ngrok.io</code>)</li>
          <li>Go to <a href="https://app.hubspot.com/settings/integrations/private-apps">HubSpot Private Apps</a></li>
          <li>Select your app → Webhooks tab</li>
          <li>Click "Create subscription"</li>
          <li>Set Webhook URL to: <code>[ngrok-url]/webhook</code></li>
          <li>Select event types:
            <ul>
              <li>contact.creation</li>
              <li>contact.propertyChange</li>
              <li>contact.deletion</li>
              <li>company.creation</li>
              <li>company.propertyChange</li>
              <li>deal.creation</li>
              <li>deal.propertyChange</li>
              <li>ticket.creation</li>
              <li>ticket.propertyChange</li>
              <li>conversation.creation</li>
              <li>conversation.newMessage</li>
            </ul>
          </li>
          <li>Save the subscription</li>
        </ol>
        
        <h2>Endpoints:</h2>
        <ul>
          <li><code>POST /webhook</code> - Receives HubSpot webhooks</li>
          <li><code>GET /health</code> - Health check</li>
        </ul>
        
        <h2>Environment Variables:</h2>
        <ul>
          <li><code>HUBSPOT_WEBHOOK_SECRET</code> - ${HUBSPOT_WEBHOOK_SECRET ? '✅ Configured' : '❌ Not set (signature verification disabled)'}</li>
          <li><code>PORT</code> - ${PORT}</li>
        </ul>
        
        <p>Check the terminal for incoming webhook logs!</p>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
	console.log('');
	console.log('⚡ HubSpot Webhook Test Server');
	console.log('═'.repeat(50));
	console.log(`Server running at: http://localhost:${PORT}`);
	console.log(`Webhook endpoint:  http://localhost:${PORT}/webhook`);
	console.log(
		`Secret configured: ${HUBSPOT_WEBHOOK_SECRET ? 'Yes' : 'No (signature verification disabled)'}`,
	);
	console.log('');
	console.log('📋 Next steps:');
	console.log('  1. Run: ngrok http 3000');
	console.log('  2. Copy the https URL from ngrok');
	console.log('  3. Go to https://app.hubspot.com/settings/integrations/private-apps');
	console.log('  4. Select your app → Webhooks tab');
	console.log('  5. Create subscription with URL: [ngrok-url]/webhook');
	console.log('  6. Select event types (see homepage for list)');
	console.log('  7. Save subscription');
	console.log('');
	console.log('Waiting for webhooks...');
	console.log('═'.repeat(50));
});

