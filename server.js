const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

// Parse JSON bodies
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(__dirname));

// File path for storing orders
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// Initialize orders file if it doesn't exist
if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify([]));
}

// Get all orders
app.get('/api/orders', (req, res) => {
    try {
        if (!fs.existsSync(ORDERS_FILE)) {
            return res.json([]);
        }
        const orders = JSON.parse(fs.readFileSync(ORDERS_FILE));
        res.json(orders);
    } catch (error) {
        console.error('Error reading orders:', error);
        res.status(500).json({ error: 'Error reading orders' });
    }
});

// Save new order
app.post('/api/orders', (req, res) => {
    try {
        const orders = fs.existsSync(ORDERS_FILE) 
            ? JSON.parse(fs.readFileSync(ORDERS_FILE)) 
            : [];
        const newOrder = req.body;
        orders.push(newOrder);
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving order:', error);
        res.status(500).json({ error: 'Error saving order' });
    }
});

// Delete order
app.delete('/api/orders/:orderId', (req, res) => {
    try {
        if (!fs.existsSync(ORDERS_FILE)) {
            return res.status(404).json({ error: 'No orders found' });
        }
        const orders = JSON.parse(fs.readFileSync(ORDERS_FILE));
        const filteredOrders = orders.filter(order => order.orderId !== parseInt(req.params.orderId));
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(filteredOrders, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Error deleting order' });
    }
});

// Export orders to Excel
app.get('/api/export-excel', (req, res) => {
    try {
        if (!fs.existsSync(ORDERS_FILE)) {
            return res.status(404).json({ error: 'No orders found' });
        }

        const orders = JSON.parse(fs.readFileSync(ORDERS_FILE));
        
        if (orders.length === 0) {
            return res.status(404).json({ error: 'No orders to export' });
        }

        // Prepare data for Excel
        const excelData = orders.map(order => {
            const items = order.items.map(item => 
                `${item.name} (${item.quantity} × ${item.price} = ${item.total} Rs)`
            ).join('\n');
            
            return {
                'Order ID': order.orderId,
                'Date': order.date,
                'Items': items,
                'Total Amount': `${order.totalAmount} Rs`
            };
        });

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Set column widths
        const wscols = [
            {wch: 10}, // Order ID
            {wch: 15}, // Date
            {wch: 50}, // Items
            {wch: 15}  // Total Amount
        ];
        worksheet['!cols'] = wscols;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

        // Generate Excel file
        const excelBuffer = XLSX.write(workbook, { 
            bookType: 'xlsx', 
            type: 'buffer',
            bookSST: false
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=chai-house-orders-${new Date().toISOString().split('T')[0]}.xlsx`);

        // Send the Excel file
        res.send(excelBuffer);
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        res.status(500).json({ 
            error: 'Error exporting to Excel',
            details: error.message 
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
}); 