import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [metrics, setMetrics] = useState([]);

  // Fetch data from the FastAPI backend
  const fetchMetrics = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/metrics');
      const json = await response.json();
      if (json.status === "success") {
        setMetrics(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard metrics:", error);
    }
  };

  // Poll the backend every 3 seconds
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to color-code sentiments
  const getSentimentColor = (sentiment) => {
    switch(sentiment) {
      case 'positive': return '#4ade80'; // Green
      case 'negative': return '#f87171'; // Red
      case 'sarcastic': return '#fbbf24'; // Yellow
      default: return '#9ca3af'; // Gray
    }
  };

  return (
    <div className="dashboard-container" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
        <h1>Sentiment Intelligence Dashboard</h1>
        <p>Real-time Sociolinguistic & Sentiment Tracking</p>
      </header>

      <div className="metrics-grid">
        <h2>Live Comment Stream</h2>
        {metrics.length === 0 ? (
          <p>No comments processed yet. Waiting for webhooks...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {metrics.map((item) => (
              <div key={item.id} style={{ 
                border: '1px solid #ddd', 
                borderRadius: '8px', 
                padding: '15px',
                borderLeft: `5px solid ${getSentimentColor(item.sentiment)}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong>Platform ID: {item.platform_id}</strong>
                  <span style={{ 
                    backgroundColor: getSentimentColor(item.sentiment), 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    color: '#fff',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    fontSize: '0.8rem'
                  }}>
                    {item.sentiment} Alert
                  </span>
                </div>
                
                <p style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>"{item.original_text}"</p>
                
                <div style={{ fontSize: '0.9rem', color: '#555' }}>
                  <strong>Language Switch Metric:</strong> {item.english_ratio * 100}% English Proportion
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;