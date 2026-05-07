export default function Pill({ color = 'gray', children, title }) {
  return <span className={`pill ${color}`} title={title}>{children}</span>;
}
