const API = import.meta.env.VITE_API_URL || '/api';

export const getToken = () => localStorage.getItem('pmoToken');

function getErrorMessage(data, status) {
  if (!data) return `Request failed (${status})`;

  if (typeof data.detail === 'string') {
    return data.detail;
  }

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item) => {
        if (typeof item === 'string') return item;
        return item?.msg || JSON.stringify(item);
      })
      .join(', ');
  }

  if (data.detail && typeof data.detail === 'object') {
    return data.detail.msg || JSON.stringify(data.detail);
  }

  if (typeof data.message === 'string') {
    return data.message;
  }

  return `Request failed (${status})`;
}

async function req(path, opts = {}) {
  const headers = {
    ...(getToken()
      ? { Authorization: `Bearer ${getToken()}` }
      : {}),
    ...(opts.headers || {}),
  };

  // Only add JSON Content-Type when the caller has not
  // explicitly supplied a Content-Type and the body is not FormData.
  if (
    !headers['Content-Type'] &&
    !(opts.body instanceof FormData) &&
    !(opts.body instanceof URLSearchParams)
  ) {
    headers['Content-Type'] = 'application/json';
  }

  const r = await fetch(API + path, {
    ...opts,
    headers,
  });

  if (!r.ok) {
    let data = null;

    try {
      data = await r.json();
    } catch {
      // Non-JSON response
    }

    throw new Error(getErrorMessage(data, r.status));
  }

  return r.status === 204 ? null : r.json();
}

export const login = (username, password) =>
  req('/auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username,
      password,
    }),
  });

export const me = () => req('/auth/me');

export const getRecords = (m) =>
  req('/records/' + encodeURIComponent(m));

export const createRecord = (m, data) =>
  req('/records/' + encodeURIComponent(m), {
    method: 'POST',
    body: JSON.stringify({
      data,
      status: 'draft',
    }),
  });

export const updateRecord = (
  m,
  id,
  data,
  status = 'draft',
  external_id = null
) =>
  req(`/records/${encodeURIComponent(m)}/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      data,
      status,
      external_id,
    }),
  });

export const deleteRecord = (m, id) =>
  req(`/records/${encodeURIComponent(m)}/${id}`, {
    method: 'DELETE',
  });

export const importWorkbook = (file) => {
  const f = new FormData();
  f.append('file', file);

  return req('/import/master-workbook', {
    method: 'POST',
    body: f,
  });
};

export const approvals = () =>
  req('/approvals?status=pending');

export const decideApproval = (
  id,
  status,
  comment = ''
) =>
  req(`/approvals/${id}/decision`, {
    method: 'POST',
    body: JSON.stringify({
      status,
      comment,
    }),
  });

export const auditLogs = () =>
  req('/audit-logs');

export const statusReport = () =>
  req('/reports/status');

export const createApproval = (
  id,
  approver_role = 'approver'
) =>
  req(`/records/${id}/approval`, {
    method: 'POST',
    body: JSON.stringify({
      approver_role,
    }),
  });

export const users = () =>
  req('/users');

export const updateUser = (id, data) =>
  req(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const createUser = (data) =>
  req('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const notifications = () =>
  req('/notifications');

export const markNotificationRead = (id) =>
  req(`/notifications/${id}/read`, {
    method: 'POST',
  });

export const schedules = () =>
  req('/report-schedules');

export const createSchedule = (data) =>
  req('/report-schedules', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const reportRuns = () =>
  req('/report-runs');

export const runSchedule = (id) =>
  req(`/report-schedules/${id}/run`, {
    method: 'POST',
  });

export const exportReport = async (fmt) => {
  const r = await fetch(
    API + `/reports/export/${fmt}`,
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    }
  );

  if (!r.ok) {
    throw new Error('Report export failed');
  }

  return r.blob();
};
