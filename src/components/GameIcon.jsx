import React, { useMemo } from "react";
import { getIconUrl } from "../rendering/icons";

/**
 * Renders a hand-drawn western/pirate icon.
 * Falls back to children (usually an emoji) if the icon name isn't found.
 *
 *  <GameIcon name="dynamite" size={24} />
 *  <GameIcon name="gunpowder" size={18} style={{ marginRight: 4 }} />
 */
export default function GameIcon({ name, size = 20, style, className, children, title }) {
  const url = useMemo(() => getIconUrl(name, Math.round(size * (window.devicePixelRatio || 1))), [name, size]);

  if (!url) return children || null;

  return (
    <img
      src={url}
      width={size}
      height={size}
      alt={name}
      title={title}
      className={className}
      draggable={false}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        imageRendering: "auto",
        ...style,
      }}
    />
  );
}
