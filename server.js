const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db'); 
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Session Fix: हे बदल केले आहेत
app.use(session({
    secret: 'food-delivery-secret',
    resave: true,
    saveUninitialized: true,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000,
        secure: false,
        httpOnly: true 
    }
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.use(express.static('public'));
app.use('/images', express.static('public/public/images'));

// लॉगिन API
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // ✅ अ‍ॅडमिन चेक (Hardcoded Logic)
    if (email === 'admin@gmail.com' && password === 'admin123') {
        req.session.user = { id: 0, name: 'Admin', role: 'admin' };
        return req.session.save(() => {
            res.json({ success: true, isAdmin: true }); 
        });
    }

    // सामान्य युजरसाठी डेटाबेस चेक
    db.query('SELECT * FROM users WHERE email=? AND password=?', [email, password], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "DB Error" });
        if (rows.length > 0) {
            req.session.user = { id: rows[0].user_id, name: rows[0].name, role: 'user' };
            req.session.save(() => {
                res.json({ success: true, isAdmin: false });
            });
        } else {
            res.json({ success: false, message: "Invalid Credentials" });
        }
    });
});

// नवीन युजर रजिस्टर करण्यासाठी API
app.post('/register', (req, res) => {
    const { name, email, password } = req.body;

    // आधीच हा ईमेल वापरून कोणी रजिस्टर केले आहे का ते तपासा
    db.query('SELECT email FROM users WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: "DB Error" });

        if (results.length > 0) {
            return res.json({ success: false, message: "Email already exists!" });
        }

        // माहिती डेटाबेसमध्ये टाका
        const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
        db.query(query, [name, email, password], (err, result) => {
            if (err) {
                console.error("Register Error:", err);
                return res.status(500).json({ success: false, message: "Registration failed" });
            }
            res.json({ success: true, message: "Account created successfully!" });
        });
    });
});

// युजरच्या ऑर्डर्स मिळवण्यासाठी API
app.get('/my-orders-api', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = req.session.user.id;
    const query = 'SELECT order_id, total_amount, status, order_date FROM orders WHERE user_id = ? ORDER BY order_date DESC';

    db.query(query, [userId], (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

// ऑर्डर प्लेस API
app.post('/place-order', (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Please Login!' });

    const userId = req.session.user.id;
    const { cart, total, address, phone } = req.body;

    const orderQuery = 'INSERT INTO orders (user_id, total_amount, address, phone, status) VALUES (?, ?, ?, ?, ?)';
    db.query(orderQuery, [userId, total, address, phone, 'Pending'], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Order Insert Error" });

        const newOrderId = result.insertId;
        const values = cart.map(item => [newOrderId, item.name, item.price, item.qty, item.image || '']);
        const itemQuery = 'INSERT INTO order_items (order_id, food_name, price, qty, image) VALUES ?';
        
        db.query(itemQuery, [values], (err2) => {
            if (err2) return res.status(500).json({ success: false, message: "Items Insert Error" });
            res.json({ success: true });
        });
    });
});

app.get('/foods', (req, res) => {
    db.query("SELECT * FROM food_items WHERE status='Available'", (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

app.get('/order-details-api/:id', (req, res) => {
    const orderId = req.params.id;
    const query = 'SELECT food_name, price, qty, image FROM order_items WHERE order_id = ?';
    db.query(query, [orderId], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json(rows);
    });
});

// ✅ सर्व युजर्सच्या ऑर्डर्स अ‍ॅडमिनला दिसण्यासाठी API
app.get('/admin-all-orders', (req, res) => {
    // आपण क्वेरीमध्ये address आणि phone हे कॉलम्स वाढवले आहेत
    const query = `
        SELECT o.order_id, u.name as user_name, o.total_amount, o.status, 
               o.order_date, o.address, o.phone,
               GROUP_CONCAT(oi.food_name, ' (', oi.qty, ')') as items
        FROM orders o
        JOIN users u ON o.user_id = u.user_id
        JOIN order_items oi ON o.order_id = oi.order_id
        GROUP BY o.order_id
        ORDER BY o.order_date DESC
    `;

    db.query(query, (err, rows) => {
        if (err) {
            console.error("Admin DB Error:", err);
            return res.status(500).json([]);
        }
        res.json(rows); 
    });
});

// नवीन पदार्थ अ‍ॅड करण्यासाठी API
app.post('/add-food-api', (req, res) => {
    const { name, price, image, category } = req.body;
    
    // तुमच्या food_items टेबलमधील कॉलम्सनुसार ही क्वेरी आहे
    const query = "INSERT INTO food_items (name, price, image, status, category) VALUES (?, ?, ?, 'Available', ?)";
    
    db.query(query, [name, price, image, category], (err, result) => {
        if (err) {
            console.error("Insert Error:", err);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true });
    });
});

// १. सर्व पदार्थ अ‍ॅडमिनला दाखवण्यासाठी
app.get('/admin-get-all-food', (req, res) => {
    db.query("SELECT * FROM food_items", (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

// २. पदार्थ डिलीट करण्यासाठी
app.delete('/delete-food/:id', (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM food_items WHERE food_id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// ३. किंमत अपडेट करण्यासाठी (Edit)
app.post('/update-price', (req, res) => {
    const { id, newPrice } = req.body;
    db.query("UPDATE food_items SET price = ? WHERE food_id = ?", [newPrice, id], (err, result) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));