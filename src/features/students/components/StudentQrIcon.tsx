const paths = {
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z',
  clock: 'M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  check: 'm5 12 4 4L19 6',
  error: 'm9 9 6 6m0-6-6 6M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  refresh: 'M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 14 6M4 12a8 8 0 0 0 14 6',
  qr: 'M3 3h6v6H3V3Zm12 0h6v6h-6V3ZM3 15h6v6H3v-6Zm12 0h2v2h-2v-2Zm6-2v4m-8 4h4m4-2v2',
  info: 'M12 11v6m0-10v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
} as const

export function StudentQrIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  )
}
