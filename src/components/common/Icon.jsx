const icons = {
  home: "M3 11.5 12 4l9 7.5M5.5 10v9h13v-9M9 19v-5h6v5",
  compass: "m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3Z",
  clock: "M12 7v5l3.5 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  heart: "M20.8 8.7c0 5.2-8.8 10.3-8.8 10.3S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.5a4.7 4.7 0 0 1 8.8 2.2Z",
  chart: "M4 19V9m5 10V5m6 14v-7m5 7V3",
  upload: "M12 16V4m0 0L7 9m5-5 5 5M4 16v3h16v-3",
  settings: "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm7.5-3.2c0-.5-.1-1-.2-1.4l2-1.5-2-3.4-2.3 1a7.9 7.9 0 0 0-2.4-1.4L14.3 3h-4.1l-.3 2.3a8 8 0 0 0-2.4 1.4l-2.3-1-2 3.4 2 1.5A7.4 7.4 0 0 0 5 12c0 .5.1 1 .2 1.4l-2 1.5 2 3.4 2.3-1a7.9 7.9 0 0 0 2.4 1.4l.3 2.3h4.1l.3-2.3a8 8 0 0 0 2.4-1.4l2.3 1 2-3.4-2-1.5c.1-.4.2-.9.2-1.4Z",
  search: "m20 20-4.3-4.3M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  plus: "M12 5v14M5 12h14",
  play: "m9 6 9 6-9 6V6Z",
  chevron: "m9 18 6-6-6-6",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  close: "M6 6l12 12M18 6 6 18",
  send: "m4 4 16 8-16 8 3-8-3-8Zm3 8h6",
  more: "M5 12h.01M12 12h.01M19 12h.01",
};

export default function Icon({ name, size = 18, strokeWidth = 1.8 }) {
  return (
    <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d={icons[name] || icons.more} />
    </svg>
  );
}
