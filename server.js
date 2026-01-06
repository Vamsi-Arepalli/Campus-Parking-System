const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Mock database
let parkingData = {
    spots: {},
    reservations: [],
    users: [],
    zones: {
        'A': { name: 'Student Parking', capacity: 80, available: 60, occupied: 15, reserved: 5 },
        'B': { name: 'Faculty Parking', capacity: 60, available: 45, occupied: 10, reserved: 5 },
        'C': { name: 'Visitor Parking', capacity: 40, available: 30, occupied: 8, reserved: 2 },
        'D': { name: 'VIP Parking', capacity: 20, available: 15, occupied: 3, reserved: 2 }
    }
};

// Initialize parking spots
function initializeParkingData() {
    const zones = ['A', 'B', 'C', 'D'];
    const zoneCapacities = { A: 80, B: 60, C: 40, D: 20 };
    
    zones.forEach(zone => {
        parkingData.spots[zone] = [];
        for (let i = 1; i <= zoneCapacities[zone]; i++) {
            const random = Math.random();
            let status = 'available';
            if (random < 0.2) status = 'occupied';
            else if (random < 0.4) status = 'reserved';
            
            parkingData.spots[zone].push({
                id: `${zone}-${i.toString().padStart(3, '0')}`,
                status: status,
                zone: zone,
                type: zone === 'A' ? 'student' : 
                      zone === 'B' ? 'faculty' : 
                      zone === 'C' ? 'visitor' : 'vip'
            });
        }
    });
    
    // Add some demo users
    parkingData.users = [
        { id: 1, username: 'vamsi_krishna', email: 'vamsi@kluniversity.in', kluId: 'KLU2023001', type: 'student' },
        { id: 2, username: 'faculty_demo', email: 'faculty@kluniversity.in', kluId: 'FAC2023001', type: 'faculty' }
    ];
}

// API Routes

// Get all parking spots for a zone
app.get('/api/parking/:zone', (req, res) => {
    const zone = req.params.zone.toUpperCase();
    if (parkingData.spots[zone]) {
        res.json(parkingData.spots[zone]);
    } else {
        res.status(404).json({ error: 'Zone not found' });
    }
});

// Get zone statistics
app.get('/api/zones', (req, res) => {
    res.json(parkingData.zones);
});

// Make a reservation
app.post('/api/reservations', (req, res) => {
    const { zone, spotId, date, startTime, endTime, userId, vehicle } = req.body;
    
    // Check if spot exists and is available
    const zoneSpots = parkingData.spots[zone];
    const spot = zoneSpots.find(s => s.id === spotId);
    
    if (!spot) {
        return res.status(404).json({ error: 'Spot not found' });
    }
    
    if (spot.status !== 'available') {
        return res.status(400).json({ error: 'Spot is not available' });
    }
    
    // Create reservation
    const reservation = {
        id: 'RES-' + Date.now(),
        userId: userId,
        zone: zone,
        spotId: spotId,
        date: date,
        startTime: startTime,
        endTime: endTime,
        vehicle: vehicle,
        status: 'reserved',
        createdAt: new Date().toISOString()
    };
    
    // Update spot status
    spot.status = 'reserved';
    
    // Add to reservations
    parkingData.reservations.push(reservation);
    
    // Update zone statistics
    parkingData.zones[zone].reserved++;
    parkingData.zones[zone].available--;
    
    res.json({ 
        success: true, 
        reservation: reservation,
        message: `Spot ${spotId} reserved successfully!`
    });
});

// Get user reservations
app.get('/api/reservations/:userId', (req, res) => {
    const userId = req.params.userId;
    const userReservations = parkingData.reservations.filter(r => r.userId === userId);
    res.json(userReservations);
});

// Cancel reservation
app.delete('/api/reservations/:reservationId', (req, res) => {
    const reservationId = req.params.reservationId;
    const index = parkingData.reservations.findIndex(r => r.id === reservationId);
    
    if (index === -1) {
        return res.status(404).json({ error: 'Reservation not found' });
    }
    
    const reservation = parkingData.reservations[index];
    
    // Update spot status
    const zoneSpots = parkingData.spots[reservation.zone];
    const spot = zoneSpots.find(s => s.id === reservation.spotId);
    if (spot) {
        spot.status = 'available';
    }
    
    // Update zone statistics
    parkingData.zones[reservation.zone].reserved--;
    parkingData.zones[reservation.zone].available++;
    
    // Remove reservation
    parkingData.reservations.splice(index, 1);
    
    res.json({ 
        success: true, 
        message: 'Reservation cancelled successfully!' 
    });
});

// User authentication
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // Demo authentication (in real app, use proper authentication)
    const user = parkingData.users.find(u => u.username === username);
    
    if (user && (password === 'demo123' || password === 'password')) {
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                kluId: user.kluId,
                type: user.type
            },
            token: 'demo-token-' + Date.now()
        });
    } else {
        res.status(401).json({ 
            success: false, 
            error: 'Invalid credentials' 
        });
    }
});

// Register new user
app.post('/api/register', (req, res) => {
    const { username, email, kluId, password, userType } = req.body;
    
    // Check if user exists
    const existingUser = parkingData.users.find(u => u.username === username || u.kluId === kluId);
    if (existingUser) {
        return res.status(400).json({ 
            success: false, 
            error: 'Username or KLU ID already exists' 
        });
    }
    
    // Create new user
    const newUser = {
        id: parkingData.users.length + 1,
        username: username,
        email: email,
        kluId: kluId,
        type: userType || 'student',
        createdAt: new Date().toISOString()
    };
    
    parkingData.users.push(newUser);
    
    res.json({
        success: true,
        user: newUser,
        message: 'Registration successful!'
    });
});

// Get parking statistics
app.get('/api/statistics', (req, res) => {
    let totalAvailable = 0;
    let totalOccupied = 0;
    let totalReserved = 0;
    let totalSpots = 0;
    
    Object.keys(parkingData.zones).forEach(zone => {
        totalAvailable += parkingData.zones[zone].available;
        totalOccupied += parkingData.zones[zone].occupied;
        totalReserved += parkingData.zones[zone].reserved;
        totalSpots += parkingData.zones[zone].capacity;
    });
    
    res.json({
        totalSpots: totalSpots,
        available: totalAvailable,
        occupied: totalOccupied,
        reserved: totalReserved,
        efficiency: Math.round(((totalSpots - totalOccupied) / totalSpots) * 100),
        todayReservations: parkingData.reservations.filter(r => {
            const today = new Date().toISOString().split('T')[0];
            return r.date === today;
        }).length
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'park.html'));
});

// Initialize data
initializeParkingData();

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Smart Parking System running at:`);
    console.log(`🌐 Local: http://localhost:${PORT}`);
    console.log(`🌐 Network: http://${getIPAddress()}:${PORT}`);
    console.log(`\n📊 API Endpoints:`);
    console.log(`   GET  /api/parking/:zone`);
    console.log(`   GET  /api/zones`);
    console.log(`   POST /api/reservations`);
    console.log(`   GET  /api/reservations/:userId`);
    console.log(`   POST /api/login`);
    console.log(`   POST /api/register`);
    console.log(`\n📱 Open your browser and navigate to: http://localhost:${PORT}`);
});

// Helper function to get IP address
function getIPAddress() {
    const interfaces = require('os').networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
}