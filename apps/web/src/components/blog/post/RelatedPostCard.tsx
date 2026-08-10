import Link from "next/link";
import Image from "next/image";
import type { PostCard } from "@/lib/api";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { formatDate } from "../formatDate";
import { buildPostHref } from "@/lib/blogPermalink";

export function RelatedPostCard({ post, dateFormat, permalinkStructure }: { post: PostCard; dateFormat?: string; permalinkStructure?: string }) {
  return (
    <Link href={buildPostHref(post, permalinkStructure || "/%postname%/")} className="group flex flex-col overflow-hidden rounded-2xl border border-ink-border bg-ink-panel transition-colors hover:border-gold/40">
      <div className="relative h-36 w-full overflow-hidden">
        {post.featuredImage ? (
          <Image src={resolveImageUrl(post.featuredImage)} alt={post.title} fill sizes="33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-ink" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h4 className="text-sm font-bold text-foreground group-hover:text-gold">{post.title}</h4>
        {post.publishedAt && <p className="text-xs text-foreground/50">{formatDate(post.publishedAt, dateFormat)}</p>}
      </div>
    </Link>
  );
}
