const API_BASE = '/.netlify/functions';

export const fetchLinkedInProfile = async (token: string) => {
  const response = await fetch(`${API_BASE}/linkedin-profile`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'LinkedIn-Version': '202312'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch LinkedIn profile');
  }
  
  return response.json();
};

export const fetchLinkedInChangelog = async (token: string, startTime?: number) => {
  const params = new URLSearchParams();
  params.append('count', '50'); // Get more data
  if (startTime) {
    params.append('startTime', startTime.toString());
  }
  
  const response = await fetch(
    `${API_BASE}/linkedin-changelog?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'LinkedIn-Version': '202312'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch LinkedIn changelog');
  }
  
  return response.json();
};

export const fetchLinkedInSnapshot = async (token: string, domain?: string) => {
  const params = new URLSearchParams();
  if (domain) {
    params.append('domain', domain);
  }
  
  const response = await fetch(
    `${API_BASE}/linkedin-snapshot?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'LinkedIn-Version': '202312'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch LinkedIn snapshot');
  }
  
  return response.json();
};

export const initiateLinkedInAuth = (type: 'basic' | 'dma' = 'basic') => {
  const authUrl = `${API_BASE}/linkedin-oauth-start?type=${type}`;
  console.log('Redirecting to:', authUrl);
  window.location.href = authUrl;
};