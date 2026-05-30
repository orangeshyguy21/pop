import type { Post } from "../types/post";

function relative(createdAt: number): string {
  const now = 1_750_000_000;
  const d = Math.max(0, now - createdAt);
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

/**
 * The real (DOM) rendering of a post. Used for the zoomed-in HtmlCard and the
 * detail modal — crisp text, selectable, real <img>, clickable links.
 */
export function PostCardContent({
  post,
  large = false,
}: {
  post: Post;
  large?: boolean;
}) {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center gap-2.5">
        {post.author.avatarUrl ? (
          <img
            src={post.author.avatarUrl}
            alt=""
            crossOrigin="anonymous"
            className="h-10 w-10 shrink-0 rounded-full bg-neutral-200 object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-500">
            {post.author.displayName[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold leading-tight text-neutral-900">
            {post.author.displayName}
          </div>
          <div className="truncate text-xs text-neutral-400">
            {post.author.nip05 ? `${post.author.nip05} · ` : ""}
            {relative(post.createdAt)}
          </div>
        </div>
      </div>

      {post.message && (
        <p
          className={
            "mt-2.5 whitespace-pre-wrap break-words text-neutral-800 " +
            (large ? "text-base" : "text-sm")
          }
        >
          {post.message}
        </p>
      )}

      {post.media && (
        <img
          src={post.media.url}
          alt=""
          crossOrigin="anonymous"
          className="mt-3 w-full rounded-[10px] object-cover"
          style={{ maxHeight: large ? 480 : 320 }}
        />
      )}

      {(post.reactions || post.zaps) && (
        <div className="mt-auto pt-2.5 text-xs text-neutral-400">
          {post.reactions ? <span className="mr-3">♥ {post.reactions}</span> : null}
          {post.zaps ? <span>⚡ {post.zaps}</span> : null}
        </div>
      )}
    </div>
  );
}
