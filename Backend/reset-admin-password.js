// This script resets the admin password to 'password123'
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const adminEmail = 'admin@wesleyhigh.edu';
const newPassword = 'password123';

async function resetPassword() {
    let connection;
    try {
        // --- Database Connection ---
        console.log('Connecting to the database...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
        console.log('Database connection successful.');

        // --- Hashing the new password ---
        console.log(`Hashing the new password: "${newPassword}"...`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        console.log('Password hashed successfully.');

        // --- Updating the database ---
        console.log(`Updating password for user: ${adminEmail}...`);
        const [result] = await connection.execute(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, adminEmail]
        );

        if (result.affectedRows > 0) {
            console.log('\nSUCCESS: Admin password has been successfully reset to "password123".');
            console.log('You may now start your main server and log in.');
        } else {
            console.error(`\nERROR: Could not find user with email "${adminEmail}". Please ensure this user exists in your 'users' table.`);
        }

    } catch (error) {
        console.error('\n--- SCRIPT FAILED ---');
        console.error('An error occurred:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('This is an "Access Denied" error. Please double-check your .env file credentials.');
        }
    } finally {
        if (connection) {
            await connection.end();
            console.log('\nDatabase connection closed.');
        }
    }
}

resetPassword();
