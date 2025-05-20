import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../App.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const UserProfilePanel = () => {
  const [profile, setProfile] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/profile`);
        setProfile(res.data);
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    };

    fetchProfile();
  }, []);

  return ( 
    <div className="text-sm">
      <h2 className="text-xl font-semibold mb-4">User Profile</h2>
      <pre className="bg-green-200 p-3 rounded overflow-x-auto h-[530px] ">
        {JSON.stringify(profile, null, 2)}
      </pre>
    </div>
  );
};

export default UserProfilePanel;