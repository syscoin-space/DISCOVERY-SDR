import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { encrypt, decrypt } from '../../shared/utils/crypto';
import { AppError } from '../../shared/types';
import { logger } from '../../config/logger';

// ─── Types ────────────────────────────────────────────────────────────

export interface TimeSlot {
  inicio: string; // ISO
  fim: string;    // ISO
  livre: boolean;
}

interface CreateEventParams {
  closerMembershipId: string;
  sdrMembershipId: string;
  leadId: string;
  titulo: string;
  descricao?: string;
  inicio: Date;
  fim: Date;
  convidadosEmails: string[];
  criarGoogleMeet?: boolean;
}

// ─── OAuth2 Client ────────────────────────────────────────────────────

export function getOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}

export function getAuthenticatedClient(accessToken: string, refreshToken: string): OAuth2Client {
  const client = getOAuth2Client();
  client.setCredentials({
    access_token: decrypt(accessToken),
    refresh_token: decrypt(refreshToken),
  });
  return client;
}

// ─── Auth URL ─────────────────────────────────────────────────────────

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
];

export function getAuthUrl(membershipId: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: membershipId,
    prompt: 'consent',
  });
}

// ─── Token Exchange ───────────────────────────────────────────────────

export async function exchangeCodeForTokens(code: string, membershipId: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new AppError(400, 'Google não retornou tokens válidos', 'GOOGLE_TOKEN_ERROR');
  }

  // Get user email
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data: userInfo } = await oauth2.userinfo.get();

  const encryptedAccess = encrypt(tokens.access_token);
  const encryptedRefresh = encrypt(tokens.refresh_token);

  await prisma.googleIntegration.upsert({
    where: { membership_id: membershipId },
    create: {
      membership_id: membershipId,
      google_email: userInfo.email!,
      access_token: encryptedAccess,
      refresh_token: encryptedRefresh,
      token_expiry: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
      scopes: tokens.scope?.split(' ') ?? SCOPES,
    },
    update: {
      google_email: userInfo.email!,
      access_token: encryptedAccess,
      refresh_token: encryptedRefresh,
      token_expiry: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
      scopes: tokens.scope?.split(' ') ?? SCOPES,
      active: true,
    },
  });

  return { email: userInfo.email };
}

// ─── Token Refresh Helper ─────────────────────────────────────────────

async function getClientForMembership(membershipId: string): Promise<OAuth2Client> {
  const integration = await prisma.googleIntegration.findUnique({
    where: { membership_id: membershipId },
  });
  if (!integration || !integration.active) {
    throw new AppError(400, 'Google não conectado', 'GOOGLE_NOT_CONNECTED');
  }

  const client = getAuthenticatedClient(integration.access_token, integration.refresh_token);

  // Auto-refresh if expired
  if (new Date() >= integration.token_expiry) {
    try {
      const { credentials } = await client.refreshAccessToken();
      if (credentials.access_token) {
        await prisma.googleIntegration.update({
          where: { membership_id: membershipId },
          data: {
            access_token: encrypt(credentials.access_token),
            token_expiry: new Date(credentials.expiry_date ?? Date.now() + 3600 * 1000),
          },
        });
        client.setCredentials(credentials);
      }
    } catch (err) {
      logger.error('Google token refresh failed', err);
      throw new AppError(401, 'Token Google expirado — reconecte sua conta', 'GOOGLE_TOKEN_EXPIRED');
    }
  }

  return client;
}

// ─── Calendar: Availability ───────────────────────────────────────────

export async function getCloserAvailability(
  membershipId: string,
  date: Date,
  durationMinutes: number = 60,
): Promise<TimeSlot[]> {
  const client = await getClientForMembership(membershipId);
  const calendar = google.calendar({ version: 'v3', auth: client });

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 0);
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 0);

  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      items: [{ id: 'primary' }],
    },
  });

  const busySlots = data.calendars?.primary?.busy ?? [];

  // Generate 30-min slots between 8h-18h
  const slots: TimeSlot[] = [];
  let current = new Date(dayStart);

  while (current.getTime() + durationMinutes * 60000 <= dayEnd.getTime()) {
    const slotEnd = new Date(current.getTime() + durationMinutes * 60000);
    const isBusy = busySlots.some((busy) => {
      const busyStart = new Date(busy.start!);
      const busyEnd = new Date(busy.end!);
      return current < busyEnd && slotEnd > busyStart;
    });

    slots.push({
      inicio: current.toISOString(),
      fim: slotEnd.toISOString(),
      livre: !isBusy,
    });

    current = new Date(current.getTime() + 30 * 60000); // 30-min increments
  }

  return slots;
}

// ─── Calendar: Create Event ───────────────────────────────────────────

export async function createCalendarEvent(params: CreateEventParams) {
  const client = await getClientForMembership(params.closerMembershipId);
  const calendar = google.calendar({ version: 'v3', auth: client });

  const eventBody: calendar_v3.Schema$Event = {
    summary: params.titulo,
    description: params.descricao ?? `Lead ID: ${params.leadId}`,
    start: { dateTime: params.inicio.toISOString(), timeZone: 'America/Sao_Paulo' },
    end: { dateTime: params.fim.toISOString(), timeZone: 'America/Sao_Paulo' },
    attendees: params.convidadosEmails.map((email) => ({ email })),
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] },
  };

  if (params.criarGoogleMeet) {
    eventBody.conferenceData = {
      createRequest: {
        requestId: `retentio-${params.leadId}-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
  }

  const { data: event } = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: eventBody,
    conferenceDataVersion: params.criarGoogleMeet ? 1 : 0,
    sendUpdates: 'all',
  });

  const meetLink = event.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === 'video',
  )?.uri ?? null;

  // Save to DB
  await prisma.calendarEvent.create({
    data: {
      google_event_id: event.id!,
      lead_id: params.leadId,
      closer_id: params.closerMembershipId,
      sdr_id: params.sdrMembershipId,
      titulo: params.titulo,
      descricao: params.descricao,
      inicio: params.inicio,
      fim: params.fim,
      meet_link: meetLink,
      convidados: params.convidadosEmails,
    },
  });

  return { eventId: event.id!, meetLink };
}

// ─── Calendar: Cancel Event ───────────────────────────────────────────

export async function cancelCalendarEvent(membershipId: string, eventId: string) {
  const dbEvent = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
  if (!dbEvent) throw new AppError(404, 'Evento não encontrado');

  const client = await getClientForMembership(membershipId);
  const calendar = google.calendar({ version: 'v3', auth: client });

  await calendar.events.delete({
    calendarId: 'primary',
    eventId: dbEvent.google_event_id!,
    sendUpdates: 'all',
  });

  await prisma.calendarEvent.update({
    where: { id: eventId },
    data: { status: 'cancelled' },
  });
}

// ─── Calendar: List Events from Google ────────────────────────────────

export interface GoogleCalEvent {
  id: string;
  summary: string;
  description?: string;
  start: string; // ISO
  end: string;   // ISO
  meetLink?: string;
  attendees: string[];
}

export async function listGoogleCalendarEvents(
  membershipId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<GoogleCalEvent[]> {
  try {
    const client = await getClientForMembership(membershipId);
    const calendar = google.calendar({ version: 'v3', auth: client });

    const { data } = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 200,
    });

    return (data.items ?? [])
      .filter((e) => e.start?.dateTime) // Only timed events
      .map((e) => ({
        id: e.id!,
        summary: e.summary ?? '(Sem título)',
        description: e.description ?? undefined,
        start: e.start!.dateTime!,
        end: e.end!.dateTime!,
        meetLink: e.conferenceData?.entryPoints?.find(
          (ep) => ep.entryPointType === 'video',
        )?.uri ?? undefined,
        attendees: (e.attendees ?? []).map((a) => a.email!).filter(Boolean),
      }));
  } catch (err) {
    logger.warn('Failed to fetch Google Calendar events', { membershipId, err });
    return [];
  }
}

// ─── Gmail: Send Email ────────────────────────────────────────────────

export async function sendGmailEmail(params: {
  membershipId: string;
  to: string;
  subject: string;
  htmlBody: string;
  replyTo?: string;
}): Promise<{ messageId: string }> {
  const client = await getClientForMembership(params.membershipId);
  const gmail = google.gmail({ version: 'v1', auth: client });

  // Get sender email
  const integration = await prisma.googleIntegration.findUnique({
    where: { membership_id: params.membershipId },
    select: { google_email: true },
  });

  const raw = createRawEmail({
    from: integration!.google_email,
    to: params.to,
    subject: params.subject,
    htmlBody: params.htmlBody,
    replyTo: params.replyTo,
  });

  const { data } = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return { messageId: data.id! };
}

// ─── Helper: Create raw MIME email ────────────────────────────────────

function createRawEmail(params: {
  from: string;
  to: string;
  subject: string;
  htmlBody: string;
  replyTo?: string;
}): string {
  const boundary = '----=_Part_' + Date.now();
  const lines = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(params.subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  if (params.replyTo) {
    lines.push(`Reply-To: ${params.replyTo}`);
  }

  lines.push(
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(params.htmlBody).toString('base64'),
    `--${boundary}--`,
  );

  const raw = lines.join('\r\n');
  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
