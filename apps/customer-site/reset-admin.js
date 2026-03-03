const bcrypt = require('bcryptjs');
const fs = require('fs');

async function generateHash() {
    const password = 'admin';
    const hash = await bcrypt.hash(password, 12);
    const sql = `UPDATE admin_users SET password_hash = '${hash}' WHERE username = 'admin';`;
    fs.writeFileSync('reset.sql', sql);
    console.log('SQL written to reset.sql');
}

generateHash();
