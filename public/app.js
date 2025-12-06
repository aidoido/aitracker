// public/app.js

const API_BASE = ''; // same origin

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchRequests() {
  const res = await fetch(`${API_BASE}/api/requests`);
  if (!res.ok) {
    console.error('Failed to fetch requests');
    return [];
  }
  return res.json();
}

async function render() {
  const requests = await fetchRequests();
  const tbody = document.getElementById('requestsBody');
  tbody.innerHTML = '';

  const today = todayISO();
  let todayCount = 0;
  let openCount = 0;

  requests.forEach(req => {
    if (req.request_date === today) todayCount++;
    if ((req.status || '').toLowerCase() === 'open') openCount++;

    const tr = document.createElement('tr');

    const tdDate = document.createElement('td');
    tdDate.textContent = req.request_date;

    const tdReq = document.createElement('td');
    tdReq.textContent = req.requester;

    const tdChannel = document.createElement('td');
    tdChannel.textContent = req.channel;

    const tdDesc = document.createElement('td');
    tdDesc.textContent = req.description;

    const tdStatus = document.createElement('td');
    const span = document.createElement('span');
    span.textContent = req.status;
    span.classList.add('badge');
    span.classList.add(
      (req.status || '').toLowerCase() === 'open'
        ? 'badge-open'
        : 'badge-closed'
    );
    tdStatus.appendChild(span);

    tr.appendChild(tdDate);
    tr.appendChild(tdReq);
    tr.appendChild(tdChannel);
    tr.appendChild(tdDesc);
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  });

  document.getElementById('todayCount').textContent = todayCount;
  document.getElementById('totalCount').textContent = requests.length;
  document.getElementById('openCount').textContent = openCount;
}

async function submitForm(event) {
  event.preventDefault();

  const requester = document.getElementById('requester').value.trim();
  const channel = document.getElementById('channel').value;
  const date = document.getElementById('date').value || todayISO();
  const status = document.getElementById('status').value;
  const description = document.getElementById('description').value.trim();

  if (!requester) {
    alert('Requester name is required');
    return;
  }

  await fetch(`${API_BASE}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requester,
      channel,
      description,
      status,
      request_date: date
    })
  });

  document.getElementById('requester').value = '';
  document.getElementById('description').value = '';
  document.getElementById('date').value = todayISO();
  document.getElementById('status').value = 'Open';
  document.getElementById('channel').value = 'Teams Chat';

  await render();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('date').value = todayISO();
  document.getElementById('requestForm').addEventListener('submit', submitForm);
  render();
});