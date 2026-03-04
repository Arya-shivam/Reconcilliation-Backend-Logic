-- Run this in your PostgreSQL "test" database to create the contacts table.
-- From psql: \i schema.sql   or run: psql -U postgres -d test -f schema.sql

CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  "email" VARCHAR(255),
  "phoneNumber" VARCHAR(50),
  "linkedId" INTEGER REFERENCES contacts(id),
  "linkPrecedence" VARCHAR(20) NOT NULL CHECK ("linkPrecedence" IN ('primary', 'secondary')),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts("email");
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts("phoneNumber");
CREATE INDEX IF NOT EXISTS idx_contacts_linked ON contacts("linkedId");
