/**
 * Utility function to convert a skill name or identifier into a consistent filesystem-safe slug.
 * Used across installer, publisher, runner, and MCP server to ensure lockfile and storage integrity.
 */
export function toSlug(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[\/\@]/g, '-')
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .replace(/-+/g, '-');
}
