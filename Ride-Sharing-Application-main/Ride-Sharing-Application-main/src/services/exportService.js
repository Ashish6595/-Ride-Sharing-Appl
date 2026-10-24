const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

/**
 * Service to export ride records dynamically into CSV or PDF formats.
 */
class ExportService {
  /**
   * Convert list of rides into formatted CSV string.
   *
   * @param {Array} rides
   * @returns {string} CSV content
   */
  generateCSV(rides) {
    const fields = [
      { label: 'Ride ID', value: 'id' },
      { label: 'Date', value: (row) => new Date(row.requestedAt || row.createdAt).toLocaleString() },
      { label: 'Status', value: 'status' },
      { label: 'Ride Type', value: 'rideType' },
      { label: 'Rider Name', value: 'rider.name' },
      { label: 'Rider Phone', value: 'rider.phone' },
      { label: 'Driver Name', value: (row) => (row.driver ? row.driver.name : 'Unassigned') },
      { label: 'Pickup Location', value: 'pickupAddress' },
      { label: 'Dropoff Location', value: 'dropoffAddress' },
      { label: 'Distance (KM)', value: 'distanceKm' },
      { label: 'Duration (Min)', value: 'durationMinutes' },
      { label: 'Surge Multiplier', value: 'surgeMultiplier' },
      { label: 'Total Fare (INR)', value: 'totalFare' },
      { label: 'Payment Status', value: 'paymentStatus' },
      { label: 'Payment Method', value: 'paymentMethod' }
    ];

    const json2csvParser = new Parser({ fields });
    return json2csvParser.parse(rides);
  }

  /**
   * Stream a formatted PDF ride statement into response.
   *
   * @param {Array} rides
   * @param {Object} user
   * @param {Object} res Express response object
   */
  generatePDF(rides, user, res) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Pipe PDF to HTTP response stream
    doc.pipe(res);

    // Document Header
    doc
      .fillColor('#1E293B')
      .fontSize(20)
      .text('Ride-Sharing Application', { align: 'left' })
      .fontSize(10)
      .fillColor('#64748B')
      .text('Official Account Trip History & Expense Statement', { align: 'left' });

    doc.moveDown(0.5);
    doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(1);

    // User Information Card
    const startY = doc.y;
    doc
      .fontSize(11)
      .fillColor('#0F172A')
      .text(`Account Holder: ${user.name}`, 40, startY)
      .text(`Role: ${user.role.toUpperCase()}`, 40, startY + 16)
      .text(`Email: ${user.email}`, 40, startY + 32)
      .text(`Generated On: ${new Date().toLocaleString()}`, 300, startY)
      .text(`Total Records: ${rides.length}`, 300, startY + 16);

    doc.moveDown(3);

    // Summary Statistics
    const totalDistance = rides.reduce((sum, r) => sum + (r.distanceKm || 0), 0);
    const totalFare = rides.reduce((sum, r) => sum + (r.totalFare || 0), 0);
    const completedRides = rides.filter((r) => r.status === 'completed').length;

    doc
      .rect(40, doc.y, 515, 45)
      .fillAndStroke('#F8FAFC', '#E2E8F0');

    const summaryY = doc.y + 12;
    doc
      .fontSize(10)
      .fillColor('#475569')
      .text(`Completed Trips: ${completedRides}`, 55, summaryY)
      .text(`Total Distance: ${totalDistance.toFixed(1)} km`, 220, summaryY)
      .text(`Total Fare: INR ${totalFare.toFixed(2)}`, 380, summaryY);

    doc.y = summaryY + 45;
    doc.moveDown(1);

    // Table Header
    doc
      .fontSize(12)
      .fillColor('#0F172A')
      .text('Detailed Ride Records', 40, doc.y);
    doc.moveDown(0.5);

    const tableTop = doc.y;
    doc.rect(40, tableTop, 515, 22).fill('#0284C7');

    doc
      .fontSize(9)
      .fillColor('#FFFFFF')
      .text('ID', 45, tableTop + 6, { width: 30 })
      .text('Date', 75, tableTop + 6, { width: 75 })
      .text('Pickup -> Destination', 150, tableTop + 6, { width: 190 })
      .text('Dist', 345, tableTop + 6, { width: 40 })
      .text('Status', 390, tableTop + 6, { width: 60 })
      .text('Fare (INR)', 460, tableTop + 6, { width: 85, align: 'right' });

    let currentY = tableTop + 24;

    // Render Table Rows
    rides.forEach((ride, idx) => {
      // Auto-pagination if row reaches bottom
      if (currentY > 740) {
        doc.addPage();
        currentY = 40;
      }

      const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F1F5F9';
      doc.rect(40, currentY, 515, 24).fill(rowBg);

      const rideDate = new Date(ride.requestedAt || ride.createdAt).toLocaleDateString();
      const routeText = `${ride.pickupAddress.substring(0, 18)}... -> ${ride.dropoffAddress.substring(0, 18)}...`;

      doc
        .fontSize(8)
        .fillColor('#1E293B')
        .text(`#${ride.id}`, 45, currentY + 7, { width: 30 })
        .text(rideDate, 75, currentY + 7, { width: 75 })
        .text(routeText, 150, currentY + 7, { width: 190 })
        .text(`${ride.distanceKm} km`, 345, currentY + 7, { width: 40 })
        .text(ride.status.toUpperCase(), 390, currentY + 7, { width: 60 })
        .text(`INR ${ride.totalFare.toFixed(2)}`, 460, currentY + 7, { width: 85, align: 'right' });

      currentY += 25;
    });

    // Footer
    doc
      .fontSize(8)
      .fillColor('#94A3B8')
      .text('This is an automatically generated system statement from the Ride-Sharing Application.', 40, 780, {
        align: 'center',
        width: 515
      });

    doc.end();
  }
}

module.exports = new ExportService();
