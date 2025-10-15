import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({ width = "100%", height = 16, circle = false, style }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: circle ? "50%" : 4,
        background: "linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-loading 1.4s ease infinite",
        ...style,
      }}
    />
  );
};

export default Skeleton;

// Animation keyframes
const styleTag = document.createElement("style");
styleTag.textContent = `
@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}`;
document.head.appendChild(styleTag);
