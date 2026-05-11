const BASE_URL = 'http://localhost:5000/api';

// Helper to get token from localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('tf_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const handleResponse = async (response: Response) => {
  if (response.status === 401) {
    localStorage.removeItem('tf_token');
    localStorage.removeItem('tf_user');
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }
  return response;
};

export const loginUser = async (employeeId: string, password: string) => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, password })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Login failed');
  }
  return response.json();
};

export const fetchEmployees = async () => {
  const response = await fetch(`${BASE_URL}/employees`, {
    headers: getAuthHeaders()
  });
  await handleResponse(response);
  return response.json();
};

export const fetchEmployeeById = async (id: string) => {
  const response = await fetch(`${BASE_URL}/employees/${id}`, {
    headers: getAuthHeaders()
  });
  await handleResponse(response);
  if (!response.ok) throw new Error('Failed to fetch employee intelligence');
  return response.json();
};

export const createEmployee = async (employeeData: any) => {
  const response = await fetch(`${BASE_URL}/employees`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(employeeData)
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create employee');
  }
  return response.json();
};

export const deleteEmployee = async (id: string) => {
  const response = await fetch(`${BASE_URL}/employees/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to delete employee');
  return response.json();
};

export const updateEmployee = async (id: string, employeeData: any) => {
  const response = await fetch(`${BASE_URL}/employees/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(employeeData)
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update employee');
  }
  return response.json();
};

export const fetchStats = async () => {
  const response = await fetch(`${BASE_URL}/stats`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
};

export const clockIn = async (employeeId: string, latitude: number, longitude: number, biometricProof?: string) => {
  const response = await fetch(`${BASE_URL}/attendance/clock-in/${employeeId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ latitude, longitude, biometricProof })
  });
  await handleResponse(response);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to clock in');
  }
  return response.json();
};

export const fetchTodayLogs = async (employeeId: string) => {
  const response = await fetch(`${BASE_URL}/attendance/today/${employeeId}`, {
    headers: getAuthHeaders()
  });
  await handleResponse(response);
  if (!response.ok) throw new Error('Failed to fetch logs');
  return response.json();
};

export const clockOut = async (employeeId: string, latitude?: number, longitude?: number) => {
  const response = await fetch(`${BASE_URL}/attendance/clock-out/${employeeId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ latitude, longitude })
  });
  await handleResponse(response);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to clock out');
  }
  return response.json();
};

export const startBreak = async (employeeId: string) => {
  const response = await fetch(`${BASE_URL}/attendance/break-start/${employeeId}`, { 
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to start break');
  return response.json();
};

export const endBreak = async (employeeId: string) => {
  const response = await fetch(`${BASE_URL}/attendance/break-end/${employeeId}`, { 
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to end break');
  return response.json();
};

export const fetchSites = async () => {
  const response = await fetch(`${BASE_URL}/sites`, {
    headers: getAuthHeaders()
  });
  await handleResponse(response);
  if (!response.ok) throw new Error('Failed to fetch sites');
  return response.json();
};

export const updateSiteCoordinates = async (siteId: string, latitude: number, longitude: number) => {
  const response = await fetch(`${BASE_URL}/sites/${siteId}/coordinates`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ latitude, longitude })
  });
  if (!response.ok) throw new Error('Failed to update site coordinates');
  return response.json();
};

export const fetchLiveTracking = async () => {
  const response = await fetch(`${BASE_URL}/tracking/live`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch tracking data');
  return response.json();
};

export const fetchPayroll = async () => {
  const response = await fetch(`${BASE_URL}/payroll`, {
    headers: getAuthHeaders()
  });
  await handleResponse(response);
  if (!response.ok) throw new Error('Failed to fetch payroll data');
  return response.json();
};

export const updateAttendanceStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
  const response = await fetch(`${BASE_URL}/attendance/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  });
  await handleResponse(response);
  if (!response.ok) throw new Error('Failed to update status');
  return response.json();
};

export const processPayroll = async () => {
  const response = await fetch(`${BASE_URL}/payroll/process`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to process payroll');
  return response.json();
};

export const fetchSecurityAlerts = async () => {
  const response = await fetch(`${BASE_URL}/security/alerts`, {
    headers: getAuthHeaders()
  });
  await handleResponse(response);
  if (!response.ok) throw new Error('Failed to fetch security alerts');
  return response.json();
};

export const createSite = async (siteData: any) => {
  const response = await fetch(`${BASE_URL}/sites`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(siteData)
  });
  if (!response.ok) throw new Error('Failed to create site');
  return response.json();
};

export const fetchAllLogs = async () => {
  const response = await fetch(`${BASE_URL}/attendance/all`, {
    headers: getAuthHeaders()
  });
  await handleResponse(response);
  if (!response.ok) throw new Error('Failed to fetch all logs');
  return response.json();
};
export const enrollBiometric = async (id: string, faceDescriptor: number[]) => {
  const response = await fetch(`${BASE_URL}/employees/${id}/enroll`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ faceDescriptor })
  });
  await handleResponse(response);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to enroll');
  }
  return response.json();
};
export const fetchPayrollStats = async () => {
  const response = await fetch(`${BASE_URL}/payroll/stats`, {
    headers: getAuthHeaders()
  });
  await handleResponse(response);
  if (!response.ok) throw new Error('Failed to fetch payroll stats');
  return response.json();
};

export const fetchConfig = async () => {
  const response = await fetch(`${BASE_URL}/config`, {
    headers: getAuthHeaders()
  });
  await handleResponse(response);
  return response.json();
};

export const updateConfig = async (configData: any) => {
  const response = await fetch(`${BASE_URL}/config`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(configData)
  });
  await handleResponse(response);
  return response.json();
};

export const createSecurityAlert = async (alertData: any) => {
  const response = await fetch(`${BASE_URL}/security/alerts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(alertData)
  });
  if (!response.ok) throw new Error('Failed to create security alert');
  return response.json();
};

export const deleteSite = async (siteId: string) => {
  const response = await fetch(`${BASE_URL}/sites/${siteId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to delete hub');
  return response.json();
};

export const updateSite = async (siteId: string, siteData: any) => {
  const response = await fetch(`${BASE_URL}/sites/${siteId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(siteData)
  });
  if (!response.ok) throw new Error('Failed to update hub configuration');
  return response.json();
};

export const logManualAttendance = async (data: any) => {
  const response = await fetch(`${BASE_URL}/attendance/manual`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  await handleResponse(response);
  return response.json();
};

export const deleteAttendance = async (id: string) => {
  const response = await fetch(`${BASE_URL}/attendance/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to purge log');
  return response.json();
};
