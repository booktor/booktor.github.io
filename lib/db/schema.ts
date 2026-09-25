import {
  bigserial,
  boolean,
  date,
  integer,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: createdAt(),
})

export const books = pgTable('books', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  author: text('author'),
  description: text('description'),
  coverUrl: text('cover_url'),
  fileUrl: text('file_url').notNull(),
  categoryId: integer('category_id'),
  tags: text('tags').array().notNull().default([]),
  pageCount: integer('page_count'),
  status: text('status').notNull().default('completo'),
  editionNote: text('edition_note'),
  published: boolean('published').notNull().default(true),
  featured: boolean('featured').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  publishedAt: date('published_at', { mode: 'string' }),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  email: text('email'),
  displayName: text('display_name').notNull().default('Leitor'),
  username: text('username').unique(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  role: text('role').notNull().default('reader'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
})

export const readingProgress = pgTable(
  'reading_progress',
  {
    userId: text('user_id').notNull(),
    bookId: integer('book_id').notNull(),
    currentPage: integer('current_page').notNull().default(1),
    totalPages: integer('total_pages'),
    percent: real('percent').notNull().default(0),
    completed: boolean('completed').notNull().default(false),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.bookId] })],
)

export const favorites = pgTable(
  'favorites',
  {
    userId: text('user_id').notNull(),
    bookId: integer('book_id').notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.bookId] })],
)

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  bookId: integer('book_id').notNull(),
  userId: text('user_id').notNull(),
  content: text('content').notNull(),
  status: text('status').notNull().default('visible'),
  createdAt: createdAt(),
})

export const messages = pgTable('messages', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  conversationId: text('conversation_id').notNull(),
  senderId: text('sender_id').notNull(),
  recipientId: text('recipient_id'),
  content: text('content').notNull(),
  createdAt: createdAt(),
  readAt: timestamp('read_at', { withTimezone: true }),
})
