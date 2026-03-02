import React from 'react';

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg)(\?.*)?$/i;
const VIDEO_EXT = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;
const YOUTUBE_RE = /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const VIMEO_RE = /vimeo\.com\/(\d+)/;

/**
 * Detects the embed type for a URL.
 * Returns: { kind: 'image'|'video'|'youtube'|'vimeo', id?: string } or null
 */
export function detectMedia(url) {
  if (!url) return null;
  try { new URL(url); } catch { return null; }

  const yt = url.match(YOUTUBE_RE);
  if (yt) return { kind: 'youtube', id: yt[1] };

  const vm = url.match(VIMEO_RE);
  if (vm) return { kind: 'vimeo', id: vm[1] };

  if (IMAGE_EXT.test(url)) return { kind: 'image' };
  if (VIDEO_EXT.test(url)) return { kind: 'video' };

  return null;
}

/**
 * Extracts the first embeddable URL from a block of text.
 */
export function extractMediaUrl(text) {
  if (!text) return null;
  const matches = text.match(/https?:\/\/[^\s<>"]+/g);
  if (!matches) return null;
  for (const url of matches) {
    if (detectMedia(url)) return url;
  }
  return null;
}

/**
 * Renders a media embed for the given url/type combo.
 * type prop overrides auto-detection ('image' | 'video').
 */
function MediaEmbed({ url, type, className = '' }) {
  if (!url) return null;

  const detected = type ? { kind: type } : detectMedia(url);
  if (!detected) return null;

  const wrapClass = `media-embed ${className}`.trim();

  if (detected.kind === 'youtube') {
    return (
      <div className={`${wrapClass} media-embed-video`}>
        <iframe
          src={`https://www.youtube.com/embed/${detected.id}`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (detected.kind === 'vimeo') {
    return (
      <div className={`${wrapClass} media-embed-video`}>
        <iframe
          src={`https://player.vimeo.com/video/${detected.id}`}
          title="Vimeo video"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (detected.kind === 'image') {
    return (
      <div className={`${wrapClass} media-embed-image`}>
        <img src={url} alt="Attached media" />
      </div>
    );
  }

  if (detected.kind === 'video') {
    return (
      <div className={`${wrapClass} media-embed-video`}>
        <video controls preload="metadata">
          <source src={url} />
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  return null;
}

export default MediaEmbed;
