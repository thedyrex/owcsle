import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert blob to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create form data for Discord webhook
    const discordFormData = new FormData();
    discordFormData.append('file', new Blob([buffer], { type: 'image/png' }), 'share.png');

    // Upload to Discord CDN via webhook
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json({ error: 'Discord webhook not configured' }, { status: 500 });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: discordFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: 'Discord upload failed' }, { status: 500 });
    }

    const data = await response.json();

    // Extract the Discord CDN URL from the uploaded attachment
    if (data.attachments && data.attachments.length > 0) {
      const cdnUrl = data.attachments[0].url;
      return NextResponse.json({ url: cdnUrl });
    }

    return NextResponse.json({ error: 'No attachment URL returned' }, { status: 500 });
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
