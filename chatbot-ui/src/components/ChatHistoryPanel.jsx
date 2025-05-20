import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../App.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ChatHistoryPanel = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/history`);
        setHistory(res.data);
      } catch (err) {
        console.error('Failed to load history:', err);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="text-sm">
      <h2 className="text-xl font-semibold mb-4">Chat History (JSON)</h2>
      <pre className="bg-indigo-200 p-3 rounded overflow-x-auto h-[530px] ">
        {JSON.stringify(history, null, 2)}
      </pre>
    </div>
  );
};

export default ChatHistoryPanel;
