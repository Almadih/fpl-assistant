function formatCountdown(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const totalMins = Math.floor(totalSecs / 60);
  const totalHours = Math.floor(totalMins / 60);
  const days = Math.floor(totalHours / 24);

  const hours = totalHours % 24;
  const mins = totalMins % 60;

  if (days > 0) {
    return `*${days} days, ${hours} hours, and ${mins} minutes*`;
  }
  if (hours > 0) {
    return `*${hours} hours and ${mins} minutes*`;
  }
  return `*${mins} minutes*`;
}

function getStatusLabel(status) {
  switch (status) {
    case 'i': return 'Injured 🔴';
    case 'd': return 'Doubtful 🟡';
    case 's': return 'Suspended 🔴';
    case 'n': return 'Not Available 🔴';
    case 'a': return 'Available 🟢';
    default: return 'Unknown';
  }
}

module.exports = {
  formatCountdown,
  getStatusLabel
};
