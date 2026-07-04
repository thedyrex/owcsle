import { NextRequest, NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const body = await request.text();

  // Read env var inside function to ensure it's available
  const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

  if (!PUBLIC_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (!signature || !timestamp) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  const isValid = verifyKey(body, signature, timestamp, PUBLIC_KEY);

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const interaction = JSON.parse(body);

  // Handle PING
  if (interaction.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Handle slash command
  if (interaction.type === 2) {
    const { name } = interaction.data;

    if (name === 'owcsle') {
      return NextResponse.json({
        type: 4,
        data: {
          embeds: [{
            title: '🎮 OWCSLE - OWCS Player Guessing Game',
            description: 'Guess the Overwatch Champions Series player in 6 tries!',
            color: 0xf97316, // orange-500
            fields: [
              {
                name: '🌐 Play Now',
                value: '[owcsle.xyz](https://owcsle.xyz)',
                inline: true
              },
              {
                name: '🎯 Discord Activity',
                value: 'Launch OWCSLE from voice channels!',
                inline: true
              },
              {
                name: '📊 Daily Challenge',
                value: 'New player every day at midnight CST',
                inline: false
              }
            ],
            footer: {
              text: 'owcsle.xyz'
            }
          }]
        }
      });
    }

    if (name === 'owcsle-stats') {
      // TODO: Fetch user stats from database
      return NextResponse.json({
        type: 4,
        data: {
          content: 'Stats feature coming soon! Play at https://owcsle.xyz'
        }
      });
    }
  }

  return NextResponse.json({ error: 'Unknown interaction' }, { status: 400 });
}
