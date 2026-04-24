export default function TestPage() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#000',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      fontSize: '20px'
    }}>
      <h1>✅ Dev Server Fresh Build Test</h1>
      <p>Timestamp: {new Date().toISOString()}</p>
      <p>If you see this, the server is serving fresh code!</p>
      <a href="/" style={{ color: '#8b5cf6', marginTop: '2rem' }}>← Back to Home</a>
    </div>
  );
}
