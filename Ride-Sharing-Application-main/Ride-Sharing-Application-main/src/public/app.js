// Global application state for live browser simulator
let activeRideId = null;
let riderToken = null;
let driverToken = null;
let adminToken = null;
let socket = null;
let trendChartInstance = null;
let earningsChartInstance = null;

// UI Tabs
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');

    if (tabId === 'analytics') {
      loadAnalyticsData();
    }
  });
});

function appendLog(message, type = 'info') {
  const container = document.getElementById('liveLogs');
  if (!container) return;
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.textContent = `[${time}] ${message}`;
  container.appendChild(line);
  container.scrollTop = container.scrollHeight;
}

// Initialize tokens and Socket
async function initSession() {
  try {
    // Authenticate demo rider
    const riderRes = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aarav@rideshare.com', password: 'password123' })
    });
    const riderData = await riderRes.json();
    if (riderData.success) {
      riderToken = riderData.token;
      appendLog('Authenticated demo rider: Aarav Mehta', 'success');
    }

    // Authenticate demo driver
    const driverRes = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rajesh@rideshare.com', password: 'password123' })
    });
    const driverData = await driverRes.json();
    if (driverData.success) {
      driverToken = driverData.token;
      appendLog('Authenticated demo driver: Rajesh Kumar', 'success');
    }

    // Authenticate admin for analytics
    const adminRes = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@rideshare.com', password: 'password123' })
    });
    const adminData = await adminRes.json();
    if (adminData.success) {
      adminToken = adminData.token;
    }

    // Connect WebSocket
    connectSocket(riderData.user ? riderData.user.id : 1);
  } catch (err) {
    appendLog('Session init notice: Database seed pending or server starting', 'warn');
  }
}

function connectSocket(userId) {
  try {
    socket = io();

    socket.on('connect', () => {
      const badge = document.getElementById('socketStatus');
      badge.className = 'socket-badge connected';
      badge.innerHTML = '<i class="fa-solid fa-circle"></i> <span>Socket: Connected</span>';
      appendLog(`WebSocket connected (Socket ID: ${socket.id})`, 'success');

      // Join rider personal room
      socket.emit('join', { userId, role: 'rider' });
    });

    socket.on('disconnect', () => {
      const badge = document.getElementById('socketStatus');
      badge.className = 'socket-badge disconnected';
      badge.innerHTML = '<i class="fa-solid fa-circle"></i> <span>Socket: Disconnected</span>';
      appendLog('WebSocket disconnected', 'error');
    });

    // Listen for ride events
    socket.on('ride:accepted', (data) => {
      appendLog(`[Socket Event] Driver ${data.driver.name} accepted your ride #${data.ride.id}!`, 'success');
      document.getElementById('currentStatusBadge').className = 'status-pill accepted';
      document.getElementById('currentStatusBadge').textContent = 'ACCEPTED';
      document.getElementById('activeTripDriver').textContent = `${data.driver.name} (${data.driver.vehicleModel} - ${data.driver.vehiclePlate}) ★ ${data.driver.rating}`;
    });

    socket.on('ride:status_changed', (data) => {
      appendLog(`[Socket Event] Ride #${data.rideId} status changed to ${data.status.toUpperCase()}`, 'info');
      const badge = document.getElementById('currentStatusBadge');
      badge.className = `status-pill ${data.status}`;
      badge.textContent = data.status.toUpperCase();

      if (data.status === 'completed') {
        appendLog(`Trip #${data.rideId} successfully completed! Fare settled.`, 'success');
      }
    });

    socket.on('ride:driver_moved', (data) => {
      const gpsSpan = document.getElementById('driverGpsText');
      if (gpsSpan) {
        gpsSpan.textContent = `Lat ${data.lat.toFixed(4)}, Lng ${data.lng.toFixed(4)}`;
      }
    });

    socket.on('ride:cancelled', (data) => {
      appendLog(`[Socket Event] Ride #${data.rideId} was cancelled (${data.reason})`, 'error');
      document.getElementById('currentStatusBadge').className = 'status-pill idle';
      document.getElementById('currentStatusBadge').textContent = 'CANCELLED';
      document.getElementById('activeRideDetails').style.display = 'none';
      activeRideId = null;
    });
  } catch (err) {
    appendLog('WebSocket connection failed: ' + err.message, 'error');
  }
}

// 1. Get Fare Estimate
document.getElementById('btnEstimate').addEventListener('click', async () => {
  const payload = {
    pickupAddress: document.getElementById('pickupAddr').value,
    pickupLatitude: parseFloat(document.getElementById('pickupLat').value),
    pickupLongitude: parseFloat(document.getElementById('pickupLng').value),
    dropoffAddress: document.getElementById('dropoffAddr').value,
    dropoffLatitude: parseFloat(document.getElementById('dropoffLat').value),
    dropoffLongitude: parseFloat(document.getElementById('dropoffLng').value),
    rideType: document.getElementById('rideType').value
  };

  appendLog(`Calculating route estimate via Mapbox Directions API...`, 'info');

  try {
    const res = await fetch('/api/v1/rides/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      document.getElementById('estDist').textContent = `${data.route.distanceKm} km`;
      document.getElementById('estDuration').textContent = `${data.route.durationMinutes} min`;
      document.getElementById('estSurge').textContent = `${data.fareEstimate.breakdown.surgeMultiplier}x`;
      document.getElementById('estTotalFare').textContent = `₹ ${data.fareEstimate.totalFare}`;

      const surgeBox = document.getElementById('surgeNotice');
      if (data.fareEstimate.isSurgeActive) {
        surgeBox.style.display = 'block';
        surgeBox.textContent = `⚡ Dynamic Surge Active: ${data.fareEstimate.surgeReason}`;
      } else {
        surgeBox.style.display = 'none';
      }

      appendLog(`Fare calculated: ₹ ${data.fareEstimate.totalFare} (${data.route.distanceKm} km via ${data.route.routingSource})`, 'success');
    } else {
      appendLog(`Estimate error: ${data.message}`, 'error');
    }
  } catch (err) {
    appendLog('API request error: ' + err.message, 'error');
  }
});

// 2. Book Ride Now
document.getElementById('btnBook').addEventListener('click', async () => {
  if (!riderToken) {
    appendLog('Cannot book: Rider token missing. Reinitializing session...', 'warn');
    await initSession();
  }

  const payload = {
    pickupAddress: document.getElementById('pickupAddr').value,
    pickupLatitude: parseFloat(document.getElementById('pickupLat').value),
    pickupLongitude: parseFloat(document.getElementById('pickupLng').value),
    dropoffAddress: document.getElementById('dropoffAddr').value,
    dropoffLatitude: parseFloat(document.getElementById('dropoffLat').value),
    dropoffLongitude: parseFloat(document.getElementById('dropoffLng').value),
    rideType: document.getElementById('rideType').value
  };

  appendLog('Submitting ride request and executing nearest driver matching...', 'info');

  try {
    const res = await fetch('/api/v1/rides/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${riderToken}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      activeRideId = data.ride.id;
      document.getElementById('currentStatusBadge').className = 'status-pill requested';
      document.getElementById('currentStatusBadge').textContent = 'REQUESTED';

      document.getElementById('activeRideDetails').style.display = 'block';
      document.getElementById('activeTripId').textContent = data.ride.id;
      document.getElementById('activeTripRoute').textContent = `${data.ride.pickupAddress} -> ${data.ride.dropoffAddress}`;
      document.getElementById('activeTripDriver').textContent = `Matched ${data.nearbyDriversFound} nearby drivers. Awaiting acceptance...`;

      appendLog(`Ride #${data.ride.id} booked! Found ${data.nearbyDriversFound} drivers nearby within 10km radius.`, 'success');

      if (socket) {
        socket.emit('ride:watch', { rideId: data.ride.id });
      }
    } else {
      appendLog(`Booking failed: ${data.message}`, 'error');
    }
  } catch (err) {
    appendLog('Booking API error: ' + err.message, 'error');
  }
});

// Cancel active ride
document.getElementById('btnCancelActiveRide').addEventListener('click', async () => {
  if (!activeRideId) return;

  try {
    const res = await fetch(`/api/v1/rides/${activeRideId}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${riderToken}`
      },
      body: JSON.stringify({ reason: 'Changed mind' })
    });
    const data = await res.json();
    if (data.success) {
      appendLog(`Ride #${activeRideId} cancelled by rider.`, 'warn');
    }
  } catch (err) {
    appendLog('Cancellation error: ' + err.message, 'error');
  }
});

// Driver actions
document.getElementById('btnToggleOnline').addEventListener('click', async () => {
  if (!driverToken) return;
  try {
    const res = await fetch('/api/v1/drivers/availability', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    const data = await res.json();
    if (data.success) {
      const badge = document.getElementById('driverStatusBadge');
      badge.className = `status-pill ${data.isAvailable ? 'online' : 'idle'}`;
      badge.textContent = data.isAvailable ? 'ONLINE' : 'OFFLINE';
      appendLog(data.message, 'info');
    }
  } catch (err) {
    appendLog('Error toggling status: ' + err.message, 'error');
  }
});

document.getElementById('btnUpdateLocation').addEventListener('click', async () => {
  if (!driverToken) return;
  const lat = parseFloat(document.getElementById('driverLat').value);
  const lng = parseFloat(document.getElementById('driverLng').value);

  try {
    const res = await fetch('/api/v1/drivers/location', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`
      },
      body: JSON.stringify({ latitude: lat, longitude: lng })
    });
    const data = await res.json();
    if (data.success) {
      appendLog(`Driver GPS location updated to (${lat}, ${lng})`, 'info');
    }
  } catch (err) {
    appendLog('Location update error: ' + err.message, 'error');
  }
});

// Driver accept
document.getElementById('btnDriverAccept').addEventListener('click', async () => {
  if (!activeRideId || !driverToken) {
    appendLog('No active ride requested to accept.', 'warn');
    return;
  }
  try {
    const res = await fetch(`/api/v1/rides/${activeRideId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    const data = await res.json();
    if (data.success) {
      appendLog(`Driver accepted ride #${activeRideId}`, 'success');
    } else {
      appendLog(data.message, 'error');
    }
  } catch (err) {
    appendLog('Accept error: ' + err.message, 'error');
  }
});

// Driver arrived
document.getElementById('btnDriverArrived').addEventListener('click', async () => {
  if (!activeRideId || !driverToken) return;
  updateRideProgression('arrived');
});

// Driver start
document.getElementById('btnDriverStart').addEventListener('click', async () => {
  if (!activeRideId || !driverToken) return;
  updateRideProgression('in_progress');
});

// Driver complete
document.getElementById('btnDriverComplete').addEventListener('click', async () => {
  if (!activeRideId || !driverToken) return;
  updateRideProgression('completed');
});

async function updateRideProgression(status) {
  try {
    const res = await fetch(`/api/v1/rides/${activeRideId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`
      },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      appendLog(`Ride status progressed to: ${status.toUpperCase()}`, 'success');
    } else {
      appendLog(data.message, 'error');
    }
  } catch (err) {
    appendLog('Status update error: ' + err.message, 'error');
  }
}

// Analytics Charts
async function loadAnalyticsData() {
  if (!adminToken) return;

  try {
    // 1. Fetch trends
    const trendsRes = await fetch('/api/v1/analytics/trends', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const trendsData = await trendsRes.json();

    if (trendsData.success) {
      const ctx = document.getElementById('trendChart').getContext('2d');
      if (trendChartInstance) trendChartInstance.destroy();

      trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: trendsData.chart,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } }
        }
      });
    }

    // 2. Fetch earnings
    const earningsRes = await fetch('/api/v1/analytics/earnings', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const earningsData = await earningsRes.json();

    if (earningsData.success) {
      const ctx2 = document.getElementById('earningsChart').getContext('2d');
      if (earningsChartInstance) earningsChartInstance.destroy();

      earningsChartInstance = new Chart(ctx2, {
        type: 'bar',
        data: earningsData.chart,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } }
        }
      });
    }
  } catch (err) {
    console.error('Analytics load error:', err);
  }
}

// Export actions
document.getElementById('btnDownloadCSV').addEventListener('click', () => {
  if (!riderToken && !adminToken) return;
  window.open(`/api/v1/export/rides/csv?token=${riderToken || adminToken}`, '_blank');
  // Alternatively trigger fetch with auth
  triggerDownload('/api/v1/export/rides/csv', 'ride_history.csv');
});

document.getElementById('btnDownloadPDF').addEventListener('click', () => {
  if (!riderToken && !adminToken) return;
  triggerDownload('/api/v1/export/rides/pdf', 'ride_statement.pdf');
});

async function triggerDownload(url, defaultFilename) {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${adminToken || riderToken}` }
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.message || 'Download failed');
      return;
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    alert('Export error: ' + err.message);
  }
}

// On startup
window.addEventListener('DOMContentLoaded', () => {
  initSession();
});
