import { Router } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../db.js';

type IdentifyRequestBody = {
  email?: string;
  phoneNumber?: string | number;
};

const router: Router = Router();

router.post('/', async (req: Request<{}, {}, IdentifyRequestBody>, res: Response) => {
  const { email, phoneNumber } = req.body;

  if (!email && phoneNumber == null) {
    return res.status(400).json({
      message: 'Either email or phoneNumber must be provided',
    });
  }

  const normalizedEmail = email ?? null;
  const normalizedPhone = phoneNumber != null ? String(phoneNumber) : null;

  try {
    // Find any same email or phoneNumber
    const { rows: existingContacts } = await pool.query(
      `SELECT * FROM contacts
       WHERE ("email" = $1 OR "phoneNumber" = $2)
       AND "deletedAt" IS NULL`,
      [normalizedEmail, normalizedPhone],
    );

    // Case 1: No existing contacts -> create a new primary contact
    if (existingContacts.length === 0) {
      const insertResult = await pool.query(
        `INSERT INTO contacts ("email", "phoneNumber", "linkPrecedence", "createdAt", "updatedAt")
         VALUES ($1, $2, 'primary', NOW(), NOW())
         RETURNING *`,
        [normalizedEmail, normalizedPhone],
      );

      const newContact = insertResult.rows[0];

      const emails: string[] = [];
      const phoneNumbers: string[] = [];

      if (newContact.email) emails.push(newContact.email);
      if (newContact.phoneNumber) phoneNumbers.push(newContact.phoneNumber);

      return res.status(200).json({
        contact: {
          primaryContactId: newContact.id,
          emails,
          phoneNumbers,
          secondaryContactIds: [] as number[],
        },
      });
    }

    // There are existing contacts. Determine the primary contact.
    const primaryCandidates = existingContacts.filter(
      (c: any) => c.linkPrecedence === 'primary',
    );

    let primary = primaryCandidates[0] ?? existingContacts[0];
    for (const c of primaryCandidates) {
      if (new Date(c.createdAt) < new Date(primary.createdAt)) {
        primary = c;
      }
    }

    // Ensure all other contacts in this group are secondary and linked to the primary
    const others = existingContacts.filter((c: any) => c.id !== primary.id);
    for (const c of others) {
      if (c.linkPrecedence !== 'secondary' || c.linkedId !== primary.id) {
        await pool.query(
          `UPDATE contacts
           SET "linkPrecedence" = 'secondary',
               "linkedId" = $1,
               "updatedAt" = NOW()
           WHERE id = $2`,
          [primary.id, c.id],
        );
      }
    }

    // Check if this request introduces new information
    const existingEmails = new Set(
      existingContacts
        .map((c: any) => c.email)
        .filter((e: unknown): e is string => typeof e === 'string'),
    );
    const existingPhones = new Set(
      existingContacts
        .map((c: any) => c.phoneNumber)
        .filter((p: unknown): p is string => typeof p === 'string'),
    );

    const hasNewEmail = normalizedEmail && !existingEmails.has(normalizedEmail);
    const hasNewPhone =
      normalizedPhone && !existingPhones.has(normalizedPhone);

    if (hasNewEmail || hasNewPhone) {
      const insertSecondary = await pool.query(
        `INSERT INTO contacts ("email", "phoneNumber", "linkPrecedence", "linkedId", "createdAt", "updatedAt")
         VALUES ($1, $2, 'secondary', $3, NOW(), NOW())
         RETURNING *`,
        [normalizedEmail, normalizedPhone, primary.id],
      );

      existingContacts.push(insertSecondary.rows[0]);
    }

    // Re-fetch all contacts linked to this primary 
    const { rows: allContacts } = await pool.query(
      `SELECT * FROM contacts
       WHERE (id = $1 OR "linkedId" = $1)
       AND "deletedAt" IS NULL`,
      [primary.id],
    );

    const primaryContact =
      allContacts.find((c: any) => c.id === primary.id) ?? primary;

    const emails: string[] = [];
    const emailSet = new Set<string>();
    if (primaryContact.email) {
      emails.push(primaryContact.email);
      emailSet.add(primaryContact.email);
    }

    const phoneNumbers: string[] = [];
    const phoneSet = new Set<string>();
    if (primaryContact.phoneNumber) {
      phoneNumbers.push(primaryContact.phoneNumber);
      phoneSet.add(primaryContact.phoneNumber);
    }

    const secondaryContactIds: number[] = [];

    for (const c of allContacts) {
      if (c.id === primaryContact.id) continue;

      if (c.email && !emailSet.has(c.email)) {
        emails.push(c.email);
        emailSet.add(c.email);
      }

      if (c.phoneNumber && !phoneSet.has(c.phoneNumber)) {
        phoneNumbers.push(c.phoneNumber);
        phoneSet.add(c.phoneNumber);
      }

      if (c.linkPrecedence === 'secondary') {
        secondaryContactIds.push(c.id);
      }
    }

    return res.status(200).json({
      contact: {
        primaryContactId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error handling /identify request', err);
    return res.status(500).json({
      message: 'Internal server error',
      error: err.message,
    });
  }
});

export default router;