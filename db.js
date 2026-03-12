const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    port:3306,
    user: 'root',      // your MySQL username
    password: '',      // your MySQL password
    database: 'food_delivery'
});

db.connect((err) => {
    if (err) {
        console.log('Database connection failed ❌');
    } else {
        console.log('MySQL connected ✅');
    }
});

module.exports = db;
