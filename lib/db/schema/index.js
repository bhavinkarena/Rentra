import {
  pgTable, pgEnum, uuid, text, varchar, integer, boolean, timestamp,
  date, jsonb, real, geometry, uniqueIndex, index, primaryKey,
} from 'drizzle-orm/pg-core';

/* ==========================================================================
   ENUMS
   ========================================================================== */

/** One account = one role, fixed at signup. See docs plan §"Roles". */
export const userRole = pgEnum('user_role', ['customer', 'client']);

/** A broker may list only as an explicitly-labelled agent, never as owner. */
export const clientType = pgEnum('client_type', ['owner', 'authorised_agent']);

export const kycStatus = pgEnum('kyc_status', ['none', 'pending', 'verified', 'rejected']);

/* --- The three columns that keep goods rental a feature, not a rewrite --- */
export const rentableForm = pgEnum('rentable_form', ['fixed', 'movable']);
export const fulfilment = pgEnum('fulfilment', [
  'visit_site',        // a place — the renter travels to it
  'pickup_from_owner', // movable, collected
  'delivered',         // movable, brought to the renter
]);
export const rentalUnit = pgEnum('rental_unit', ['slot', 'night', 'day', 'week', 'month']);

/**
 * Availability is stored per DAY and per NIGHT only.
 * `full_day` is a booking-level concept that consumes BOTH rows — keeping it
 * out of this enum makes that invariant impossible to violate.
 */
export const availabilitySlot = pgEnum('availability_slot', ['day', 'night']);
export const bookingSlot = pgEnum('booking_slot', ['day', 'night', 'full_day']);

export const listingStatus = pgEnum('listing_status', [
  'draft', 'pending_review', 'pending_verification', 'live', 'paused', 'hidden',
]);

/** Same 7 states describe a guest checking in AND a camera leaving a shop. */
export const bookingState = pgEnum('booking_state', [
  'requested', 'confirmed', 'handed_over', 'returned',
  'completed', 'cancelled', 'disputed',
]);

export const balanceMode = pgEnum('balance_mode', [
  'online_before', 'cash_on_arrival', 'none',
]);

export const cancellationTier = pgEnum('cancellation_tier', [
  'flexible', 'moderate', 'strict',
]);

/**
 * Local land units. Every Surat-belt competitor lists "Farm Size" in Vigha or
 * Var, not acres or sq ft. Guests filter on it, so it is a first-class field.
 */
export const landUnit = pgEnum('land_unit', ['vigha', 'var', 'acre', 'sqft']);

export const payoutStatus = pgEnum('payout_status', [
  'pending', 'processing', 'paid', 'failed', 'frozen',
]);

/* ==========================================================================
   IDENTITY
   ========================================================================== */

/**
 * One verified human. Created from the KYC vendor's result so a person who
 * holds both a Customer and a Client account is verified ONCE — otherwise we
 * pay the vendor twice and ask a verified owner to re-photograph his Aadhaar.
 * We store the vendor's reference, never a raw ID image (DPDP Act).
 */
export const person = pgTable('person', {
  id: uuid('id').primaryKey().defaultRandom(),
  kycRef: varchar('kyc_ref', { length: 128 }).unique(),
  verifiedName: varchar('verified_name', { length: 160 }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  'user',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phone: varchar('phone', { length: 15 }).notNull(),
    role: userRole('role').notNull(),
    name: varchar('name', { length: 160 }),
    email: varchar('email', { length: 254 }),
    personId: uuid('person_id').references(() => person.id, { onDelete: 'set null' }),
    clientType: clientType('client_type'),
    kycStatus: kycStatus('kyc_status').notNull().default('none'),
    payoutUpiId: varchar('payout_upi_id', { length: 128 }),
    payoutBankRef: varchar('payout_bank_ref', { length: 128 }),
    respondsWithinMins: integer('responds_within_mins'),
    responseRate: real('response_rate'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /**
     * NOT unique on phone alone. A Client has one phone number; if phone were
     * globally unique he could never open a Customer account to book someone
     * else's farmhouse, and we'd learn that from a support call.
     */
    uniqueIndex('user_phone_role_idx').on(t.phone, t.role),
    index('user_person_idx').on(t.personId),
  ],
);

/**
 * Super Admin lives in its OWN table with its own auth — no self-signup, no
 * public login route. If admin were a role on `user`, one privilege-escalation
 * bug would hand over every payout control.
 */
export const adminUsers = pgTable('admin_user', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  totpSecret: text('totp_secret'),
  name: varchar('name', { length: 160 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * The caretaker. A CHILD of a Client, not a fourth role — build the primitive
 * once and it serves the caretaker now and the vendor's delivery driver in
 * Phase 3. Without it the check-in photo requirement never gets complied with,
 * and the whole dispute process rests on those photos.
 */
export const clientStaff = pgTable(
  'client_staff',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    phone: varchar('phone', { length: 15 }).notNull(),
    name: varchar('name', { length: 160 }),
    // { checkIn, capturePhotos, markReturn, confirmCash } — never earnings/pricing
    permissions: jsonb('permissions').notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('staff_client_phone_idx').on(t.clientId, t.phone)],
);

/* ==========================================================================
   GEOGRAPHY & TAXONOMY  —  these drive the SEO route tree, so they are real
   tables and never hardcoded strings.
   ========================================================================== */

export const city = pgTable('city', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 80 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  state: varchar('state', { length: 80 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
});

export const area = pgTable(
  'area',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cityId: uuid('city_id').notNull().references(() => city.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 80 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    centre: geometry('centre', { type: 'point', mode: 'xy', srid: 4326 }),
  },
  (t) => [
    uniqueIndex('area_city_slug_idx').on(t.cityId, t.slug),
    index('area_centre_idx').using('gist', t.centre),
  ],
);

export const category = pgTable('category', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 80 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  form: rentableForm('form').notNull().default('fixed'),
  defaultRentalUnit: rentalUnit('default_rental_unit').notNull().default('slot'),
  isActive: boolean('is_active').notNull().default(true),
});

/* ==========================================================================
   THE CORE OBJECT  —  `rentable`, not `properties`.
   Everything Rentra will ever rent lives here.
   ========================================================================== */

export const rentable = pgTable(
  'rentable',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id').notNull().references(() => users.id, { onDelete: 'restrict' }),

    slug: varchar('slug', { length: 140 }).notNull().unique(),
    /**
     * Short, permanent, public id used in the URL: /listing/[slug]-[code].
     * The code — not the slug — is what resolves the page, so retitling a
     * listing never breaks a link. Deliberately NOT the uuid: 36 characters
     * of noise truncates in a WhatsApp preview, which is the main discovery
     * channel, and costs click-through in search results.
     */
    publicCode: varchar('public_code', { length: 10 }).notNull().unique(),
    title: varchar('title', { length: 140 }).notNull(),
    description: text('description'),
    status: listingStatus('status').notNull().default('draft'),

    // --- the three columns ---
    form: rentableForm('form').notNull().default('fixed'),
    fulfilment: fulfilment('fulfilment').notNull().default('visit_site'),
    rentalUnit: rentalUnit('rental_unit').notNull().default('slot'),

    categoryId: uuid('category_id').notNull().references(() => category.id),
    cityId: uuid('city_id').notNull().references(() => city.id),
    areaId: uuid('area_id').notNull().references(() => area.id),

    requiresOperator: boolean('requires_operator').notNull().default(false),
    /** 1 for a farmhouse. 800 for a tent-house's chairs. */
    totalUnits: integer('total_units').notNull().default(1),

    capacity: integer('capacity').notNull().default(1),
    bedrooms: integer('bedrooms').notNull().default(0),
    highlight: varchar('highlight', { length: 60 }),
    amenities: jsonb('amenities').notNull().default([]),
    houseRules: jsonb('house_rules').notNull().default([]),
    photos: jsonb('photos').notNull().default([]),

    /** Public map shows an area circle. The exact address unlocks on confirm. */
    location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }),
    exactAddress: text('exact_address'),

    /** Farm size in the local unit guests actually use. */
    farmSize: real('farm_size'),
    farmSizeUnit: landUnit('farm_size_unit'),
    /** Pool dimensions as published locally, e.g. "15x25". */
    poolSize: varchar('pool_size', { length: 24 }),
    /** Market convention is a WINDOW, not a fixed time: "9 AM to 7 PM". */
    checkInFrom: varchar('check_in_from', { length: 32 }),
    checkOutBy: varchar('check_out_by', { length: 32 }),

    depositAmount: integer('deposit_amount').notNull().default(0), // whole rupees
    cancellationTier: cancellationTier('cancellation_tier').notNull().default('moderate'),

    // Denormalised so a listing card is one query, not N.
    ratingAvg: real('rating_avg'),
    reviewCount: integer('review_count').notNull().default(0),

    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedBy: uuid('verified_by').references(() => adminUsers.id, { onDelete: 'set null' }),
    availabilityConfirmedAt: timestamp('availability_confirmed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('rentable_city_cat_idx').on(t.cityId, t.categoryId, t.status),
    index('rentable_area_idx').on(t.areaId, t.status),
    index('rentable_client_idx').on(t.clientId),
    index('rentable_location_idx').using('gist', t.location),
  ],
);

/** Base price per slot. Weekend/weekday, in whole rupees. */
export const rentablePrice = pgTable(
  'rentable_price',
  {
    rentableId: uuid('rentable_id').notNull().references(() => rentable.id, { onDelete: 'cascade' }),
    slot: bookingSlot('slot').notNull(),
    weekday: integer('weekday').notNull(),
    weekend: integer('weekend').notNull(),
  },
  (t) => [primaryKey({ columns: [t.rentableId, t.slot] })],
);

/**
 * THE DOUBLE-BOOKING LOCK.
 *
 * Units-over-time, which degrades correctly to a calendar: a farmhouse has
 * totalUnits = 1, so "1 unit consumed" == "that slot is blocked"; chairs have
 * totalUnits = 800, so 40 consumed still leaves 760 bookable.
 *
 * The unique constraint is enforced by Postgres, not by the UI. A farmhouse
 * double-booked on a Saturday is an unrecoverable trust failure.
 */
export const availability = pgTable(
  'availability',
  {
    rentableId: uuid('rentable_id').notNull().references(() => rentable.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    slot: availabilitySlot('slot').notNull(),
    unitsAvailable: integer('units_available').notNull().default(1),
    priceOverride: integer('price_override'),
    blockedByClient: boolean('blocked_by_client').notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.rentableId, t.day, t.slot] }),
    index('availability_day_idx').on(t.day, t.slot),
  ],
);

/** Serial-numbered physical items. Movable goods only (Phase 3); empty for places. */
export const unit = pgTable(
  'unit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rentableId: uuid('rentable_id').notNull().references(() => rentable.id, { onDelete: 'cascade' }),
    serialNo: varchar('serial_no', { length: 120 }),
    conditionGrade: varchar('condition_grade', { length: 24 }),
    status: varchar('status', { length: 24 }).notNull().default('available'),
  },
  (t) => [index('unit_rentable_idx').on(t.rentableId)],
);

/* ==========================================================================
   BOOKINGS & MONEY
   ========================================================================== */

export const booking = pgTable(
  'booking',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reference: varchar('reference', { length: 16 }).notNull().unique(),
    rentableId: uuid('rentable_id').notNull().references(() => rentable.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id').notNull().references(() => users.id, { onDelete: 'restrict' }),

    day: date('day').notNull(),
    slot: bookingSlot('slot').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    unitsBooked: integer('units_booked').notNull().default(1),
    guests: integer('guests').notNull().default(1),

    // All amounts in whole rupees. See lib/domain/pricing.js for the rules.
    amountRent: integer('amount_rent').notNull(),
    amountFee: integer('amount_fee').notNull(),
    amountDeposit: integer('amount_deposit').notNull().default(0),
    /** Advance = slice of rent + the WHOLE platform fee, so revenue is safe. */
    amountAdvancePaid: integer('amount_advance_paid').notNull().default(0),
    balanceMode: balanceMode('balance_mode').notNull().default('online_before'),
    balanceSettledAt: timestamp('balance_settled_at', { withTimezone: true }),

    state: bookingState('state').notNull().default('requested'),
    checkInCode: varchar('check_in_code', { length: 8 }),
    contactPhone: varchar('contact_phone', { length: 15 }),
    note: text('note'),

    /** Accept within the window or it auto-expires and auto-refunds in full. */
    acceptDeadline: timestamp('accept_deadline', { withTimezone: true }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelledBy: userRole('cancelled_by'),
    cancellationReason: text('cancellation_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('booking_rentable_day_idx').on(t.rentableId, t.day),
    index('booking_customer_idx').on(t.customerId, t.state),
    index('booking_state_deadline_idx').on(t.state, t.acceptDeadline),
  ],
);

/**
 * Tax fields exist from the FIRST payout, even at zero.
 * TDS u/s 194-O applies from the first commercial payout, not from a turnover
 * threshold, and retrofitting deduction + certificates + quarterly returns
 * onto a live payout pipeline is genuinely painful. Confirm rates with a CA.
 */
export const payout = pgTable(
  'payout',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id').notNull().references(() => booking.id, { onDelete: 'restrict' }),
    clientId: uuid('client_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    gross: integer('gross').notNull(),
    commission: integer('commission').notNull(),
    tds194o: integer('tds_194o').notNull().default(0),
    gstTcs: integer('gst_tcs').notNull().default(0),
    net: integer('net').notNull(),
    status: payoutStatus('status').notNull().default('pending'),
    utr: varchar('utr', { length: 64 }),
    settledAt: timestamp('settled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('payout_client_status_idx').on(t.clientId, t.status)],
);

/** Two-way, released only when both sides submit or after 14 days. */
export const review = pgTable(
  'review',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id').notNull().references(() => booking.id, { onDelete: 'cascade' }),
    rentableId: uuid('rentable_id').references(() => rentable.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    authorRole: userRole('author_role').notNull(),
    rating: integer('rating').notNull(),
    cleanliness: integer('cleanliness'),
    accuracy: integer('accuracy'),
    valueForMoney: integer('value_for_money'),
    behaviour: integer('behaviour'),
    body: text('body'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('review_booking_author_idx').on(t.bookingId, t.authorId)],
);

/**
 * 301 map from day one, so a changed area or listing slug never 404s.
 * Cheap now; essential the first time someone renames a listing.
 */
export const redirect = pgTable('redirect', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromPath: varchar('from_path', { length: 512 }).notNull().unique(),
  toPath: varchar('to_path', { length: 512 }).notNull(),
  statusCode: integer('status_code').notNull().default(301),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
