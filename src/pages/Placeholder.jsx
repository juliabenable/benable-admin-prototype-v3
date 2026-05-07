export default function Placeholder({ title }) {
  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>{title}</h1>
      <p className="muted" style={{ fontSize: 13 }}>—</p>
    </div>
  );
}
