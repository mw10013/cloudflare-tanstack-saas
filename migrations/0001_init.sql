-- Migration number: 0001 	 2025-01-31T00:42:00.000Z
create table UserRole (userRoleId text primary key);

--> statement-breakpoint
insert into
  UserRole (userRoleId)
values
  ('user'),
  ('admin');

--> statement-breakpoint
create table MemberRole (memberRoleId text primary key);

--> statement-breakpoint
insert into
  MemberRole (memberRoleId)
values
  ('member'),
  ('owner'),
  ('admin');

--> statement-breakpoint
create table InvitationStatus (invitationStatusId text primary key);

--> statement-breakpoint
insert into
  InvitationStatus (invitationStatusId)
values
  ('pending'),
  ('accepted'),
  ('rejected'),
  ('canceled');

--> statement-breakpoint
create table User (
  id text primary key,
  name text not null default '',
  email text not null unique,
  emailVerified integer not null default 0,
  image text,
  role text not null default 'user' references UserRole (userRoleId),
  banned integer not null default 0,
  banReason text,
  banExpires text,
  stripeCustomerId text unique,
  createdAt text not null default (datetime('now')),
  updatedAt text not null default (datetime('now'))
);

--> statement-breakpoint
create table Session (
  id text primary key,
  expiresAt text not null,
  token text not null unique,
  createdAt text not null default (datetime('now')),
  updatedAt text not null default (datetime('now')),
  ipAddress text,
  userAgent text,
  userId text not null references User (id) on delete cascade,
  impersonatedBy text references User (id),
  activeOrganizationId text references Organization (id) on delete cascade
);

--> statement-breakpoint
create index SessionUserIdIndex on Session (userId);

--> statement-breakpoint
create index SessionExpiresAtIndex on Session (expiresAt);

--> statement-breakpoint
create table Organization (
  id text primary key,
  name text not null,
  slug text not null unique,
  logo text,
  metadata text,
  stripeCustomerId text unique,
  createdAt text not null default (datetime('now')),
  updatedAt text
);

--> statement-breakpoint
create index OrganizationSlugIndex on Organization (slug);

--> statement-breakpoint
create table Member (
  id text primary key,
  userId text not null references User (id) on delete cascade,
  organizationId text not null references Organization (id) on delete cascade,
  role text not null references MemberRole (memberRoleId),
  createdAt text not null default (datetime('now'))
);

--> statement-breakpoint
create index MemberUserIdIndex on Member (userId);

--> statement-breakpoint
create index MemberOrganizationIdIndex on Member (organizationId);

--> statement-breakpoint
create table Invitation (
  id text primary key,
  email text not null,
  inviterId text not null references User (id),
  organizationId text not null references Organization (id) on delete cascade,
  role text not null references MemberRole (memberRoleId),
  status text not null references InvitationStatus (invitationStatusId),
  createdAt text not null,
  expiresAt text not null
);

--> statement-breakpoint
create index InvitationEmailIndex on Invitation (email);

--> statement-breakpoint
create index InvitationOrganizationIdIndex on Invitation (organizationId);

--> statement-breakpoint
create table Account (
  id text primary key,
  accountId text not null,
  providerId text not null,
  userId text not null references User (id) on delete cascade,
  accessToken text,
  refreshToken text,
  idToken text,
  accessTokenExpiresAt text,
  refreshTokenExpiresAt text,
  scope text,
  password text,
  createdAt text not null default (datetime('now')),
  updatedAt text not null default (datetime('now'))
);

--> statement-breakpoint
create index AccountUserIdIndex on Account (userId);

--> statement-breakpoint
create table Verification (
  id text primary key,
  identifier text not null,
  value text not null,
  expiresAt text not null,
  createdAt text not null default (datetime('now')),
  updatedAt text not null default (datetime('now'))
);

--> statement-breakpoint
create index VerificationIdentifierIndex on Verification (identifier);

--> statement-breakpoint
create index VerificationExpiresAtIndex on Verification (expiresAt);

create table Subscription (
  id text primary key,
  plan text not null,
  referenceId text not null references Organization (id) on delete cascade,
  stripeCustomerId text,
  stripeSubscriptionId text,
  status text not null,
  periodStart text,
  periodEnd text,
  trialStart text,
  trialEnd text,
  cancelAtPeriodEnd integer,
  cancelAt text,
  canceledAt text,
  endedAt text,
  seats integer
);

--> statement-breakpoint
insert into
  User (id, name, email, role)
values
  ('admin', 'Admin', 'a@a.com', 'admin');

--> statement-breakpoint
insert into
  Account (
    id,
    accountId,
    providerId,
    userId,
    password
  )
values
  ('admin', 'admin', 'credential', 'admin', '');
