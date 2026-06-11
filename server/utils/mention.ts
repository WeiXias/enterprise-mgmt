/**
 * @mention utilities.
 *
 * Pure helpers and async resolvers for extracting, resolving, and notifying
 * mentioned users in comment content.
 */
import { and, like } from 'drizzle-orm'
import { users, notifications } from '#schema/users'
import { generateId } from '#server-utils/id'

const MENTION_REGEX = /@(\S+)/g

/**
 * Extract `@username` patterns from comment content.
 *
 * Returns a deduplicated list of usernames (the portion after '@').
 */
export function parseMentions(content: string): string[] {
  const matches = content.match(MENTION_REGEX)
  if (!matches) return []
  return [...new Set(matches.map((m) => m.slice(1)))]
}

/**
 * Query the `users` table by name and return the matching user IDs.
 *
 * Names not found in the database are silently dropped.
 */
export async function resolveMentionUserIds(
  db: ReturnType<typeof import('#database').db>,
  usernames: string[],
): Promise<string[]> {
  if (usernames.length === 0) return []

  const rows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(...usernames.map((name) => like(users.name, `%${name}%`))))

  // Only retain exact name matches to avoid false positives from LIKE
  return rows
    .filter((r: typeof rows[number]) => usernames.some((n) => r.name === n))
    .map((r: typeof rows[number]) => r.id)
}

/**
 * Insert a notification row for each mentioned user.
 *
 * `targetType` and `targetId` describe the comment's parent entity (e.g.
 * project, task), so the notification can link back to it.
 */
export async function notifyMentions(
  db: ReturnType<typeof import('#database').db>,
  userIds: string[],
  commentId: string,
  targetType: string,
  targetId: string,
): Promise<void> {
  if (userIds.length === 0) return

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  await db.insert(notifications).values(
    userIds.map((uid) => ({
      id: generateId(),
      userId: uid,
      title: '有人在评论中提到了你',
      content: '有人在评论中提到了你',
      type: 'system' as const,
      isRead: false,
      relatedId: `${commentId}::${targetType}::${targetId}`,
      relatedType: 'comment',
      createdAt: now,
    })),
  )
}
